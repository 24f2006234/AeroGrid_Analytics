import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { OpenSkyResponse, FlightTelemetry } from './type';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// OpenSky bounding box coordinates (Example: covering a target airspace region)
// format: [lamin, lomin, lamax, lomax]
const AIRSPACE_BOUNDS = {
    lamin: 20.0,
    lomin: 70.0,
    lamax: 30.0,
    lomax: 90.0
};

/**
 * Normalizes OpenSky array metrics into aviation standard units and typed objects
 */
const normalizeFlightData = (state: any[]): FlightTelemetry => {
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

/**
 * Route: Fetches active flights within defined geographic boundaries
 */
app.get('/api/telemetry', async (req, res) => {
    try {
        const url = `https://opensky-network.org/api/states/all`;
        const response = await axios.get<OpenSkyResponse>(url, {
            params: {
                lamin: AIRSPACE_BOUNDS.lamin,
                lomin: AIRSPACE_BOUNDS.lomin,
                lamax: AIRSPACE_BOUNDS.lamax,
                lomax: AIRSPACE_BOUNDS.lomax
            },
            timeout: 5000
        });

        if (!response.data || !response.data.states) {
            return res.json([]);
        }

        const processedFlights = response.data.states
            .map(normalizeFlightData)
            // Filter out ground vehicles or invalid positions
            .filter(flight => flight.latitude !== 0 && flight.longitude !== 0);

        res.json(processedFlights);
    } catch (error: any) {
        console.error('Error fetching data from OpenSky:', error.message);
        res.status(500).json({ error: 'Failed to retrieve telemetry data stream' });
    }
});

app.listen(PORT, () => {
    console.log(`[AeroGrid Backend] Server running on http://localhost:${PORT}`);
});