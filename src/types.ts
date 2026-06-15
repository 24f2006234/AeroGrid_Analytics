export interface Flight {
  callsign: string;
  altitude: number;
  speed: number;
  heading: number;
  coordinates: string;
  status: 'ACTIVE' | 'WARNING' | 'ERROR';
  origin: string;
  destination: string;
  aircraftType: string;
}
