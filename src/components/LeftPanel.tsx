import React from 'react';

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
}) => {
  return (
    <aside className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6 text-blue-600"
        >
          <path d="M17.8 19.2 16 11l3.5-3.5A2.12 2.12 0 0 0 16.5 4L13 7.5l-8.2-1.8L3 7l7.5 4.5L7 15l-3-1L3 15l3.5 2.5L9 21l1-.5-1-3 4-3.5 4.5 7.5Z" />
        </svg>
        <div>
          <h1 className="text-[11px] font-bold tracking-tight text-slate-900 uppercase leading-tight">
            AeroGrid Aviation Intelligence Platform
          </h1>
          <p className="text-[9px] text-slate-500 font-medium tracking-wider uppercase mt-0.5">
            Telemetry Platform
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-4 py-4 border-b border-slate-200">
        <p className="px-2 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Systems
        </p>
        <nav className="space-y-1">
          <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50/70 border border-blue-200 rounded-sm transition-colors">
            <span className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4"
              >
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="15" rx="1" />
              </svg>
              Flight Operations
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          </button>

          <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent rounded-sm transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Airspace Control
          </button>

          <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent rounded-sm transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            Weather Overlays
          </button>
        </nav>
      </div>

      {/* Constraints & Filters */}
      <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">
        <div>
          <h3 className="mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Search Registry
          </h3>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-3.5 h-3.5 text-slate-400"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
              placeholder="e.g., IGO612, A320..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <h3 className="mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Telemetry Status
          </h3>
          <div className="grid grid-cols-2 gap-1">
            {['ALL', 'ACTIVE', 'WARNING', 'ERROR'].map((status) => {
              const isActive = selectedStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-2 py-1.5 text-[10px] font-semibold text-center border rounded-sm transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        {/* Altitude Range Filter */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Altitude Constraints
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              {minAltitude / 1000}k - {maxAltitude / 1000}k ft
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Min: {minAltitude.toLocaleString()} ft</span>
              </div>
              <input
                type="range"
                min="25000"
                max="35000"
                step="500"
                className="w-full h-1 bg-slate-100 rounded-sm appearance-none cursor-pointer accent-slate-800"
                value={minAltitude}
                onChange={(e) => setMinAltitude(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Max: {maxAltitude.toLocaleString()} ft</span>
              </div>
              <input
                type="range"
                min="35000"
                max="40000"
                step="500"
                className="w-full h-1 bg-slate-100 rounded-sm appearance-none cursor-pointer accent-slate-800"
                value={maxAltitude}
                onChange={(e) => setMaxAltitude(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Static Warnings Summary Removed */}
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-3">
          <span>OPERATOR: SEC-04</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SECURE
          </span>
        </div>
        <button
          onClick={refreshData}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21v-5h5" />
          </svg>
          Refresh Data
        </button>
      </div>
    </aside>
  );
};
