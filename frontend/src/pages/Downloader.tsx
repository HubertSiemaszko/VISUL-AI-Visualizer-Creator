import React from "react";
import { useNavigate } from 'react-router-dom';
import { VisualizerLogic } from "../types/visualizer";

interface DownloaderProps {
  logic: VisualizerLogic;
}

export const Downloader = ({ logic }: DownloaderProps) => {
  const navigate = useNavigate();

  const {
    setStatus,
    ytLink,
    setYtLink,
    isDownloading,
    handleDownloadYT
  } = logic;

  const handleBack = () => {
    setStatus("");
    navigate('/');
  };

  return (
    <div className="page-content">
      <button
        onClick={handleBack}
        className="back-button"
      >
        ← Back
      </button>

      <div className="hero-section">
        <h1 className="hero-title">Download from YouTube</h1>
        <p className="hero-subtitle">
          Paste the video link and we will download the video and audio in the
          highest quality
        </p>
      </div>

      <div className="downloader-section">
        <div className="input-group">
          <input
            type="text"
            placeholder="https://youtube.com/watch?v=..."
            value={ytLink}
            onChange={(e) => setYtLink(e.target.value)}
            disabled={isDownloading}
            className="yt-input"
          />
          <button
            onClick={handleDownloadYT}
            disabled={isDownloading || !ytLink}
            className="btn btn-primary"
          >
            {isDownloading ? (
              <>
                <span className="spinner"></span>
                Downloading...
              </>
            ) : (
              "⬇️ Download"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};