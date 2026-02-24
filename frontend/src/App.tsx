import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useVisualizer } from './hooks/useVisualizer';
import { Home } from './pages/Home';
import { Downloader } from './pages/Downloader';
import { Dashboard } from './pages/Dashboard';
import Timeline from './pages/Timeline';
import './styles/GlobalStyles.css';

function App() {
  const logic = useVisualizer();

  return (
    <div className="app-main">
      <Routes>
        <Route path="/" element={<Home logic={logic} />} />
        <Route path="/downloader" element={<Downloader logic={logic} />} />
        <Route path="/dashboard" element={<Dashboard logic={logic} />} />
        <Route path="/timeline" element={
          <div style={{minHeight: '100vh', background: '#1a1a1a'}}>
            <Timeline />
          </div>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Globalny status */}
      {(logic.isProcessing || logic.isDownloading) && (
        <div className="status-toast-custom">
          <span className="spinner"></span>
          <span>{logic.status}</span>
        </div>
      )}
    </div>
  );
}

export default App;