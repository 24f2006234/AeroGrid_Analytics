export interface Flight {
  icao24: string;
  callsign: string;
  originCountry: string;
  longitude: number;
  latitude: number;
  altitude: number;
  speed: number;
  heading: number;
  verticalRate: number;
  squawk: string;
  status: 'ACTIVE' | 'WARNING' | 'ERROR';
}
