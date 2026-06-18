export type OpenSkyStateVector = [
    string, // icao24
    string | null, // callsign
    string, // origin_country
    number | null, // time_position
    number | null, // last_contact
    number | null, // longitude
    number | null, // latitude
    number | null, // baro_altitude
    boolean, // on_ground
    number | null, // velocity
    number | null, // true_track
    number | null, // vertical_rate
    number[] | null, // sensors
    number | null, // geo_altitude
    string | null, // squawk
    boolean, // spi
    number // position_source
];

export interface OpenSkyResponse {
    time: number;
    states: OpenSkyStateVector[] | null;
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