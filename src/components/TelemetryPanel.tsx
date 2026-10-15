import React, { useEffect, useState } from 'react';
import { Flight } from '../types';
import { MonoText } from './MonoText';
import { useTheme } from '../context/ThemeContext';

const AVIATION_HUBS = [
  { name: 'DEL', lat: 28.5562, lon: 77.1 },
  { name: 'BOM', lat: 19.0896, lon: 72.8656 },
  { name: 'BLR', lat: 13.1986, lon: 77.7066 },
  { name: 'CCU', lat: 22.652, lon: 88.4467 },
];

const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const getDistanceToClosestHub = (flightLat: number, flightLon: number): number => {
  const distances = AVIATION_HUBS.map((hub) =>
    calculateHaversineDistance(flightLat, flightLon, hub.lat, hub.lon)
  );
  return Math.min(...distances);
};

const formatEtaDuration = (minutes: number): string => {
  if (minutes < 1) {
    return `${Math.max(1, Math.round(minutes * 60))}s`;
  }
  const totalSeconds = Math.round(minutes * 60);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (secs > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${mins} min`;
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
  setActiveArc: (arc: any[]) => void;
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
  setActiveArc,
}) => {
  const { isDark } = useTheme();
  const [routeData, setRouteData] = useState<{
    origin: string;
    destination: string;
    airline: string;
    scheduledArrivalTS: number | null;
    estimatedArrivalTS?: number | null;
    startLat?: number;
    startLng?: number;
    endLat?: number;
    endLng?: number;
  } | null>(null);
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

  const selectedFlight =
    flights.find((f) => f.icao24 === selectedIcao) || filteredFlights[0];

  useEffect(() => {
    let isMounted = true;
    if (selectedFlight) {
      setRouteData(null);
      setMlEtaMinutes(null);
      setActiveArc([]);
      setLoadingRoute(true);
      setIsETALoading(true);

      fetch(`http://localhost:5000/api/route/${selectedFlight.callsign}`)
        .then((res) => res.json())
        .catch((err) => {
          console.error('Failed to fetch Route:', err);
          return null;
        })
        .then((data) => {
          if (!isMounted) return;

          let endLat: number | undefined = undefined;
          let endLng: number | undefined = undefined;

          if (data) {
            setRouteData(data);
            if (typeof data.endLat === 'number' && typeof data.endLng === 'number') {
              endLat = data.endLat;
              endLng = data.endLng;
              setActiveArc([
                {
                  startLat:
                    typeof data.startLat === 'number'
                      ? data.startLat
                      : selectedFlight.latitude,
                  startLng:
                    typeof data.startLng === 'number'
                      ? data.startLng
                      : selectedFlight.longitude,
                  endLat: data.endLat,
                  endLng: data.endLng,
                },
              ]);
            } else {
              setActiveArc([]);
            }
          } else {
            setActiveArc([]);
          }
          setLoadingRoute(false);

          let dynamicDistance = getDistanceToClosestHub(
            selectedFlight.latitude,
            selectedFlight.longitude
          );
          if (endLat !== undefined && endLng !== undefined) {
            dynamicDistance = calculateHaversineDistance(
              selectedFlight.latitude,
              selectedFlight.longitude,
              endLat,
              endLng
            );
          }

          fetch('http://localhost:8000/predict-eta', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              velocity: selectedFlight.speed / 1.94384,
              altitude: selectedFlight.altitude / 3.28084,
              heading: selectedFlight.heading,
              vertical_rate: selectedFlight.verticalRate,
              min_dist_to_hub: dynamicDistance,
            }),
          })
            .then((res) => res.json())
            .then((etaData) => {
              if (isMounted && etaData.eta_seconds !== undefined) {
                const rawValue = etaData.eta_seconds;
                const etaMinutes = Math.round((rawValue / 60) * 100) / 100;
                setMlEtaMinutes(etaMinutes);
              }
            })
            .catch((err) => {
              console.error('Failed to fetch ML ETA:', err);
            })
            .finally(() => {
              if (isMounted) setIsETALoading(false);
            });
        });
    } else {
      setRouteData(null);
      setMlEtaMinutes(null);
      setActiveArc([]);
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
    selectedFlight?.longitude,
    setActiveArc,
  ]);

  let delayMinutes = 0;
  let isDelayCalculated = false;

  if (routeData?.scheduledArrivalTS && routeData?.estimatedArrivalTS) {
    const delaySeconds = routeData.estimatedArrivalTS - routeData.scheduledArrivalTS;
    delayMinutes = Math.round(delaySeconds / 60);
    isDelayCalculated = true;
  } else if (mlEtaMinutes !== null && routeData?.scheduledArrivalTS) {
    const currentTimeTS = Math.floor(Date.now() / 1000);
    const predictedArrivalTS = currentTimeTS + mlEtaMinutes * 60;
    const delaySeconds = predictedArrivalTS - routeData.scheduledArrivalTS;
    delayMinutes = Math.round(delaySeconds / 60);
    isDelayCalculated = true;
  }

  const getStatusBadge = (status: Flight['status']) => {
    if (isDark) {
      switch (status) {
        case 'ACTIVE':
          return (
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300">
              ACTIVE
            </span>
          );
        case 'WARNING':
          return (
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-amber-950/80 border border-amber-800/60 text-amber-300">
              CAUTION
            </span>
          );
        case 'ERROR':
          return (
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-rose-950/80 border border-rose-800/60 text-rose-300">
              ALERT
            </span>
          );
        default:
          return (
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-slate-800 border border-slate-700 text-slate-300">
              {status}
            </span>
          );
      }
    } else {
      switch (status) {
        case 'ACTIVE':
          return (
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
              ACTIVE
            </span>
          );
        case 'WARNING':
          return (
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-amber-50 border border-amber-200 text-amber-700">
              CAUTION
            </span>
          );
        case 'ERROR':
          return (
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-rose-50 border border-rose-200 text-rose-700">
              ALERT
            </span>
          );
        default:
          return (
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-slate-100 border border-slate-200 text-slate-700">
              {status}
            </span>
          );
      }
    }
  };

  const formatCoordinates = (lat: number, lon: number) => {
    return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  };

  return (
    <section
      className={`flex flex-col h-full border-l transition-colors duration-200 overflow-hidden select-none ${
        isDark
          ? 'bg-[#0b0f19] border-[#1e293b] text-slate-200'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Header */}
      <div
        className={`px-5 py-3.5 border-b transition-colors duration-200 ${
          isDark ? 'bg-[#0d1322] border-[#1e293b]' : 'bg-slate-50/80 border-slate-200'
        }`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isDark ? 'bg-emerald-400' : 'bg-emerald-600'
              }`}
            ></span>
            <h2
              className={`text-xs font-mono font-bold uppercase tracking-wider ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              Surveillance Feed
            </h2>
          </div>
          <span
            className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded border ${
              isDark
                ? 'bg-[#162032] border-[#1e293b] text-slate-300'
                : 'bg-white border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            {filteredFlights.length} Targets
          </span>
        </div>
      </div>

      {/* Flight Cards Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div
            className={`flex flex-col items-center justify-center py-12 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <div
              className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mb-3 ${
                isDark ? 'border-sky-400' : 'border-blue-600'
              }`}
            ></div>
            <p className="text-xs font-mono">Acquiring ADS-B telemetry...</p>
          </div>
        ) : isError ? (
          <div
            className={`p-4 rounded border text-center ${
              isDark
                ? 'bg-rose-950/40 border-rose-800/50'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <p
              className={`text-xs font-mono font-bold uppercase ${
                isDark ? 'text-rose-300' : 'text-red-700'
              }`}
            >
              Telemetry Receiver Offline
            </p>
            <p
              className={`text-[10px] font-mono mt-1 ${
                isDark ? 'text-rose-400/80' : 'text-red-600'
              }`}
            >
              Unable to establish uplink with local receiver gateway
            </p>
          </div>
        ) : filteredFlights.length === 0 ? (
          <div
            className={`p-8 text-center border border-dashed rounded ${
              isDark ? 'border-[#1e293b] text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            <p className="text-xs font-mono">
              No aircraft match current filter criteria
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
                className={`p-3 rounded border transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-[#131d30] border-sky-500 shadow-sm'
                      : 'bg-blue-50/70 border-blue-500 shadow-xs'
                    : isDark
                    ? 'bg-[#0f172a] border-[#1e293b] hover:border-[#334155] hover:bg-[#121c2e]'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                }`}
              >
                {/* Card Top Line */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isDark ? 'text-slate-100' : 'text-slate-900'
                      }`}
                    >
                      {flight.callsign || 'NO CALLSIGN'}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {flight.originCountry}
                    </span>
                  </div>
                  {getStatusBadge(flight.status)}
                </div>

                {/* Card Secondary Line */}
                <div
                  className={`flex justify-between items-center text-[10px] font-mono mb-2 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  <span>{formatCoordinates(flight.latitude, flight.longitude)}</span>
                  <div
                    className={`flex items-center gap-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className={`w-2.5 h-2.5 ${
                        isDark ? 'text-sky-400' : 'text-blue-600'
                      }`}
                      style={{ transform: `rotate(${flight.heading - 45}deg)` }}
                    >
                      <path d="M17.8 19.2 16 11l3.5-3.5A2.12 2.12 0 0 0 16.5 4L13 7.5l-8.2-1.8L3 7l7.5 4.5L7 15l-3-1L3 15l3.5 2.5L9 21l1-.5-1-3 4-3.5 4.5 7.5Z" />
                    </svg>
                    <MonoText>{String(flight.heading).padStart(3, '0')}°</MonoText>
                  </div>
                </div>

                {/* Telemetry Metric Grid */}
                <div
                  className={`grid grid-cols-3 gap-1 pt-2 border-t text-[10px] font-mono ${
                    isDark ? 'border-[#1e293b]/70' : 'border-slate-100'
                  }`}
                >
                  <div>
                    <span
                      className={`text-[9px] block ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      ALTITUDE
                    </span>
                    <MonoText
                      className={`font-semibold ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {flight.altitude.toLocaleString()} FT
                    </MonoText>
                  </div>
                  <div>
                    <span
                      className={`text-[9px] block ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      SPEED
                    </span>
                    <MonoText
                      className={`font-semibold ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {flight.speed} KT
                    </MonoText>
                  </div>
                  <div>
                    <span
                      className={`text-[9px] block ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      V/S
                    </span>
                    <MonoText
                      className={`font-semibold ${
                        flight.verticalRate > 0.5
                          ? isDark
                            ? 'text-emerald-400'
                            : 'text-emerald-600'
                          : flight.verticalRate < -0.5
                          ? isDark
                            ? 'text-amber-400'
                            : 'text-amber-600'
                          : isDark
                          ? 'text-slate-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {flight.verticalRate > 0
                        ? `+${flight.verticalRate}`
                        : flight.verticalRate}{' '}
                      M/S
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
        <div
          className={`border-t p-4 space-y-3.5 select-none transition-colors duration-200 ${
            isDark ? 'bg-[#0e1526] border-[#1e293b]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div
            className={`flex justify-between items-center pb-2 border-b ${
              isDark ? 'border-[#1e293b]' : 'border-slate-200'
            }`}
          >
            <span
              className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Flight Inspector
            </span>
            <span
              className={`text-[10px] font-mono ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              SQUAWK:{' '}
              <MonoText
                className={`font-semibold ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                {selectedFlight.squawk}
              </MonoText>
            </span>
          </div>

          {/* Route Section */}
          <div
            className={`p-2.5 rounded border transition-colors ${
              isDark
                ? 'bg-[#131b2e] border-[#1e293b]'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            {loadingRoute ? (
              <div
                className={`text-[10px] font-mono animate-pulse ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Resolving flight route schedule...
              </div>
            ) : routeData ? (
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={`text-sm font-mono font-bold tracking-wide ${
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    {routeData.origin} → {routeData.destination}
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      isDark
                        ? 'bg-sky-950/80 border-sky-800/60 text-sky-300'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}
                  >
                    AIRLABS
                  </span>
                </div>
                <div
                  className={`text-[10px] font-mono mt-0.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {routeData.airline}
                </div>
              </div>
            ) : (
              <div
                className={`text-[10px] font-mono ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Direct En-Route Sector Transit
              </div>
            )}
          </div>

          {/* Flight Parameters Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div
              className={`p-2 rounded border transition-colors ${
                isDark
                  ? 'bg-[#111827] border-[#1e293b]'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <span
                className={`text-[9px] block uppercase ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Callsign / ICAO
              </span>
              <span
                className={`font-bold ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {selectedFlight.callsign || 'UNKNOWN'}
              </span>
              <span
                className={`ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                ({selectedFlight.icao24})
              </span>
            </div>

            <div
              className={`p-2 rounded border transition-colors ${
                isDark
                  ? 'bg-[#111827] border-[#1e293b]'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <span
                className={`text-[9px] block uppercase ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Status
              </span>
              <div className="mt-0.5">{getStatusBadge(selectedFlight.status)}</div>
            </div>

            <div
              className={`p-2 rounded border transition-colors ${
                isDark
                  ? 'bg-[#111827] border-[#1e293b]'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <span
                className={`text-[9px] block uppercase ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Altitude
              </span>
              <MonoText
                className={`text-xs font-bold ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {selectedFlight.altitude.toLocaleString()} FT
              </MonoText>
            </div>

            <div
              className={`p-2 rounded border transition-colors ${
                isDark
                  ? 'bg-[#111827] border-[#1e293b]'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <span
                className={`text-[9px] block uppercase ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Ground Speed
              </span>
              <MonoText
                className={`text-xs font-bold ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {selectedFlight.speed} KT
              </MonoText>
            </div>

            <div
              className={`col-span-2 p-2 rounded border transition-colors ${
                isDark
                  ? 'bg-[#111827] border-[#1e293b]'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <span
                className={`text-[9px] block uppercase ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Coordinates
              </span>
              <MonoText className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                {formatCoordinates(selectedFlight.latitude, selectedFlight.longitude)}
              </MonoText>
            </div>

            {/* ML Predicted Duration & Delay */}
            <div
              className={`p-2 rounded border transition-colors ${
                isDark
                  ? 'bg-[#111827] border-[#1e293b]'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <span
                className={`text-[9px] block uppercase ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Duration (ML)
              </span>
              {isETALoading ? (
                <span
                  className={`text-[10px] animate-pulse ${
                    isDark ? 'text-sky-400' : 'text-blue-600'
                  }`}
                >
                  Calculating...
                </span>
              ) : mlEtaMinutes !== null ? (
                <MonoText
                  className={`text-xs font-bold ${
                    isDark ? 'text-sky-400' : 'text-blue-600'
                  }`}
                >
                  {formatEtaDuration(mlEtaMinutes)}
                </MonoText>
              ) : (
                <span
                  className={isDark ? 'text-slate-500' : 'text-slate-400'}
                >
                  N/A
                </span>
              )}
            </div>

            <div
              className={`p-2 rounded border transition-colors ${
                isDark
                  ? 'bg-[#111827] border-[#1e293b]'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <span
                className={`text-[9px] block uppercase ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Schedule Delta
              </span>
              {isETALoading || loadingRoute ? (
                <span
                  className={`text-[10px] animate-pulse ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Syncing...
                </span>
              ) : isDelayCalculated ? (
                delayMinutes > 0 ? (
                  <span
                    className={`font-semibold ${
                      isDark ? 'text-rose-400' : 'text-red-600'
                    }`}
                  >
                    +{delayMinutes}m Delayed
                  </span>
                ) : delayMinutes < 0 ? (
                  <span
                    className={`font-semibold ${
                      isDark ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                  >
                    {Math.abs(delayMinutes)}m Early
                  </span>
                ) : (
                  <span
                    className={`font-semibold ${
                      isDark ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                  >
                    On Time
                  </span>
                )
              ) : (
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                  Standard
                </span>
              )}
            </div>
          </div>

          {/* Heading Vector Compass Readout */}
          <div
            className={`flex justify-between items-center px-3 py-2 border rounded text-[10px] font-mono transition-colors ${
              isDark
                ? 'bg-[#111827] border-[#1e293b]'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              HEADING VECTOR
            </span>
            <div
              className={`flex items-center gap-1.5 ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`w-3.5 h-3.5 ${
                  isDark ? 'text-sky-400' : 'text-blue-600'
                }`}
                style={{ transform: `rotate(${selectedFlight.heading}deg)` }}
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              <MonoText className="font-bold">
                {String(selectedFlight.heading).padStart(3, '0')}°
              </MonoText>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
