import React, { ChangeEvent } from "react";
import { useNavigate } from 'react-router-dom';
import { VisualizerLogic } from "../types/visualizer";

interface HomeProps {
  logic: VisualizerLogic;
}

export const Home = ({ logic }: HomeProps) => {
  const navigate = useNavigate();

  const {
    videoFile,
    audioFile,
    setVideoFile,
    setAudioFile,
    isProcessing,
    handleProcess
  } = logic;

  const onCreateVisualizer = async () => {
    await handleProcess();
  };

  return (
    <div className="page-content">
      <div className="hero-section">
        <div className="hero-icon">🎬</div>
        <h1 className="hero-title">VISUL</h1>
        <p className="hero-subtitle">
            Create professional visualizers - choose video and audio, let us do the rest.
        </p>
      </div>

      <div className="upload-section">
        <h2 className="section-title">Choose Files</h2>

        {(videoFile && audioFile) ? (
          <div className="files-selected">
            <div className="success-badge">✓ Files chosen</div>
            <div className="file-info">
              <div className="file-item">
                <span className="file-icon">🎥</span>
                <span className="file-name">{videoFile.name}</span>
              </div>
              <div className="file-item">
                <span className="file-icon">🎵</span>
                <span className="file-name">{audioFile.name}</span>
              </div>
            </div>
            {(videoFile as any).isMock && (
              <p className="file-note">
                The files have been downloaded from YouTube and are ready for processing
              </p>
            )}
          </div>
        ) : (
          <p className="upload-hint">
            Select files locally or{' '}
            <span
              onClick={() => navigate('/downloader')}
              className="link-button"
            >
              download from YouTube
            </span>
          </p>
        )}

        <div className="upload-grid">
          <div className="upload-box">
            <label className="upload-label">
              <input
                type="file"
                accept="video/*"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setVideoFile(e.target.files?.[0] || null)}
                disabled={isProcessing}
                className="file-input"
              />
              <div className="upload-content">
                <div className="upload-icon">📹</div>
                <div className="upload-text">
                  {videoFile ? videoFile.name : 'Choose Video'}
                </div>
                <div className="upload-button">Browse</div>
              </div>
            </label>
          </div>

          <div className="upload-box">
            <label className="upload-label">
              <input
                type="file"
                accept="audio/*"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAudioFile(e.target.files?.[0] || null)}
                disabled={isProcessing}
                className="file-input"
              />
              <div className="upload-content">
                <div className="upload-icon">🎵</div>
                <div className="upload-text">
                  {audioFile ? audioFile.name : 'Choose Audio'}
                </div>
                <div className="upload-button">Browse</div>
              </div>
            </label>
          </div>
        </div>

        <div className="action-buttons">
          <button
            onClick={onCreateVisualizer}
            disabled={isProcessing || !videoFile || !audioFile}
            className="btn btn-primary"
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              <>Create Visualizer</>
            )}
          </button>

          {isProcessing && (
            <p className="processing-hint" style={{
              marginTop: '12px',
              color: '#666',
              fontSize: '0.9rem',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              It should take up to 5 minutes.
            </p>
          )}


          <button
            onClick={() => navigate('/timeline')}
            className="btn btn-secondary"
            style={{ marginTop: isProcessing ? '8px' : '0' }}
          >
            Timeline Editor
          </button>
        </div>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          onClick={() => navigate('/downloader')}
          className="btn btn-outline"
        >
          ⬇️ Download from YouTube
        </button>
      </div>
    </div>
  );
};