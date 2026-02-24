import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Importujemy nawigację
import { VisualizerResult, VisualizerLogic } from "../types/visualizer";

const EDITOR_API_URL = 'http://localhost:8000';
const DOWNLOADER_API_URL = 'http://localhost:8001';

function createMockFile(name: string): File {
    const file = new File([], name, { type: 'application/octet-stream' });
    (file as any).isMock = true;
    return file;
}

export const useVisualizer = (): VisualizerLogic => {
  const navigate = useNavigate();

  // --- STANY APLIKACJI ---
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<VisualizerResult | null>(null);
  const [ytLink, setYtLink] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // --- LOGIKA PRZETWARZANIA (EDITOR) ---
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

      if (!response.ok) throw new Error("Błąd serwera podczas przetwarzania");

      const data = await response.json();

      setDownloadUrl(`${EDITOR_API_URL}/download/${data.output_file}`);
      setResult(data);
      setStatus("✓ Gotowe!");

      navigate('/dashboard');

    } catch (err) {
      setStatus("Błąd: " + (err instanceof Error ? err.message : String(err)));
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- LOGIKA POBIERANIA (YOUTUBE) ---
  const handleDownloadYT = async () => {
    if (!ytLink) {
        alert("Wklej link do YouTube!");
        return;
    }

    setIsDownloading(true);
    setStatus("Pobieranie z YouTube...");

    try {
        const response = await fetch(`${DOWNLOADER_API_URL}/download_yt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link: ytLink })
        });

        if (!response.ok) throw new Error("Błąd pobierania z YouTube");

        const data = await response.json();

        setVideoFile(createMockFile(data.video_path));
        setAudioFile(createMockFile(data.audio_path));

        setStatus(`Pobrano pomyślnie!`);
        setYtLink('');

        navigate('/');

    } catch (err) {
        setStatus("Błąd YT: " + (err instanceof Error ? err.message : String(err)));
        console.error(err);
    } finally {
        setIsDownloading(false);
    }
  };

  return {
    videoFile,
    setVideoFile,
    audioFile,
    setAudioFile,
    status,
    setStatus,
    downloadUrl,
    isProcessing,
    result,
    ytLink,
    setYtLink,
    isDownloading,
    handleProcess,
    handleDownloadYT
  };
};