export interface OpenSkyResponse {
    time: number;
    states: any[][] | null;
}

export interface FlightTelemetry {
    icao24: string;
    callsign: string;
    originCountry: string;
    longitude: number;
    latitude: number;
    altitude: number; // Converted to feet
    speed: number;    // Converted to knots
    heading: number;  // Degrees
    verticalRate: number; // m/s
    squawk: string;
    status: 'ACTIVE' | 'WARNING' | 'ERROR';
}