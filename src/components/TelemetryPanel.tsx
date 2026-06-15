import React, { useState, useEffect } from 'react';
import { Flight } from '../types';
import { MonoText } from './MonoText';

interface TelemetryPanelProps {
  searchQuery: string;
  selectedStatus: string;
  minAltitude: number;
  maxAltitude: number;
}

const INITIAL_FLIGHTS: Flight[] = [
  {
    callsign: 'IGO612',
    altitude: 32400,
    speed: 465,
    heading: 120,
    coordinates: '22.57N / 88.36E',
    status: 'ACTIVE',
    origin: 'DEL',
    destination: 'CCU',
    aircraftType: 'A320',
  },
  {
    callsign: 'DAL192',
    altitude: 36000,
    speed: 510,
    heading: 280,
    coordinates: '40.71N / 74.00W',
    status: 'ACTIVE',
    origin: 'LHR',
    destination: 'JFK',
    aircraftType: 'B777',
  },
  {
    callsign: 'SVR480',
    altitude: 29500,
    speed: 435,
    heading: 45,
    coordinates: '55.75N / 37.61E',
    status: 'WARNING',
    origin: 'DME',
    destination: 'LED',
    aircraftType: 'A321',
  },
  {
    callsign: 'AAL889',
    altitude: 34000,
    speed: 485,
    heading: 195,
    coordinates: '34.05N / 118.24W',
    status: 'ACTIVE',
    origin: 'ORD',
    destination: 'LAX',
    aircraftType: 'B739',
  },
  {
    callsign: 'AFR012',
    altitude: 37200,
    speed: 495,
    heading: 90,
    coordinates: '48.85N / 2.35E',
    status: 'ERROR',
    origin: 'CDG',
    destination: 'HND',
    aircraftType: 'B789',
  },
  {
    callsign: 'QTR77A',
    altitude: 31000,
    speed: 470,
    heading: 315,
    coordinates: '25.28N / 51.53E',
    status: 'ACTIVE',
    origin: 'DOH',
    destination: 'LHR',
    aircraftType: 'A350',
  },
  {
    callsign: 'JAL006',
    altitude: 35000,
    speed: 502,
    heading: 85,
    coordinates: '35.67N / 139.65E',
    status: 'WARNING',
    origin: 'HND',
    destination: 'LAX',
    aircraftType: 'B77W',
  },
];

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  searchQuery,
  selectedStatus,
  minAltitude,
  maxAltitude,
}) => {
  const [flights, setFlights] = useState<Flight[]>(INITIAL_FLIGHTS);
  const [selectedFlightCallsign, setSelectedFlightCallsign] = useState<string>('IGO612');

  // Core telemetry simulator: minor fluctuations in speed and altitude every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFlights((currentFlights) =>
        currentFlights.map((flight) => {
          // Fluctuates altitude between -150 and +150 feet, clamped between 28k and 38k
          const altChange = Math.floor(Math.random() * 301) - 150;
          const newAltitude = Math.min(
            38000,
            Math.max(28000, flight.altitude + altChange)
          );

          // Fluctuates speed between -3 and +3 knots, clamped between 420 and 520
          const speedChange = Math.floor(Math.random() * 7) - 3;
          const newSpeed = Math.min(
            520,
            Math.max(420, flight.speed + speedChange)
          );

          return {
            ...flight,
            altitude: newAltitude,
            speed: newSpeed,
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Filter logic
  const filteredFlights = flights.filter((flight) => {
    const matchesSearch =
      flight.callsign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.aircraftType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.destination.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'ALL' || flight.status === selectedStatus;

    const matchesAltitude =
      flight.altitude >= minAltitude && flight.altitude <= maxAltitude;

    return matchesSearch && matchesStatus && matchesAltitude;
  });

  const selectedFlight = flights.find((f) => f.callsign === selectedFlightCallsign) || filteredFlights[0];

  const getStatusStyle = (status: Flight['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'WARNING':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'ERROR':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  return (
    <section className="flex flex-col h-full bg-white border-l border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Live Telemetry Feed
          </h2>
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold font-mono bg-slate-100 border border-slate-200 rounded-sm text-slate-600">
            TOTAL: {filteredFlights.length}
          </span>
        </div>
      </div>

      {/* Flight Cards Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {filteredFlights.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-sm">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              No matching transponders
            </p>
          </div>
        ) : (
          filteredFlights.map((flight) => {
            const isSelected = selectedFlight?.callsign === flight.callsign;
            return (
              <div
                key={flight.callsign}
                onClick={() => setSelectedFlightCallsign(flight.callsign)}
                className={`p-3 border rounded-sm transition-all cursor-pointer ${
                  isSelected
                    ? 'border-slate-900 bg-slate-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {/* Card Top Line */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-950 font-sans">
                      {flight.callsign}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {flight.aircraftType}
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 text-[8px] font-bold border rounded-sm ${getStatusStyle(
                      flight.status
                    )}`}
                  >
                    {flight.status}
                  </span>
                </div>

                {/* Card Secondary Line (Origin -> Dest) */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium mb-2.5">
                  <span>
                    {flight.origin} → {flight.destination}
                  </span>
                  <div className="flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="w-2.5 h-2.5 text-slate-400"
                      style={{ transform: `rotate(${flight.heading - 45}deg)` }}
                    >
                      <path d="M17.8 19.2 16 11l3.5-3.5A2.12 2.12 0 0 0 16.5 4L13 7.5l-8.2-1.8L3 7l7.5 4.5L7 15l-3-1L3 15l3.5 2.5L9 21l1-.5-1-3 4-3.5 4.5 7.5Z" />
                    </svg>
                    <MonoText className="text-[10px]">{flight.heading}°</MonoText>
                  </div>
                </div>

                {/* Telemetry Metric Grid */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-400 font-sans uppercase">Altitude</span>
                    <MonoText className="text-[10px] font-semibold text-slate-800">
                      {flight.altitude.toLocaleString()} <span className="text-[8px] text-slate-400">FT</span>
                    </MonoText>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-400 font-sans uppercase">Speed</span>
                    <MonoText className="text-[10px] font-semibold text-slate-800">
                      {flight.speed} <span className="text-[8px] text-slate-400">KT</span>
                    </MonoText>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Flight Dense Detail Drawer */}
      {selectedFlight && (
        <div className="bg-slate-50 border-t border-slate-200 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Telemetry Detail
            </h3>
            <span className="text-[9px] font-mono text-slate-400">
              SQUAWK: <MonoText className="text-[9px] text-slate-700">7700</MonoText>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-400 uppercase">Callsign / Type</p>
              <p className="text-xs font-bold text-slate-900">
                {selectedFlight.callsign} <span className="text-[9px] text-slate-400 font-mono font-normal">({selectedFlight.aircraftType})</span>
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-400 uppercase">Sector Status</p>
              <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold border rounded-sm ${getStatusStyle(selectedFlight.status)}`}>
                {selectedFlight.status}
              </span>
            </div>

            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-400 uppercase">Live Altitude</p>
              <p className="text-xs font-bold text-slate-800">
                <MonoText className="text-xs">{selectedFlight.altitude.toLocaleString()}</MonoText>
                <span className="text-[8px] text-slate-400 font-normal ml-1">FT</span>
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-400 uppercase">Ground Speed</p>
              <p className="text-xs font-bold text-slate-800">
                <MonoText className="text-xs">{selectedFlight.speed}</MonoText>
                <span className="text-[8px] text-slate-400 font-normal ml-1">KT</span>
              </p>
            </div>

            <div className="col-span-2 space-y-0.5">
              <p className="text-[9px] text-slate-400 uppercase">Position Vectors (Lat/Lon)</p>
              <p className="text-[11px] font-medium text-slate-900">
                <MonoText className="text-[11px]">{selectedFlight.coordinates}</MonoText>
              </p>
            </div>
          </div>

          {/* Simple Vector Compass Ticker */}
          <div className="flex justify-between items-center text-[10px] bg-white border border-slate-200 rounded-sm px-3 py-2">
            <span className="text-slate-400">VECTOR HEADING</span>
            <div className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-3.5 h-3.5 text-slate-700"
                style={{ transform: `rotate(${selectedFlight.heading}deg)` }}
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              <MonoText className="font-semibold text-slate-800">
                {String(selectedFlight.heading).padStart(3, '0')}°
              </MonoText>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
