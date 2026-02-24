import { useState, ChangeEvent } from "react";
import React from 'react';
import Timeline from './pages/Timeline'


const EDITOR_API_URL = 'http://localhost:8000';
const DOWNLOADER_API_URL = 'http://localhost:8001';

type Page = 'home' | 'dashboard' | 'downloader' | 'timeline';

function createMockFile(name: string): File {
    const file = new File([], name, { type: 'application/octet-stream' });
    (file as any).isMock = true;
    return file;
}

function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [ytLink, setYtLink] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleProcess = async () => {
    if (!videoFile || !audioFile) {
      alert("Wybierz oba pliki!");
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('audio', audioFile);

    setStatus("Przetwarzanie...");
    setIsProcessing(true);
    setDownloadUrl("");
    setResult(null);

    try {
      const response = await fetch(`${EDITOR_API_URL}/process`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Błąd serwera");
      }

      const data = await response.json();
      const downloadLink = `${EDITOR_API_URL}/download/${data.output_file}`;

      setDownloadUrl(downloadLink);
      setResult(data);
      setStatus("✓ Gotowe!");
      setCurrentPage('dashboard');

    } catch (err) {
      setStatus("Błąd: " + (err instanceof Error ? err.message : String(err)));
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadYT = async () => {
    if (!ytLink) {
        alert("Wklej link do wideo z YouTube!");
        return;
    }

    setIsDownloading(true);
    setStatus("Pobieranie wideo z YouTube...");

    const linkToSend = ytLink;
    setYtLink('');

    try {
        const response = await fetch(`${DOWNLOADER_API_URL}/download_yt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link: linkToSend })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Błąd serwera podczas pobierania YT");
        }

        const data = await response.json();
        const downloadedVideo = createMockFile(data.video_path);
        const downloadedAudio = createMockFile(data.audio_path);

        setVideoFile(downloadedVideo);
        setAudioFile(downloadedAudio);
        setStatus(`Pobrano! Pliki: ${data.video_path}, ${data.audio_path}. Przejdź do edycji.`);
        setCurrentPage('home');

    } catch (err) {
        setStatus("Błąd pobierania YT: " + (err instanceof Error ? err.message : String(err)));
        console.error(err);
    } finally {
        setIsDownloading(false);
    }
  };

  const renderHome = () => (
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
              onClick={() => setCurrentPage('downloader')}
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
            onClick={handleProcess}
            disabled={isProcessing || !videoFile || !audioFile}
            className="btn btn-primary"
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              <>⚡ Create Visualizer</>
            )}
          </button>

          <button
            onClick={() => setCurrentPage('timeline')}
            className="btn btn-secondary"
          >
            🎞️ Timeline Editor
          </button>
        </div>

        <div className="divider">
          <span>lub</span>
        </div>

        <button
          onClick={() => setCurrentPage('downloader')}
          className="btn btn-outline"
        >
          ⬇️ Download from YouTube
        </button>
      </div>


    </div>
  );

  const renderDownloader = () => (
    <div className="page-content">
      <button
        onClick={() => { setCurrentPage('home'); setStatus(''); }}
        className="back-button"
      >
        ← Back
      </button>

      <div className="hero-section">
        <div className="hero-icon">📥</div>
        <h1 className="hero-title">Download from YouTube</h1>
        <p className="hero-subtitle">
            Paste the video link and we will download the video and audio in the highest quality
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
              '⬇️ Download'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="page-content">
      <button
        onClick={() => setCurrentPage('home')}
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

  const renderTimeline = () => (
    <div style={{minHeight: '100vh', background: '#1a1a1a'}}>
      <div style={{padding: '20px', borderBottom: '1px solid #333'}}>
        <button onClick={() => setCurrentPage('home')} className="back-button">
          ← Back to Menu
        </button>
      </div>
      <Timeline />
    </div>
  );

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return renderDashboard();
      case 'downloader': return renderDownloader();
      case 'timeline': return renderTimeline();
      case 'home':
      default: return renderHome();
    }
  };

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(#B961D4, #58CCC6 50%, #13EB13 100%);
          min-height: 100vh;
          color: #333;
        }

        .page-content {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .hero-section {
          text-align: center;
          margin-bottom: 60px;
        }

        .hero-icon {
          font-size: 80px;
          margin-bottom: 20px;
          animation: float 3s ease-in-out infinite;
        }

        .hero-icon.success {
          color: #10b981;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .hero-title {
          font-size: 48px;
          font-weight: 800;
          color: white;
          margin-bottom: 15px;
          text-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .hero-subtitle {
          font-size: 23px;
          color: rgba(255,255,255,0.9);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .upload-section {
          background: white;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          margin-bottom: 40px;
        }

        .section-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 30px;
          text-align: center;
          color: #1a1a1a;
        }

        .files-selected {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 16px;
          padding: 30px;
          margin-bottom: 30px;
          color: white;
        }

        .success-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .file-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.1);
          padding: 12px 16px;
          border-radius: 12px;
        }

        .file-icon {
          font-size: 24px;
        }

        .file-name {
          font-size: 14px;
          font-weight: 500;
        }

        .file-note {
          margin-top: 15px;
          font-size: 13px;
          opacity: 0.9;
        }

        .upload-hint {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
          font-size: 16px;
        }

        .link-button {
          color: #667eea;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          transition: color 0.2s;
        }

        .link-button:hover {
          color: #764ba2;
        }

        .upload-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .upload-box {
          position: relative;
        }

        .upload-label {
          display: block;
          cursor: pointer;
        }

        .file-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .upload-content {
          border: 2px dashed #d1d5db;
          border-radius: 16px;
          padding: 30px 20px;
          text-align: center;
          transition: all 0.3s;
          background: #f9fafb;
        }

        .upload-content:hover {
          border-color: #667eea;
          background: #f3f4ff;
          transform: translateY(-2px);
        }

        .upload-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .upload-text {
          font-size: 14px;
          color: #374151;
          margin-bottom: 12px;
          font-weight: 500;
        }

        .upload-button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: background 0.2s;
        }

        .upload-button:hover {
          background: #5568d3;
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          margin-bottom: 30px;
        }

        .btn {
          flex: 1;
          padding: 16px 32px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }

        .btn-secondary {
          background: #10b981;
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
        }

        .btn-outline {
          background: transparent;
          color: #667eea;
          border: 2px solid #667eea;
          width: 100%;
        }

        .btn-outline:hover {
          background: #667eea;
          color: white;
        }

        .btn-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .btn-large {
          padding: 20px 48px;
          font-size: 18px;
        }

        .divider {
          text-align: center;
          margin: 30px 0;
          position: relative;
        }

        .divider::before,
        .divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 45%;
          height: 1px;
          background: #e5e7eb;
        }

        .divider::before { left: 0; }
        .divider::after { right: 0; }

        .divider span {
          background: white;
          padding: 0 15px;
          color: #9ca3af;
          font-size: 14px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .feature-card {
          background: rgba(255,255,255,0.95);
          border-radius: 16px;
          padding: 30px 20px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: transform 0.3s;
        }

        .feature-card:hover {
          transform: translateY(-5px);
        }

        .feature-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .feature-card h3 {
          font-size: 18px;
          margin-bottom: 8px;
          color: #1a1a1a;
        }

        .feature-card p {
          font-size: 14px;
          color: #666;
        }

        .back-button {
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 30px;
          transition: background 0.2s;
        }

        .back-button:hover {
          background: rgba(255,255,255,0.3);
        }

        .downloader-section {
          background: white;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .input-group {
          display: flex;
          gap: 15px;
        }

        .yt-input {
          flex: 1;
          padding: 16px 20px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .yt-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .stat-value {
          font-size: 48px;
          font-weight: 800;
          color: #667eea;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .download-section {
          text-align: center;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .upload-grid,
          .features-grid,
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }

          .input-group {
            flex-direction: column;
          }

          .hero-title {
            font-size: 36px;
          }
        }
      `}</style>

      <div style={{minHeight: '100vh'}}>
        {renderPage()}
      </div>

      {(isProcessing || isDownloading) && currentPage !== 'timeline' && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: 'white',
          padding: '20px 30px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span className="spinner"></span>
          <span style={{fontWeight: 600, color: '#333'}}>{status}</span>
        </div>
      )}
    </>
  );
}

export default App;