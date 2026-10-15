import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { Flight } from '../types';
import { useTheme } from '../context/ThemeContext';

interface DataCanvasProps {
  flights: Flight[];
  selectedIcao: string | null;
  setSelectedIcao: (icao: string | null) => void;
  activeArc: any[];
}

// Generate textures outside component for WebGL performance (reuse)
const generatePlaneTexture = (color: string, isSelected = false, isDark = true) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64);

    // Draw subtle outer halo for selected target
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, 2 * Math.PI);
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(37, 99, 235, 0.3)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Modern aviation directional chevron
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.lineTo(52, 52);
    ctx.lineTo(32, 42);
    ctx.lineTo(12, 52);
    ctx.closePath();
    ctx.fill();

    // Crisp contrast edge
    ctx.strokeStyle = isSelected ? '#ffffff' : isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
};

const textures = {
  dark: {
    normal: generatePlaneTexture('#38bdf8', false, true),
    selected: generatePlaneTexture('#10b981', true, true),
    error: generatePlaneTexture('#ef4444', false, true),
    warning: generatePlaneTexture('#f59e0b', false, true),
  },
  light: {
    normal: generatePlaneTexture('#2563eb', false, false),
    selected: generatePlaneTexture('#059669', true, false),
    error: generatePlaneTexture('#dc2626', false, false),
    warning: generatePlaneTexture('#d97706', false, false),
  },
};

export const DataCanvas: React.FC<DataCanvasProps> = ({
  flights,
  selectedIcao,
  setSelectedIcao,
  activeArc,
}) => {
  const { isDark } = useTheme();
  const globeEl = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [countries, setCountries] = useState({ features: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const hasCenteredInitially = useRef(false);

  // Center camera on Indian Airspace (VIDF/VOMF/VECF/VABF sector)
  const centerAirspace = useCallback(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 21.5, lng: 79.5, altitude: 1.6 }, 800);
    }
  }, []);

  useEffect(() => {
    // Load GeoJSON for country boundaries
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then((res) => res.json())
      .then((data) => setCountries(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Setup ResizeObserver for responsive globe container sizing
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Ensure globe centers on Indian airspace once dimensions and canvas are mounted
  useEffect(() => {
    if (dimensions.width > 0 && !hasCenteredInitially.current && globeEl.current) {
      hasCenteredInitially.current = true;
      setTimeout(() => {
        centerAirspace();
      }, 200);
    }
  }, [dimensions.width, centerAirspace]);

  const selectedFlight = flights.find((f) => f.icao24 === selectedIcao);
  const dynamicArcs =
    selectedFlight && activeArc.length > 0
      ? [
          {
            ...activeArc[0],
          },
        ]
      : [];

  const globeMaterial = useMemo(() => {
    if (isDark) {
      return new THREE.MeshLambertMaterial({
        color: '#0a0f1d',
        emissive: '#050811',
        emissiveIntensity: 0.1,
      });
    } else {
      return new THREE.MeshLambertMaterial({
        color: '#cbd5e1',
        emissive: '#e2e8f0',
        emissiveIntensity: 0.15,
      });
    }
  }, [isDark]);

  const activeTextures = isDark ? textures.dark : textures.light;

  return (
    <main
      className={`relative flex flex-col h-full overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-[#070b12]' : 'bg-[#f1f5f9]'
      }`}
    >
      {/* Top Tactical Airspace Header */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 backdrop-blur-md border-b z-10 transition-colors duration-200 ${
          isDark
            ? 'bg-[#0b0f19]/80 border-[#1e293b]/70'
            : 'bg-white/85 border-slate-200/80 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isDark ? 'bg-sky-400' : 'bg-blue-600'
              }`}
            ></span>
            <span
              className={`text-xs font-mono font-bold tracking-wider uppercase ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              Sector: IND-FIR
            </span>
          </div>
          <span
            className={`text-[10px] font-mono hidden sm:inline ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            (DELHI / MUMBAI / KOLKATA / CHENNAI)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] font-mono ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            RADAR:{' '}
            <span
              className={`font-semibold ${
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            >
              SWEEP ACTIVE
            </span>
          </span>
          <button
            onClick={centerAirspace}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-200 bg-[#131b2e] hover:bg-[#1e293b] border-[#334155]'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-xs'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`w-3 h-3 ${isDark ? 'text-sky-400' : 'text-blue-600'}`}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="22" y1="12" x2="18" y2="12" />
              <line x1="6" y1="12" x2="2" y2="12" />
              <line x1="12" y1="6" x2="12" y2="2" />
              <line x1="12" y1="22" x2="12" y2="18" />
            </svg>
            Reset View
          </button>
        </div>
      </div>

      {/* 3D Globe Canvas */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        {dimensions.width > 0 && (
          <Globe
            ref={globeEl}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor={isDark ? '#070b12' : '#f1f5f9'}
            showAtmosphere={true}
            atmosphereColor={isDark ? '#0284c7' : '#93c5fd'}
            atmosphereAltitude={isDark ? 0.18 : 0.12}
            globeMaterial={globeMaterial}
            polygonsData={countries.features}
            polygonAltitude={0.005}
            polygonCapColor={() => (isDark ? '#111a2e' : '#ffffff')}
            polygonSideColor={() => (isDark ? '#0a0f1d' : '#cbd5e1')}
            polygonStrokeColor={() => (isDark ? '#1e293b' : '#94a3b8')}
            customLayerData={flights}
            onCustomLayerClick={(obj: any) => setSelectedIcao(obj.icao24)}
            onObjectClick={(obj: any) => setSelectedIcao(obj.icao24)}
            customThreeObject={(d: any) => {
              const isSelected = d.icao24 === selectedIcao;
              const texture = isSelected
                ? activeTextures.selected
                : d.status === 'ERROR'
                ? activeTextures.error
                : d.status === 'WARNING'
                ? activeTextures.warning
                : activeTextures.normal;

              const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false });
              material.rotation = -d.heading * (Math.PI / 180);

              const sprite = new THREE.Sprite(material);
              const scale = isSelected ? 3.6 : 2.4;
              sprite.scale.set(scale, scale, 1);

              if (globeEl.current) {
                const coords = globeEl.current.getCoords(d.latitude, d.longitude, 0.015);
                sprite.position.set(coords.x, coords.y, coords.z);
              }
              return sprite;
            }}
            arcsData={dynamicArcs}
            arcColor={() => (isDark ? '#38bdf8' : '#2563eb')}
            arcAltitude={0.12}
            arcDashLength={0.05}
            arcDashGap={0.03}
            arcDashAnimateTime={2500}
          />
        )}
      </div>

      {/* Bottom Tactical Status Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex justify-between items-center px-5 py-2.5 backdrop-blur-md border-t text-[10px] font-mono z-10 transition-colors duration-200 ${
          isDark
            ? 'bg-[#0b0f19]/80 border-[#1e293b]/70 text-slate-400'
            : 'bg-white/85 border-slate-200/80 text-slate-600 shadow-xs'
        }`}
      >
        <span>Controls: Click target to inspect • Drag to rotate • Scroll to zoom</span>
        <span>
          Surveillance Targets:{' '}
          <span
            className={`font-semibold ${
              isDark ? 'text-sky-400' : 'text-blue-600'
            }`}
          >
            {flights.length}
          </span>
        </span>
      </div>
    </main>
  );
};
