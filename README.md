# VISUL - AI Music Visualizer Creator

**VISUL** is an advanced, full-stack web application that automatically generates professional music visualizers. It acts as an AI director and editor—detecting audio beats, evaluating video scenes using neural networks, and dynamically assembling the best shots to match the rhythm. 

Beyond automation, VISUL features a **custom-built, fully interactive React Timeline Editor**, giving creators ultimate artistic control over the AI-generated timeline.

## Features

### AI & Automated Processing
* **Smart Audio Beat Tracking:** Uses deep learning (`madmom` RNN) to accurately detect BPM and musical tacts.
* **Cinematic Scene Detection:** Automatically splits raw video files into distinct scenes using `scenedetect`.
* **Aesthetic Scoring (OpenAI CLIP):** Acts as a virtual director. It uses PyTorch and the CLIP model to score scenes based on text prompts (e.g., keeping "dynamic energetic shots" and discarding "boring static frames").
* **Smart Cropping & Formatting:** Automatically detects and removes black bars (letterboxing) and scales output to standard 16:9 (1080p).
* **Top-K Shuffle Assembly:** Intelligently randomizes and sequences the best scenes to prevent repetitive edits, ensuring every visualizer is unique.

### Custom Timeline Editor
* **Built from Scratch:** A highly performant, custom-built timeline in React.
* **Drag & Drop:** Move clips freely across multiple video and audio tracks.
* **Magnetic Snapping:** Seamlessly snap clips together or to the playhead without leaving black frames (`SNAP_THRESHOLD`).
* **Advanced Cutting Tool:** Split clips anywhere. Linked audio and video tracks are automatically cut and synced together.
* **Real-time Preview:** Highly optimized playback using `requestAnimationFrame` to keep the HTML5 `<video>` and `<audio>` elements perfectly synced with the timeline playhead.
* **Zoom & Scale:** Smooth timeline zooming using the mouse wheel for precision editing.

### Built-in YouTube Downloader
* **Direct Integration:** Paste any YouTube link directly into the app.
* **Highest Quality Extraction:** Automatically fetches and merges the best available video (H.264/MP4) and audio streams using `yt-dlp`.

## Tech Stack

**Frontend:**
* React 18 & TypeScript
* React Router DOM

**Backend:**
* Python & FastAPI
* Uvicorn (Asynchronous server)

**AI & Media Processing:**
* **PyTorch & OpenAI CLIP** (Zero-shot image classification/scoring)
* **Madmom** (Recurrent Neural Networks for beat detection)
* **Scenedetect** (Content-aware scene boundary detection)
* **MoviePy & FFmpeg** (Video rendering, trimming, and composition)

## How It Works (Pipeline)

1. **Upload / Fetch:** User provides a video and an audio track (locally or downloaded from YouTube).
2. **Analysis:** The backend tracks the audio BPM and cuts the video into raw scenes.
3. **AI Curation:** CLIP model analyzes frames from each scene, calculating an aesthetic score. Dark or static clips are filtered out.
4. **Assembly:** The highest-scoring clips are trimmed to match the beat length and concatenated.
5. **Timeline Generation:** The backend generates an MP4 preview and a `timeline_data.json` file.
6. **Manual Polish:** The user opens the **Timeline Editor** to visually adjust cuts, swap clips, and perfect the sync before final export.

## Current Status: Work in Progress

VISUL is currently in active development. My main focus right now is heavily refining and expanding the custom **Timeline Editor** to ensure a smooth, bug-free, and professional-grade editing experience directly in the browser. 

*Please note: The application is currently being developed locally and is **not yet hosted online**.*