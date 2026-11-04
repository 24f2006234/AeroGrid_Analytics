import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { OpenSkyResponse, FlightTelemetry, OpenSkyStateVector } from './types';

const app = express();
const PORT = process.env.PORT || 5000;

// Comma-separated list of allowed frontend origins, e.g. "https://aerogrid.vercel.app".
// Unset = allow all (convenient for local dev).
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : null;

app.use(cors(allowedOrigins ? { origin: allowedOrigins } : undefined));
app.use(express.json());

/**
 * OpenSky OAuth2 (client credentials). Basic auth is no longer accepted by OpenSky.
 * Tokens live ~30 min; we refresh 60s before expiry.
 */
const OPENSKY_TOKEN_URL =
    'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
let openSkyToken: string | null = null;
let openSkyTokenExpiry = 0;

const getOpenSkyToken = async (forceRefresh = false): Promise<string | null> => {
    const clientId = process.env.OPENSKY_CLIENT_ID;
    const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null; // anonymous mode

    if (!forceRefresh && openSkyToken && Date.now() < openSkyTokenExpiry - 60_000) {
        return openSkyToken;
    }

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
    });
    const { data } = await axios.post(OPENSKY_TOKEN_URL, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000
    });
    openSkyToken = data.access_token;
    openSkyTokenExpiry = Date.now() + (data.expires_in ?? 1800) * 1000;
    return openSkyToken;
};

// OpenSky bounding box coordinates (Example: covering a target airspace region)
// format: [lamin, lomin, lamax, lomax]
const AIRSPACE_BOUNDS = {
    lamin: 6.0,  // South tip of India
    lomin: 68.0, // West Gujarat
    lamax: 36.0, // North Kashmir
    lomax: 98.0  // East Arunachal Pradesh
};

/**
 * Normalizes OpenSky array metrics into aviation standard units and typed objects
 */
const normalizeFlightData = (state: OpenSkyStateVector): FlightTelemetry => {
    const speedKnots = state[9] ? Math.round(state[9] * 1.94384) : 0;
    const altitudeFeet = state[7] ? Math.round(state[7] * 3.28084) : 0;
    const verticalRate = state[11] || 0;

    // Basic business logic rules to simulate system alerts
    let status: 'ACTIVE' | 'WARNING' | 'ERROR' = 'ACTIVE';
    if (state[14] === '7700' || state[14] === '7600') {
        status = 'ERROR'; // Emergency Squawk codes
    } else if (verticalRate < -25 || altitudeFeet < 2000 && speedKnots > 250) {
        status = 'WARNING'; // Extreme descent rates or unsafe speed/alt configurations
    }

    return {
        icao24: state[0],
        callsign: state[1] ? state[1].trim() : 'UNK_FLT',
        originCountry: state[2],
        longitude: state[5] || 0,
        latitude: state[6] || 0,
        altitude: altitudeFeet,
        speed: speedKnots,
        heading: state[10] ? Math.round(state[10]) : 0,
        verticalRate,
        squawk: state[14] || '0000',
        status
    };
};

let cachedFlights: FlightTelemetry[] = [];
let lastFetchTime = 0;
// The India bounding box (30° x 30° = 900 sq°) costs 4 OpenSky credits per call.
// Standard accounts get 4,000 credits/day, so 120s TTL => max 720 calls/day = 2,880 credits.
// Anonymous users only get 400 credits/day: set OPENSKY_CACHE_TTL_MS to ~900000 (15 min) in that case.
const CACHE_TTL = Number(process.env.OPENSKY_CACHE_TTL_MS) || 120_000;

/**
 * Route: Fetches active flights within defined geographic boundaries
 */
