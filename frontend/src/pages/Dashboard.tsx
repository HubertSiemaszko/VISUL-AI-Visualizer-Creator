import React from "react";
import { useNavigate } from 'react-router-dom';
import { VisualizerLogic } from "../types/visualizer";

interface DashboardProps {
  logic: VisualizerLogic;
}

export const Dashboard = ({ logic }: DashboardProps) => {
  const navigate = useNavigate();

  const { result, downloadUrl } = logic;

  return (
    <div className="page-content">
      <button
        onClick={() => navigate('/')}
        className="back-button"
      >
        ← Nowy Projekt
      </button>

      <div className="hero-section">
        <div className="hero-icon success">✓</div>
        <h1 className="hero-title">Gotowe!</h1>
        <p className="hero-subtitle">Twój teledysk został pomyślnie stworzony</p>
      </div>

      {result && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{result.bpm}</div>
            <div className="stat-label">BPM</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{result.scenes_analyzed}</div>
            <div className="stat-label">Scen przeanalizowano</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{result.scenes_used}</div>
            <div className="stat-label">Najlepszych użyto</div>
          </div>
        </div>
      )}

      {downloadUrl && (
        <div className="download-section">
          <a
            href={downloadUrl}
            download
            className="btn btn-large btn-success"
          >
            ⬇️ Pobierz Gotowe Wideo
          </a>
        </div>
      )}
    </div>
  );
};