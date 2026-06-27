import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { OpenSkyResponse, FlightTelemetry, OpenSkyStateVector } from './types';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
const CACHE_TTL = 60000; // 60 seconds

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

        // Prepare axios config, conditionally adding auth if env vars exist
        const axiosConfig: any = {
            params: {
                lamin: AIRSPACE_BOUNDS.lamin,
                lomin: AIRSPACE_BOUNDS.lomin,
                lamax: AIRSPACE_BOUNDS.lamax,
                lomax: AIRSPACE_BOUNDS.lomax
            },
            timeout: 5000
        };

        if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
            console.log(`Using OpenSky Auth for user: ${process.env.OPENSKY_USERNAME}`);
            axiosConfig.auth = {
                username: process.env.OPENSKY_USERNAME,
                password: process.env.OPENSKY_PASSWORD
            };
        } else {
            console.log('No OpenSky Auth credentials found in .env');
        }

        const response = await axios.get<OpenSkyResponse>(url, axiosConfig);

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

app.get('/api/route/:callsign', async (req, res) => {
    const defaultResponse = { origin: "N/A", destination: "N/A", airline: "Unknown", scheduledArrivalTS: null };
    try {
        const callsign = req.params.callsign ? req.params.callsign.trim() : '';
        if (!callsign || callsign === 'UNK_FLT') {
            return res.json(defaultResponse);
        }

        const url = `https://airlabs.co/api/v9/flight?flight_icao=${callsign}&api_key=${process.env.AIRLABS_API_KEY}`;
        const response = await axios.get(url);

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
                const airportsUrl = `https://airlabs.co/api/v9/airports?iata_code=${data.dep_iata},${data.arr_iata}&api_key=${process.env.AIRLABS_API_KEY}`;
                const airportsResponse = await axios.get(airportsUrl);
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

        return res.json({
            origin: data.dep_iata || "N/A",
            destination: data.arr_iata || "N/A",
            airline: data.airline_name || "Unknown Airline",
            scheduledArrivalTS: data.arr_time_ts ?? null,
            startLat,
            startLng,
            endLat,
            endLng
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error fetching AirLabs data for ${req.params.callsign}:`, errorMessage);
        return res.status(500).json(defaultResponse);
    }
});

app.listen(PORT, () => {
    console.log(`[AeroGrid Backend] Server running on http://localhost:${PORT}`);
});