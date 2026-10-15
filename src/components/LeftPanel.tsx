import React, { useState, useEffect } from 'react';
import { Flight } from '../types';
import { MonoText } from './MonoText';

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
  const cruisingCount = flights.filter(f => f.altitude >= 30000).length;
  const climbingCount = flights.filter(f => f.verticalRate > 0.5).length;
  const descendingCount = flights.filter(f => f.verticalRate < -0.5).length;

  return (
    <aside className="flex flex-col h-full bg-[#0b0f19] border-r border-[#1e293b] text-slate-200 select-none">
      {/* Brand & Airspace Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b] bg-[#0d1322]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-[#1e293b]/70 border border-[#334155]/60 text-sky-400">
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
              <span className="text-xs font-bold tracking-wider text-slate-100 uppercase">
                AEROGRID
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-medium rounded bg-sky-950/80 text-sky-300 border border-sky-800/60">
                OPS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide mt-0.5">
              Air Traffic Surveillance
            </p>
          </div>
        </div>
      </div>

      {/* Airspace Summary Metrics */}
      <div className="px-5 py-3.5 border-b border-[#1e293b] bg-[#0e1526]/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Sector Surveillance
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ACTIVE
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="px-2.5 py-2 rounded bg-[#131b2e] border border-[#1e293b]">
            <p className="text-[9px] font-mono text-slate-400 uppercase">Tracked</p>
            <MonoText className="text-sm font-semibold text-slate-100">{totalTracked}</MonoText>
          </div>
          <div className="px-2.5 py-2 rounded bg-[#131b2e] border border-[#1e293b]">
            <p className="text-[9px] font-mono text-slate-400 uppercase">Cruising</p>
            <MonoText className="text-sm font-semibold text-sky-400">{cruisingCount}</MonoText>
          </div>
          <div className="px-2.5 py-2 rounded bg-[#131b2e] border border-[#1e293b]">
            <p className="text-[9px] font-mono text-slate-400 uppercase">Transitions</p>
            <MonoText className="text-sm font-semibold text-slate-200">
              {climbingCount + descendingCount}
            </MonoText>
          </div>
        </div>
      </div>

      {/* Controls & Filter Panel */}
      <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
        {/* Search Input */}
        <div>
          <label className="block mb-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Flight Search
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
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
              className="w-full pl-9 pr-8 py-2 text-xs bg-[#111827] border border-[#1e293b] rounded text-slate-100 placeholder:text-slate-500 font-mono focus:outline-none focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/30 transition-colors"
              placeholder="Callsign or ICAO24..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Status Filter */}
        <div>
          <label className="block mb-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Status Filter
          </label>
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#0e1526] border border-[#1e293b] rounded">
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
                  className={`py-1.5 text-[10px] font-mono font-semibold rounded text-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#162032]'
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
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Altitude Filter
            </label>
            <span className="text-[10px] font-mono text-sky-400 font-semibold">
              FL{Math.round(minAltitude / 100)} - FL{Math.round(maxAltitude / 100)}
            </span>
          </div>

          <div className="space-y-3.5 p-3 rounded bg-[#0e1526] border border-[#1e293b]">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Floor Altitude</span>
                <span className="text-slate-200">{minAltitude.toLocaleString()} FT</span>
              </div>
              <input
                type="range"
                min="25000"
                max="35000"
                step="500"
                className="w-full h-1.5 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-sky-400"
                value={minAltitude}
                onChange={(e) => setMinAltitude(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Ceiling Altitude</span>
                <span className="text-slate-200">{maxAltitude.toLocaleString()} FT</span>
              </div>
              <input
                type="range"
                min="35000"
                max="40000"
                step="500"
                className="w-full h-1.5 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-sky-400"
                value={maxAltitude}
                onChange={(e) => setMaxAltitude(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Operational Footer */}
      <div className="px-5 py-4 border-t border-[#1e293b] bg-[#0d1322]">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            OpenSky ADS-B
          </span>
          <MonoText className="text-[10px] text-slate-300 font-semibold">{utcTime}</MonoText>
        </div>
        <button
          onClick={refreshData}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono font-semibold text-slate-200 bg-[#162032] hover:bg-[#1e293b] border border-[#334155]/70 rounded transition-colors cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-3.5 h-3.5 text-sky-400"
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
