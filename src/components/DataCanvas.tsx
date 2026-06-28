import React, { useEffect, useState, useRef } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { Flight } from '../types';

interface DataCanvasProps {
  flights: Flight[];
  selectedIcao: string | null;
  setSelectedIcao: (icao: string | null) => void;
  activeArc: any[];
}

// Generate textures outside component for WebGL performance (reuse)
const generatePlaneTexture = (color: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.beginPath();
    // Chevron pointing UP (0 radians)
    ctx.moveTo(32, 10);
    ctx.lineTo(50, 50);
    ctx.lineTo(32, 40);
    ctx.lineTo(14, 50);
    ctx.closePath();
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
};

const normalTexture = generatePlaneTexture('#3b82f6');
const selectedTexture = generatePlaneTexture('#10b981');
const errorTexture = generatePlaneTexture('#ef4444');
const warningTexture = generatePlaneTexture('#f59e0b');


export const DataCanvas: React.FC<DataCanvasProps> = ({ flights, selectedIcao, setSelectedIcao, activeArc }) => {
  const globeEl = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [countries, setCountries] = useState({ features: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Load GeoJSON for country boundaries
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(() => {}); // Removed console.error for clean logs
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

  const selectedFlight = flights.find(f => f.icao24 === selectedIcao);
  const dynamicArcs = selectedFlight && activeArc.length > 0 ? [{
    ...activeArc[0]
  }] : [];

  useEffect(() => {
    // Center globe on a viewpoint matching the backend airspace bounds (India)
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 21.0, lng: 82.0, altitude: 1.2 }, 1000);
    }
  }, []);

  return (
    <main className="relative flex flex-col h-full bg-slate-50 overflow-hidden select-none">
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
            
            customLayerData={flights}
            onCustomLayerClick={(obj: any) => setSelectedIcao(obj.icao24)}
            onObjectClick={(obj: any) => setSelectedIcao(obj.icao24)}
            customThreeObject={(d: any) => {
              const isSelected = d.icao24 === selectedIcao;
              const texture = isSelected ? selectedTexture : d.status === 'ERROR' ? errorTexture : d.status === 'WARNING' ? warningTexture : normalTexture;
              
              const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false });
              // Rotate based on heading (heading 0 = true north, we rotate canvas counter-clockwise)
              material.rotation = -d.heading * (Math.PI / 180);
              
              const sprite = new THREE.Sprite(material);
              const scale = isSelected ? 3.5 : 2.5;
              sprite.scale.set(scale, scale, 1);
              
              if (globeEl.current) {
                // Keep sprites near the surface to avoid visual parallax disconnection from surface arcs
                const coords = globeEl.current.getCoords(d.latitude, d.longitude, 0.01);
                sprite.position.set(coords.x, coords.y, coords.z);
              }
              return sprite;
            }}
            arcsData={dynamicArcs}
            arcColor={() => '#475569'}
            arcDashLength={0.05}
            arcDashGap={0.05}
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
