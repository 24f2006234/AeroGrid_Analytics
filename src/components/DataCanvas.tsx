import React from 'react';

export const DataCanvas: React.FC = () => {
  return (
    <main className="relative flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 z-10">
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Spatial Radar Vector Canvas
          </h2>
          <p className="text-[10px] text-slate-500 font-mono">
            SYS.LOC // AREA_NE_GRID_04 // 1920x1080_CORE
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>RADAR: ACTIVE</span>
          </div>
          <div>
            <span>LAT/LON TICKER: ENGAGED</span>
          </div>
        </div>
      </div>

      {/* Grid Canvas Wrapper */}
      <div className="relative flex-1 flex items-center justify-center p-8">
        {/* Tactical dot-grid background using SVG */}
        <div 
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `radial-gradient(circle, #475569 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Tactical Radar Circles & Crosshairs (completely flat, 1px solid borders, no gradients/shadows) */}
        <div className="absolute w-[600px] h-[600px] border border-slate-200 rounded-full flex items-center justify-center pointer-events-none">
          <div className="w-[400px] h-[400px] border border-slate-200 rounded-full flex items-center justify-center">
            <div className="w-[200px] h-[200px] border border-slate-200 rounded-full flex items-center justify-center">
              {/* Radar center crosshair */}
              <div className="w-4 h-4 relative">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-300"></div>
                <div className="absolute left-1/2 top-0 h-full w-[1px] bg-slate-300"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Absolute Outer Tactical Axes */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-200/60 pointer-events-none" />
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-slate-200/60 pointer-events-none" />

        {/* Future Canvas Placeholder Label */}
        <div className="relative z-10 flex flex-col items-center max-w-sm text-center p-6 bg-white border border-slate-200 rounded-sm">
          <span className="p-2 mb-3 bg-slate-100 border border-slate-200 rounded-sm text-slate-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2v20" />
              <path d="M2 12h20" />
            </svg>
          </span>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Primary Visual Container
          </h3>
          <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
            Reserved area for MapboxGL, Deck.gl, or HTML5 Canvas layers.
            All flight projections and spatial telemetry trajectories will project on this node.
          </p>
        </div>

        {/* Border Ticks & Labels (Tactical Aviation Feel) */}
        <div className="absolute top-2 left-6 text-[9px] font-mono text-slate-400">45° 00' N</div>
        <div className="absolute top-2 right-6 text-[9px] font-mono text-slate-400">90° 00' E</div>
        <div className="absolute bottom-2 left-6 text-[9px] font-mono text-slate-400">30° 00' N</div>
        <div className="absolute bottom-2 right-6 text-[9px] font-mono text-slate-400">75° 00' E</div>
      </div>
      
      {/* Bottom Coordinates Status Ticker */}
      <div className="flex justify-between items-center px-6 py-3 bg-white border-t border-slate-200 text-[10px] font-mono text-slate-500">
        <span>CURSOR: --.----° N / --.----° E</span>
        <span>MAG VAR: 0.2° W</span>
        <span>GRID REF: WGS-84</span>
      </div>
    </main>
  );
};