app.get('/api/telemetry', async (_req, res) => {
    try {
        const now = Date.now();
        // Return cached data if within TTL
        if (now - lastFetchTime < CACHE_TTL && cachedFlights.length > 0) {
            console.log('Serving cached data');
            return res.json(cachedFlights);
        }

        console.log('Fetching fresh data from OpenSky');
        const url = `https://opensky-network.org/api/states/all`;

        const fetchStates = async (forceRefresh = false) => {
            const token = await getOpenSkyToken(forceRefresh);
            return axios.get<OpenSkyResponse>(url, {
                params: AIRSPACE_BOUNDS,
                timeout: 10000,
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
        };

        let response;
        try {
            response = await fetchStates();
        } catch (err) {
            // Token may have expired early: refresh once and retry
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                response = await fetchStates(true);
            } else {
                throw err;
            }
        }
        const remaining = response.headers['x-rate-limit-remaining'];
        if (remaining !== undefined) console.log(`OpenSky credits remaining: ${remaining}`);

        if (!response.data || !response.data.states) {
            console.log('Serving cached data due to empty response');
            return res.json(cachedFlights);
        }

        const processedFlights = response.data.states
            .map(normalizeFlightData)
            // Filter out ground vehicles or invalid positions
            .filter(flight => flight.latitude !== 0 && flight.longitude !== 0);

        // Update cache
        cachedFlights = processedFlights;
        lastFetchTime = now;

        res.json(processedFlights);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching data from OpenSky:', errorMessage);

        // Fallback to cache on error (like 429 Rate Limit)
        if (cachedFlights.length > 0) {
            console.log('Serving cached data due to API error/rate-limit.');
            return res.json(cachedFlights);
        }

        res.status(500).json({ error: 'Failed to retrieve telemetry data stream' });
    }
});

// Route info rarely changes during a flight: cache per callsign to save AirLabs quota.
const ROUTE_CACHE_TTL = 30 * 60_000; // 30 minutes
const routeCache = new Map<string, { data: unknown; expires: number }>();

app.get('/api/route/:callsign', async (req, res) => {
    const defaultResponse = { origin: "N/A", destination: "N/A", airline: "Unknown", scheduledArrivalTS: null };
    try {
        const callsign = req.params.callsign ? req.params.callsign.trim().toUpperCase() : '';
        if (!callsign || callsign === 'UNK_FLT' || !/^[A-Z0-9]{2,10}$/.test(callsign)) {
            return res.json(defaultResponse);
        }

        const cached = routeCache.get(callsign);
        if (cached && cached.expires > Date.now()) {
            return res.json(cached.data);
        }

        const response = await axios.get('https://airlabs.co/api/v9/flight', {
            params: { flight_icao: callsign, api_key: process.env.AIRLABS_API_KEY },
            timeout: 8000
        });

        let data = response.data?.response;
        if (Array.isArray(data)) {
            data = data[0];
        }

        if (!data) {
            return res.json(defaultResponse);
        }

        let startLat, startLng, endLat, endLng;

        if (data.dep_iata && data.arr_iata) {
            try {
                const airportsResponse = await axios.get('https://airlabs.co/api/v9/airports', {
                    params: {
                        iata_code: `${data.dep_iata},${data.arr_iata}`,
                        api_key: process.env.AIRLABS_API_KEY
                    },
                    timeout: 8000
                });
                const airports = airportsResponse.data?.response;
                if (Array.isArray(airports)) {
                    const depAirport = airports.find((a: any) => a.iata_code === data.dep_iata);
                    const arrAirport = airports.find((a: any) => a.iata_code === data.arr_iata);
                    if (depAirport) {
                        startLat = depAirport.lat;
                        startLng = depAirport.lng;
                    }
                    if (arrAirport) {
                        endLat = arrAirport.lat;
                        endLng = arrAirport.lng;
                    }
                }
            } catch (err) {
                console.error(`Error fetching airport coords for ${data.dep_iata}, ${data.arr_iata}`, err);
            }
        }

        const result = {
            origin: data.dep_iata || "N/A",
            destination: data.arr_iata || "N/A",
            airline: data.airline_name || "Unknown Airline",
            scheduledArrivalTS: data.arr_time_ts ?? null,
            estimatedArrivalTS: data.arr_estimated_ts ?? null,
            startLat,
            startLng,
            endLat,
            endLng
        };
        routeCache.set(callsign, { data: result, expires: Date.now() + ROUTE_CACHE_TTL });
        return res.json(result);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error fetching AirLabs data for ${req.params.callsign}:`, errorMessage);
        return res.status(500).json(defaultResponse);
    }
});

app.listen(PORT, () => {
    console.log(`[AeroGrid Backend] Server running on http://localhost:${PORT}`);
});