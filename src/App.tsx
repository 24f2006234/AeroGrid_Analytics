import React, { useState } from 'react';
import { LeftPanel } from './components/LeftPanel';
import { DataCanvas } from './components/DataCanvas';
import { TelemetryPanel } from './components/TelemetryPanel';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [minAltitude, setMinAltitude] = useState(28000);
  const [maxAltitude, setMaxAltitude] = useState(38000);

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
      <DataCanvas />
      <TelemetryPanel
        searchQuery={searchQuery}
        selectedStatus={selectedStatus}
        minAltitude={minAltitude}
        maxAltitude={maxAltitude}
      />
    </div>
  );
};

export default App;
// Exporting default to match vite template expectations
