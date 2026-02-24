import os
import shutil
import json
import numpy as np
import torch
import clip as clip_lib
import random
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector
from moviepy.editor import VideoFileClip, concatenate_videoclips, AudioFileClip
from madmom.features.beats import RNNBeatProcessor, DBNBeatTrackingProcessor

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Foldery do przechowywania plików
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
MEDIA_DIR = "media"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MEDIA_DIR, exist_ok=True)

ffmpeg_path = r"C:\Users\huber\PycharmProjects\PythonProject2\ffmpeg-7.1.1-essentials_build\bin"
os.environ["PATH"] += os.pathsep + ffmpeg_path

# CLIP Model
print("Ładowanie modelu CLIP...")
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model, preprocess = clip_lib.load("ViT-B/32", device=device)
print(f"CLIP załadowany na: {device}")


# ---------- FUNKCJE POMOCNICZE ----------
def score_scene_with_clip(video_clip, debug=False):
    """Ocenia klip - im wyższy score, tym lepszy"""
    try:
        frames_to_check = [
            video_clip.get_frame(0.1),
            video_clip.get_frame(video_clip.duration / 2),
            video_clip.get_frame(video_clip.duration - 0.1)
        ]

        positive_prompts = [
            "dynamic energetic music video scene",
            "visually interesting cinematic shot",
            "vibrant scene",
            "professional music video footage",
            "high quality creative visual"
        ]

        negative_prompts = [
            "boring static scene",
            "blurry low quality footage",
            "dark unclear image",
            "empty blank frame"
        ]

        all_prompts = positive_prompts + negative_prompts
        text_inputs = torch.cat([clip_lib.tokenize(p) for p in all_prompts]).to(device)

        scores = []
        for frame in frames_to_check:
            image = Image.fromarray(frame.astype('uint8'))
            image_input = preprocess(image).unsqueeze(0).to(device)

            with torch.no_grad():
                image_features = clip_model.encode_image(image_input)
                text_features = clip_model.encode_text(text_inputs)
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                similarity = (image_features @ text_features.T).squeeze(0)

            pos_similarities = similarity[:len(positive_prompts)]
            neg_similarities = similarity[len(positive_prompts):]
            frame_score = pos_similarities.mean().item() - neg_similarities.mean().item()
            scores.append(frame_score)

        return np.mean(scores)
    except Exception as e:
        print(f"Błąd podczas oceny: {e}")
        return 0


