import React, { useState, useEffect } from 'react';
import { LeftPanel } from './components/LeftPanel';
import { DataCanvas } from './components/DataCanvas';
import { TelemetryPanel } from './components/TelemetryPanel';
import { Flight } from './types';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [minAltitude, setMinAltitude] = useState(28000);
  const [maxAltitude, setMaxAltitude] = useState(38000);

  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/telemetry');
        if (response.ok) {
          const data: Flight[] = await response.json();
          setFlights(data);
          setIsError(false);
        } else {
          setIsError(true);
        }
      } catch (error) {
        console.error('Failed to fetch telemetry stream:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTelemetry();
    const intervalId = setInterval(fetchTelemetry, 10000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="grid grid-cols-[20%_60%_20%] w-full h-screen bg-slate-50 text-slate-900 overflow-hidden select-none">
      <LeftPanel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        minAltitude={minAltitude}
        setMinAltitude={setMinAltitude}
        maxAltitude={maxAltitude}
        setMaxAltitude={setMaxAltitude}
      />
      <DataCanvas 
        flights={flights} 
        selectedIcao={selectedIcao} 
        setSelectedIcao={setSelectedIcao} 
      />
      <TelemetryPanel
        searchQuery={searchQuery}
        selectedStatus={selectedStatus}
        minAltitude={minAltitude}
        maxAltitude={maxAltitude}
        flights={flights}
        isLoading={isLoading}
        isError={isError}
        selectedIcao={selectedIcao}
        setSelectedIcao={setSelectedIcao}
      />
    </div>
  );
};

export default App;
// Exporting default to match vite template expectations
