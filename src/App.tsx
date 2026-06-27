import React, { useState } from 'react';
import { LeftPanel } from './components/LeftPanel';
import { DataCanvas } from './components/DataCanvas';
import { TelemetryPanel } from './components/TelemetryPanel';
import { useLiveTelemetry } from './hooks/useLiveTelemetry';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [minAltitude, setMinAltitude] = useState(28000);
  const [maxAltitude, setMaxAltitude] = useState(38000);

  const { flights, isLoading, isError, refreshData } = useLiveTelemetry();
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [activeArc, setActiveArc] = useState<any[]>([]);

  const filteredGlobeFlights = React.useMemo(() => {
    return flights.filter(
      (flight) => flight.altitude >= minAltitude && flight.altitude <= maxAltitude
    );
  }, [flights, minAltitude, maxAltitude]);

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
        refreshData={refreshData}
      />
      <DataCanvas 
        flights={filteredGlobeFlights} 
        selectedIcao={selectedIcao} 
        setSelectedIcao={setSelectedIcao}
        activeArc={activeArc}
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
        setActiveArc={setActiveArc}
      />
    </div>
  );
};

export default App;
// Exporting default to match vite template expectations