def round_down_to_takt(length, takt_length):
    return takt_length * int(length // takt_length)


def is_too_dark(clip, threshold=20):
    frame = clip.get_frame(0)
    avg_brightness = np.mean(frame)
    return avg_brightness < threshold


def is_static_clip(clip, threshold=5.0):
    frame1 = clip.get_frame(0)
    frame2 = clip.get_frame(min(1.0, clip.duration - 0.1))
    diff = np.abs(frame2.astype(float) - frame1.astype(float))
    avg_diff = np.mean(diff)
    return avg_diff < threshold


def detect_and_crop_letterbox(clip, threshold=20):
    """Automatycznie wykrywa i ucina czarne paski z góry/dołu"""
    frame = clip.get_frame(clip.duration / 2)

    top = 0
    for y in range(frame.shape[0]):
        if np.mean(frame[y]) > threshold:
            top = y
            break

    bottom = frame.shape[0]
    for y in range(frame.shape[0] - 1, -1, -1):
        if np.mean(frame[y]) > threshold:
            bottom = y + 1
            break

    new_height = bottom - top
    if new_height < frame.shape[0] * 0.9:
        print(f"Wykryto czarne paski: {top}px u góry, {frame.shape[0] - bottom}px u dołu")
        return clip.crop(y1=top, y2=bottom)
    return clip


@app.get("/")
def read_root():
    return {"message": "Video Editor API is running!", "device": device}


@app.get("/video/{clip_id}")
def serve_video(clip_id: int):
    """Serwuj klip wideo"""
    file_path = os.path.join(MEDIA_DIR, f"clip_{clip_id}.mp4")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Clip not found")
    return FileResponse(file_path, media_type="video/mp4")


@app.get("/audio/beat")
def serve_audio():
    """Serwuj plik audio z beatem"""
    file_path = os.path.join(MEDIA_DIR, "beat_audio.mp3")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(file_path, media_type="audio/mpeg")


@app.get("/clips")
def get_clips():
    """Zwróć listę klipów z timeline_data.json"""
    try:
        with open("timeline_data.json", "r") as f:
            data = json.load(f)
        return {"clips": data}
    except FileNotFoundError:
        return {"clips": []}


@app.post("/process")
async def process_video(
        video: UploadFile = File(...),
        audio: UploadFile = File(...)
):
    """
    Przetwarza wideo z audio i zwraca gotowy plik
    """
    if not video.filename or not audio.filename:
        raise HTTPException(status_code=400, detail="Przesłany plik nie ma nazwy.")

    original_video_filename = video.filename

    # Utwórz ścieżki do plików tymczasowych
    video_path = os.path.join(UPLOAD_DIR, original_video_filename)
    audio_path = os.path.join(UPLOAD_DIR, audio.filename)

    try:
        # Zapisz uploadowane pliki
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)

        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        print(f"Pliki zapisane: {video_path}, {audio_path}")

        # ---------- WYKRYWANIE TEMPA ----------
        print("Wykrywanie tempa...")
        beat_processor = RNNBeatProcessor()
        act = beat_processor(audio_path)
        tracker = DBNBeatTrackingProcessor(fps=100)
        beats = tracker(act)

        if len(beats) < 2:
            raise HTTPException(status_code=400, detail="Za mało beatów do obliczenia tempa")

        intervals = np.diff(beats)
        avg_interval = np.mean(intervals)
        bpm = 60.0 / avg_interval
        time_beat = 60 / bpm
        takt = time_beat * 4
        print(f"Tempo: {round(bpm, 2)} BPM, Takt: {takt:.3f}s")

        # ---------- ŁADOWANIE PLIKÓW ----------
        audio_clip = AudioFileClip(audio_path)
        audio_duration = audio_clip.duration

        video_clip = VideoFileClip(video_path).without_audio()
        scene_video_stream = open_video(video_path)

        # ---------- WYKRYWANIE SCEN ----------
        print("Wykrywanie scen...")
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=27.0))
        scene_manager.detect_scenes(video=scene_video_stream)
        scene_list = scene_manager.get_scene_list()
        print(f"Znaleziono {len(scene_list)} scen")

        # ---------- FILTROWANIE I OCENA SCEN ----------
        print("Analizowanie scen z CLIP AI...")
        clips = []
        min_takt = takt

        for idx, (start, end) in enumerate(scene_list):
            scene_length = end.get_seconds() - start.get_seconds()
            if scene_length >= min_takt:
                clip_length = round_down_to_takt(scene_length, takt)
                if clip_length > 0:
                    clip = video_clip.subclip(start.get_seconds(), start.get_seconds() + clip_length)

                    if not is_too_dark(clip) and not is_static_clip(clip):
                        aesthetic_score = score_scene_with_clip(clip)
                        clips.append((clip, clip_length, aesthetic_score))
                        print(f"Scena {idx + 1}: Score {aesthetic_score:.3f}")

        if len(clips) == 0:
            raise HTTPException(status_code=400, detail="Nie znaleziono żadnych odpowiednich scen")

        # ---------- SORTOWANIE I LOSOWANIE ----------
        print("Analizowanie scen i losowanie ułożeń...")

        clips.sort(key=lambda x: x[2], reverse=True)


        pool_size = min(20, len(clips))
        best_clips_pool = clips[:pool_size]

        random.shuffle(best_clips_pool)

        num_clips_to_use = max(5, len(best_clips_pool) // 2)

        selected_clips = best_clips_pool[:num_clips_to_use]
        print(f"Wylosowano {len(selected_clips)} scen z puli {pool_size} najlepszych")

        # ---------- BUDOWANIE SEKWENCJI ----------
        sequence_length = 8 * takt
        current_length = 0
        sequence_clips = []

        for clip, length, score in selected_clips:
            if current_length >= sequence_length:
                break

            remaining = sequence_length - current_length

            # Zabezpieczenie przed zbyt długimi ujęciami
            if length > 4:

                max_offset = length - 4
                random_offset = random.uniform(0, max_offset)
                clip = clip.subclip(random_offset, random_offset + 4)
                length = 4

            if length <= remaining:
                sequence_clips.append(clip)
                current_length += length
            elif remaining > 0:
                trimmed_clip = clip.subclip(0, remaining)
                sequence_clips.append(trimmed_clip)
                current_length += remaining

        print(f"Długość sekwencji: {current_length:.3f}s")

        print("\n📹 Zapisywanie klipów do folderu media/...")

        timeline_data = []
        start_time = 0

        for idx, clip in enumerate(sequence_clips):
            output_path = os.path.join(MEDIA_DIR, f"clip_{idx}.mp4")
            print(f"  Zapisuję clip_{idx}.mp4 (długość: {clip.duration:.2f}s)...")
            clip.write_videofile(
                output_path,
                codec="libx264",
                audio=False,
                verbose=False,
                logger=None
            )

            # Dodaj metadane VIDEO dla Timeline
            timeline_data.append({
                "id": f"video-{idx}",
                "title": f"Clip {idx + 1}",
                "duration": clip.duration,
                "start": start_time,
                "track": 0,
                "type": "video",
                "videoUrl": f"http://127.0.0.1:8000/video/{idx}",
                "linkedAudioId": None
            })

            start_time += clip.duration

        #ZAPISZ AUDIO (BEAT)
        print("\n🎵 Zapisywanie audio do folderu media/...")
        audio_output_path = os.path.join(MEDIA_DIR, "beat_audio.mp3")
        audio_clip.write_audiofile(audio_output_path, verbose=False, logger=None)

        # Dodaj AUDIO do timeline
        timeline_data.append({
            "id": "audio-main",
            "title": "Beat Audio",
            "duration": audio_clip.duration,
            "start": 0,
            "track": 3,
            "type": "audio",
            "audioUrl": "http://127.0.0.1:8002/audio/beat",
            "linkedVideoId": None
        })

        # Zapisz metadane do JSON
        with open("timeline_data.json", "w") as f:
            json.dump(timeline_data, f, indent=2)

        print(f"\n✅ Zapisano {len(sequence_clips)} klipów video")
        print(f"✅ Zapisano 1 plik audio (beat)")
        print(f"✅ Metadane zapisane do timeline_data.json")
        print(f"📊 Timeline zawiera {len(timeline_data)} elementów")

        # ---------- FINALIZACJA ----------
        final_clip = concatenate_videoclips(sequence_clips)
        final_clip = detect_and_crop_letterbox(final_clip)

        # Przeskaluj do 16:9
        target_width, target_height = 1920, 1080
        target_aspect = target_width / target_height
        current_aspect = final_clip.w / final_clip.h

        if abs(current_aspect - target_aspect) > 0.01:
            if current_aspect > target_aspect:
                new_w = int(final_clip.h * target_aspect)
                final_clip = final_clip.crop(x_center=final_clip.w / 2, width=new_w)
            else:
                new_h = int(final_clip.w / target_aspect)
                final_clip = final_clip.crop(y_center=final_clip.h / 2, height=new_h)

        final_clip = final_clip.resize((target_width, target_height))

        # Zapętlanie
        loops_needed = int(np.ceil(audio_duration / final_clip.duration))
        looped_clip = final_clip.loop(n=loops_needed).subclip(0, audio_duration)
        final_with_audio = looped_clip.set_audio(audio_clip)

        # Zapis
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        output_filename = f"output_{base_name}.mp4"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        final_with_audio.write_videofile(output_path, codec="libx264", audio_codec="aac")

        # Cleanup
        video_clip.close()
        audio_clip.close()

        print(f"✓ GOTOWE! Plik: {output_path}")

        return {
            "status": "success",
            "message": "Video processed successfully!",
            "output_file": output_filename,
            "bpm": round(bpm, 2),
            "scenes_analyzed": len(scene_list),
            "scenes_used": len(clips),
            "timeline_clips": len(timeline_data)
        }

    except Exception as e:
        print(f"Błąd: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/{filename}")
def download_file(filename: str):
    """Pobierz przetworzony plik"""
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)


@app.get("/status")
def get_status():
    """Sprawdź status API"""
    return {
        "status": "online",
        "device": device,
        "uploads": len(os.listdir(UPLOAD_DIR)) if os.path.exists(UPLOAD_DIR) else 0,
        "outputs": len(os.listdir(OUTPUT_DIR)) if os.path.exists(OUTPUT_DIR) else 0,
        "media_clips": len([f for f in os.listdir(MEDIA_DIR) if f.endswith('.mp4')]) if os.path.exists(MEDIA_DIR) else 0
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)