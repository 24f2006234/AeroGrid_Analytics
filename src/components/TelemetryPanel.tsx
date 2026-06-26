import React, { useEffect, useState } from 'react';
import { Flight } from '../types';
import { MonoText } from './MonoText';

const AVIATION_HUBS = [
  { name: 'DEL', lat: 28.5562, lon: 77.1000 },
  { name: 'BOM', lat: 19.0896, lon: 72.8656 },
  { name: 'BLR', lat: 13.1986, lon: 77.7066 },
  { name: 'CCU', lat: 22.6520, lon: 88.4467 }
];

const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371.0; 
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const getDistanceToClosestHub = (flightLat: number, flightLon: number): number => {
  const distances = AVIATION_HUBS.map(hub => calculateHaversineDistance(flightLat, flightLon, hub.lat, hub.lon));
  return Math.min(...distances);
};

interface TelemetryPanelProps {
  searchQuery: string;
  selectedStatus: string;
  minAltitude: number;
  maxAltitude: number;
  flights: Flight[];
  isLoading: boolean;
  isError: boolean;
  selectedIcao: string | null;
  setSelectedIcao: (icao: string | null) => void;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  searchQuery,
  selectedStatus,
  minAltitude,
  maxAltitude,
  flights,
  isLoading,
  isError,
  selectedIcao,
  setSelectedIcao,
}) => {
  const [routeData, setRouteData] = useState<{ origin: string; destination: string; airline: string; scheduledArrivalTS: number | null } | null>(null);
  const [mlEtaMinutes, setMlEtaMinutes] = useState<number | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [isETALoading, setIsETALoading] = useState<boolean>(false);


  useEffect(() => {
    if (flights.length > 0 && !selectedIcao) {
      setSelectedIcao(flights[0].icao24);
    }
  }, [flights, selectedIcao, setSelectedIcao]);

  useEffect(() => {
    if (selectedIcao) {
      const element = document.getElementById(`flight-card-${selectedIcao}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedIcao]);

  // Filter logic
  const filteredFlights = flights.filter((flight) => {
    const matchesSearch =
      flight.callsign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.icao24.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.originCountry.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'ALL' || flight.status === selectedStatus;

    const matchesAltitude =
      flight.altitude >= minAltitude && flight.altitude <= maxAltitude;

    return matchesSearch && matchesStatus && matchesAltitude;
  });

  const selectedFlight = flights.find((f) => f.icao24 === selectedIcao) || filteredFlights[0];

  useEffect(() => {
    let isMounted = true;
    if (selectedFlight) {
      setRouteData(null);
      setMlEtaMinutes(null);
      setLoadingRoute(true);
      setIsETALoading(true);

      const fetchRoute = fetch(`http://localhost:5000/api/route/${selectedFlight.callsign}`)
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) setRouteData(data);
        })
        .catch((err) => console.error('Failed to fetch Route:', err))
        .finally(() => {
          if (isMounted) setLoadingRoute(false);
        });

      const dynamicDistance = getDistanceToClosestHub(selectedFlight.latitude, selectedFlight.longitude);

      const fetchML = fetch('http://localhost:8000/predict-eta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          velocity: selectedFlight.speed,
          altitude: selectedFlight.altitude,
          heading: selectedFlight.heading,
          vertical_rate: selectedFlight.verticalRate,
          min_dist_to_hub: dynamicDistance
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.eta_minutes !== undefined) {
            setMlEtaMinutes(data.eta_minutes);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch ML ETA:', err);
        })
        .finally(() => {
          if (isMounted) setIsETALoading(false);
        });
    } else {
      setRouteData(null);
      setMlEtaMinutes(null);
    }
    
    return () => {
      isMounted = false;
    };
  }, [
    selectedFlight?.icao24,
    selectedFlight?.callsign,
    selectedFlight?.speed,
    selectedFlight?.altitude,
    selectedFlight?.heading,
    selectedFlight?.verticalRate,
    selectedFlight?.latitude,
    selectedFlight?.longitude
  ]);

  let delayMinutes = 0;
  let isDelayCalculated = false;
  if (mlEtaMinutes !== null && routeData?.scheduledArrivalTS) {
    const currentTimeTS = Math.floor(Date.now() / 1000);
    const predictedArrivalTS = currentTimeTS + (mlEtaMinutes * 60);
    const delaySeconds = predictedArrivalTS - routeData.scheduledArrivalTS;
    delayMinutes = delaySeconds > 0 ? Math.round(delaySeconds / 60) : 0;
    isDelayCalculated = true;
  }

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

  const formatCoordinates = (lat: number, lon: number) => {
    return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
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
        {isLoading ? (
          <div className="text-center py-8 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            Initializing Uplink...
          </div>
        ) : isError ? (
          <div className="text-center py-8 border border-red-200 bg-red-50 rounded-sm">
            <p className="text-[10px] text-red-700 font-bold uppercase tracking-wider">
              CONNECTION LOST
            </p>
            <p className="text-[9px] text-red-600 mt-1 uppercase">
              System Offline
            </p>
          </div>
        ) : filteredFlights.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-sm">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              No matching transponders
            </p>
          </div>
        ) : (
          filteredFlights.map((flight) => {
            const isSelected = selectedFlight?.icao24 === flight.icao24;
            return (
              <div
                key={flight.icao24}
                id={`flight-card-${flight.icao24}`}
                onClick={() => setSelectedIcao(flight.icao24)}
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
                      {flight.callsign || 'UNKNOWN'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono uppercase">
                      {flight.originCountry}
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

                {/* Card Secondary Line */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium mb-2.5">
                  <span className="font-mono text-[9px]">
                    {formatCoordinates(flight.latitude, flight.longitude)}
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
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Telemetry Detail
            </h3>
            <span className="text-[9px] font-mono text-slate-400">
              SQUAWK: <MonoText className="text-[9px] text-slate-700">{selectedFlight.squawk}</MonoText>
            </span>
          </div>

          {/* New Route Info Section */}
          <div className="pb-3 mb-3 border-b border-slate-200">
            {loadingRoute ? (
               <div className="text-[10px] text-slate-500 font-bold tracking-widest animate-pulse">LOADING ROUTE...</div>
            ) : routeData ? (
               <div className="flex flex-col">
                 <div className="text-lg font-bold text-slate-900 tracking-wide uppercase">
                   {routeData.origin} → {routeData.destination}
                 </div>
                 <div className="text-[10px] text-slate-500 font-medium uppercase mt-1">
                   {routeData.airline}
                 </div>
               </div>
            ) : (
               <div className="text-[10px] text-slate-500 font-bold tracking-widest">ROUTE UNAVAILABLE</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-400 uppercase">Callsign / HEX</p>
              <p className="text-xs font-bold text-slate-900">
                {selectedFlight.callsign || 'UNK'} <span className="text-[9px] text-slate-400 font-mono font-normal">({selectedFlight.icao24})</span>
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
                <MonoText className="text-[11px]">{formatCoordinates(selectedFlight.latitude, selectedFlight.longitude)}</MonoText>
              </p>
            </div>
            
            <div className="col-span-2 space-y-0.5">
              <p className="text-[9px] text-slate-400 uppercase">Vertical Rate</p>
              <p className="text-[11px] font-medium text-slate-900">
                <MonoText className="text-[11px]">{selectedFlight.verticalRate}</MonoText>
                <span className="text-[8px] text-slate-400 font-normal ml-1">M/S</span>
              </p>
            </div>
            
            <div className="col-span-2 space-y-0.5 mt-2 pt-2 border-t border-slate-200">
              <p className="text-[9px] text-slate-400 uppercase">ETA (BETA)</p>
              <p className="text-[11px] font-medium text-slate-900">
                {isETALoading ? (
                  <span className="text-slate-500 italic animate-pulse">CALCULATING...</span>
                ) : mlEtaMinutes !== null ? (
                  <>
                    <MonoText className="text-[11px] font-bold text-indigo-600">{mlEtaMinutes}</MonoText>
                    <span className="text-[8px] text-slate-400 font-normal ml-1">MIN</span>
                  </>
                ) : (
                  <span className="text-slate-400">N/A</span>
                )}
              </p>
            </div>

            <div className="col-span-2 space-y-0.5 pt-1">
              <p className="text-[9px] text-slate-400 uppercase">Predicted Delay</p>
              <p className="text-[11px] font-medium">
                {isETALoading || loadingRoute ? (
                  <span className="text-slate-500 italic animate-pulse uppercase">CALCULATING DELAY...</span>
                ) : isDelayCalculated ? (
                  delayMinutes > 0 ? (
                    <span className="font-bold text-red-600">DELAY: +{delayMinutes} MIN</span>
                  ) : (
                    <span className="font-bold text-emerald-600">ON TIME</span>
                  )
                ) : (
                  <span className="text-slate-400 uppercase">N/A</span>
                )}
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
