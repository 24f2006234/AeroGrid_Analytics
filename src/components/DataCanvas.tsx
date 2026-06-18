import React, { useEffect, useState, useRef } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { Flight } from '../types';

interface DataCanvasProps {
  flights: Flight[];
  selectedIcao: string | null;
  setSelectedIcao: (icao: string | null) => void;
}

export const DataCanvas: React.FC<DataCanvasProps> = ({ flights, selectedIcao, setSelectedIcao }) => {
  const globeEl = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [countries, setCountries] = useState({ features: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Load GeoJSON for country boundaries
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error('Error loading country polygons:', err));
  }, []);

  useEffect(() => {
    // Setup ResizeObserver for responsive globe container sizing
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Center globe on a viewpoint matching the backend airspace bounds (India)
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 21.0, lng: 82.0, altitude: 1.2 }, 1000);
    }
  }, []);

  return (
    <main className="relative flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Top Banner (Overlay) */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
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
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span>RADAR: ACTIVE</span>
          </div>
          <div>
            <span>LAT/LON TICKER: ENGAGED</span>
          </div>
        </div>
      </div>

      {/* Globe Canvas */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        {dimensions.width > 0 && (
          <Globe
            ref={globeEl}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere={true}
            atmosphereColor="#cbd5e1"
            atmosphereAltitude={0.15}
            globeMaterial={new THREE.MeshLambertMaterial({ 
              color: '#f8fafc',
              emissive: '#e2e8f0',
              emissiveIntensity: 0.2
            })}
            polygonsData={countries.features}
            polygonAltitude={0.005}
            polygonCapColor={() => '#ffffff'}
            polygonSideColor={() => '#f1f5f9'}
            polygonStrokeColor={() => '#cbd5e1'}
            
            objectsData={flights}
            objectLat="latitude"
            objectLng="longitude"
            objectAltitude={(d: any) => Math.max(0.01, d.altitude / 200000)}
            onObjectClick={(obj: any) => setSelectedIcao(obj.icao24)}
            objectThreeObject={(d: any) => {
              const isSelected = d.icao24 === selectedIcao;
              const color = isSelected ? '#10b981' : d.status === 'ERROR' ? '#ef4444' : d.status === 'WARNING' ? '#f59e0b' : '#3b82f6';
              const scale = isSelected ? 1.5 : 1;
              return new THREE.Mesh(
                new THREE.SphereGeometry(0.4 * scale, 16, 16),
                new THREE.MeshLambertMaterial({ color })
              );
            }}
          />
        )}
      </div>

      {/* Bottom Coordinates Status Ticker (Overlay) */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-6 py-3 bg-white/80 backdrop-blur-sm border-t border-slate-200 text-[10px] font-mono text-slate-500 z-10">
        <span>INTERACTIVE: DRAG TO ROTATE, SCROLL TO ZOOM</span>
        <span>MAG VAR: 0.2° W</span>
        <span>GRID REF: WGS-84</span>
      </div>
    </main>
  );
};
