import React, { useState, useEffect } from 'react';
import { Flight } from '../types';
import { MonoText } from './MonoText';
import { useTheme } from '../context/ThemeContext';

interface LeftPanelProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  minAltitude: number;
  setMinAltitude: (alt: number) => void;
  maxAltitude: number;
  setMaxAltitude: (alt: number) => void;
  refreshData: () => void;
  flights?: Flight[];
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  searchQuery,
  setSearchQuery,
  selectedStatus,
  setSelectedStatus,
  minAltitude,
  setMinAltitude,
  maxAltitude,
  setMaxAltitude,
  refreshData,
  flights = [],
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalTracked = flights.length;
  const cruisingCount = flights.filter((f) => f.altitude >= 30000).length;
  const climbingCount = flights.filter((f) => f.verticalRate > 0.5).length;
  const descendingCount = flights.filter((f) => f.verticalRate < -0.5).length;

  return (
    <aside
      className={`flex flex-col h-full border-r transition-colors duration-200 select-none ${
        isDark
          ? 'bg-[#0b0f19] border-[#1e293b] text-slate-200'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Brand & Airspace Header with Theme Toggle */}
      <div
        className={`flex items-center justify-between px-5 py-4 border-b transition-colors duration-200 ${
          isDark ? 'bg-[#0d1322] border-[#1e293b]' : 'bg-slate-50/80 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded border transition-colors ${
              isDark
                ? 'bg-[#1e293b]/70 border-[#334155]/60 text-sky-400'
                : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M17.8 19.2 16 11l3.5-3.5A2.12 2.12 0 0 0 16.5 4L13 7.5l-8.2-1.8L3 7l7.5 4.5L7 15l-3-1L3 15l3.5 2.5L9 21l1-.5-1-3 4-3.5 4.5 7.5Z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold tracking-wider uppercase ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                AEROGRID
              </span>
              <span
                className={`px-1.5 py-0.2 text-[9px] font-mono font-medium rounded border ${
                  isDark
                    ? 'bg-sky-950/80 text-sky-300 border-sky-800/60'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                OPS
              </span>
            </div>
            <p
              className={`text-[10px] font-mono tracking-wide mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Air Traffic Surveillance
            </p>
          </div>
        </div>

        {/* Professional Light/Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className={`flex items-center justify-center w-8 h-8 rounded border transition-all cursor-pointer ${
            isDark
              ? 'bg-[#131b2e] border-[#1e293b] text-amber-300 hover:text-amber-200 hover:bg-[#1a253f] hover:border-[#334155]'
              : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 shadow-xs'
          }`}
        >
          {isDark ? (
            /* Sun Icon (Switch to Light) */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          ) : (
            /* Moon Icon (Switch to Dark) */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-slate-700"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>
      </div>

      {/* Airspace Summary Metrics */}
      <div
        className={`px-5 py-3.5 border-b transition-colors duration-200 ${
          isDark ? 'bg-[#0e1526]/50 border-[#1e293b]' : 'bg-slate-50/60 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Sector Surveillance
          </span>
          <span
            className={`flex items-center gap-1.5 text-[10px] font-mono ${
              isDark ? 'text-emerald-400' : 'text-emerald-600 font-semibold'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                isDark ? 'bg-emerald-400' : 'bg-emerald-600'
              }`}
            ></span>
            ACTIVE
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div
            className={`px-2.5 py-2 rounded border transition-colors ${
              isDark
                ? 'bg-[#131b2e] border-[#1e293b]'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <p
              className={`text-[9px] font-mono uppercase ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Tracked
            </p>
            <MonoText
              className={`text-sm font-semibold ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              {totalTracked}
            </MonoText>
          </div>
          <div
            className={`px-2.5 py-2 rounded border transition-colors ${
              isDark
                ? 'bg-[#131b2e] border-[#1e293b]'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <p
              className={`text-[9px] font-mono uppercase ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Cruising
            </p>
            <MonoText
              className={`text-sm font-semibold ${
                isDark ? 'text-sky-400' : 'text-blue-600'
              }`}
            >
              {cruisingCount}
            </MonoText>
          </div>
          <div
            className={`px-2.5 py-2 rounded border transition-colors ${
              isDark
                ? 'bg-[#131b2e] border-[#1e293b]'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <p
              className={`text-[9px] font-mono uppercase ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Transitions
            </p>
            <MonoText
              className={`text-sm font-semibold ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              {climbingCount + descendingCount}
            </MonoText>
          </div>
        </div>
      </div>

      {/* Controls & Filter Panel */}
      <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
        {/* Search Input */}
        <div>
          <label
            className={`block mb-1.5 text-[10px] font-mono uppercase tracking-wider font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Flight Search
          </label>
          <div className="relative">
            <span
              className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-3.5 h-3.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              className={`w-full pl-9 pr-8 py-2 text-xs border rounded font-mono focus:outline-none transition-colors ${
                isDark
                  ? 'bg-[#111827] border-[#1e293b] text-slate-100 placeholder:text-slate-500 focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/30'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/30'
              }`}
              placeholder="Callsign or ICAO24..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute inset-y-0 right-0 flex items-center pr-2.5 transition-colors cursor-pointer ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-3.5 h-3.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Status Filter */}
        <div>
          <label
            className={`block mb-1.5 text-[10px] font-mono uppercase tracking-wider font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Status Filter
          </label>
          <div
            className={`grid grid-cols-4 gap-1 p-0.5 border rounded transition-colors ${
              isDark ? 'bg-[#0e1526] border-[#1e293b]' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {[
              { id: 'ALL', label: 'ALL' },
              { id: 'ACTIVE', label: 'ACTIVE' },
              { id: 'WARNING', label: 'WARN' },
              { id: 'ERROR', label: 'ALERT' },
            ].map(({ id, label }) => {
              const isActive = selectedStatus === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedStatus(id)}
                  className={`py-1.5 text-[10px] font-mono rounded text-center transition-all cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-white text-blue-700 font-bold shadow-xs border border-slate-200'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-[#162032] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Altitude Range Filter */}
        <div className="space-y-3 pt-1">
          <div className="flex justify-between items-center">
            <label
              className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Altitude Filter
            </label>
            <span
              className={`text-[10px] font-mono font-semibold ${
                isDark ? 'text-sky-400' : 'text-blue-600'
              }`}
            >
              FL{Math.round(minAltitude / 100)} - FL{Math.round(maxAltitude / 100)}
            </span>
          </div>

          <div
            className={`space-y-3.5 p-3 rounded border transition-colors ${
              isDark ? 'bg-[#0e1526] border-[#1e293b]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="space-y-1.5">
              <div
                className={`flex justify-between text-[10px] font-mono ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <span>Floor Altitude</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                  {minAltitude.toLocaleString()} FT
                </span>
              </div>
              <input
                type="range"
                min="25000"
                max="35000"
                step="500"
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
                  isDark ? 'bg-[#1e293b] accent-sky-400' : 'bg-slate-200 accent-blue-600'
                }`}
                value={minAltitude}
                onChange={(e) => setMinAltitude(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <div
                className={`flex justify-between text-[10px] font-mono ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <span>Ceiling Altitude</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                  {maxAltitude.toLocaleString()} FT
                </span>
              </div>
              <input
                type="range"
                min="35000"
                max="40000"
                step="500"
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
                  isDark ? 'bg-[#1e293b] accent-sky-400' : 'bg-slate-200 accent-blue-600'
                }`}
                value={maxAltitude}
                onChange={(e) => setMaxAltitude(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Operational Footer */}
      <div
        className={`px-5 py-4 border-t transition-colors duration-200 ${
          isDark ? 'bg-[#0d1322] border-[#1e293b]' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div
          className={`flex items-center justify-between text-[10px] font-mono mb-3 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isDark ? 'bg-emerald-400' : 'bg-emerald-600'
              }`}
            ></span>
            OpenSky ADS-B
          </span>
          <MonoText
            className={`text-[10px] font-semibold ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            {utcTime}
          </MonoText>
        </div>
        <button
          onClick={refreshData}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono font-semibold rounded border transition-colors cursor-pointer ${
            isDark
              ? 'bg-[#162032] hover:bg-[#1e293b] border-[#334155]/70 text-slate-200'
              : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`w-3.5 h-3.5 ${isDark ? 'text-sky-400' : 'text-blue-600'}`}
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21v-5h5" />
          </svg>
          Sync Telemetry
        </button>
      </div>
    </aside>
  );
};
