import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import yt_dlp
import traceback

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Folder do przechowywania pobranych plików
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

ffmpeg_path = r"C:\Users\huber\PycharmProjects\PythonProject2\ffmpeg-7.1.1-essentials_build\bin"
os.environ["PATH"] += os.pathsep + ffmpeg_path


class LinkRequest(BaseModel):
    link: str



@app.post("/download_yt")
async def download_youtube_video(request: LinkRequest):
    """
    Pobiera wideo z YouTube na podstawie linku.
    """
    link = request.link

    if not link:
        raise HTTPException(status_code=400, detail="Brak linku do pobrania.")

    try:
        # Konfiguracja yt-dlp - pobieranie i konwersja do H.264
        ydl_opts = {
            'format': 'bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': os.path.join(UPLOAD_DIR, '%(title)s.%(ext)s'),
            'merge_output_format': 'mp4',
            'postprocessors': [{
                'key': 'FFmpegVideoConvertor',
                'preferedformat': 'mp4',
            }],
            'postprocessor_args': [
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-crf', '23',
                '-preset', 'fast',
            ],
            'quiet': False,
            'verbose': True,
            'no_warnings': False,
        }

        print(f"Rozpoczynam pobieranie: {link}")

        # Pobieranie
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(link, download=True)

            # Pobierz rzeczywistą nazwę pliku
            downloaded_file = ydl.prepare_filename(info)

            if not downloaded_file.endswith('.mp4'):
                base_name = os.path.splitext(downloaded_file)[0]
                downloaded_file = base_name + '.mp4'

        print(f"Oczekiwana ścieżka: {downloaded_file}")
        print(f"Zawartość folderu uploads: {os.listdir(UPLOAD_DIR)}")

        # Sprawdź czy plik istnieje
        if not os.path.exists(downloaded_file):
            possible_files = [
                downloaded_file,
                downloaded_file.replace('.mp4', '.webm'),
                downloaded_file.replace('.mp4', '.mkv'),
            ]

            found_file = None
            for possible_file in possible_files:
                print(f"Sprawdzam: {possible_file} - istnieje: {os.path.exists(possible_file)}")
                if os.path.exists(possible_file):
                    found_file = possible_file
                    break

            if not found_file:
                raise Exception(f"Plik nie został pobrany. Sprawdzone ścieżki: {possible_files}")

            downloaded_file = found_file

        file_name = os.path.basename(downloaded_file)
        print(f"Pobieranie zakończone: {file_name}")

        return {
            "status": "success",
            "message": "Pobieranie zakończone pomyślnie.",
            "video_path": file_name,
            "video_url": f"http://localhost:8001/uploads/{file_name}",
            "title": info.get('title', 'Nieznany tytuł')
        }

    except yt_dlp.utils.DownloadError as e:
        print(f"Błąd yt-dlp: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Błąd pobierania z YouTube: {str(e)}")

    except Exception as e:
        print(f"Nieoczekiwany błąd: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Błąd podczas pobierania wideo: {str(e)}")


@app.get("/")
async def root():
    return {"message": "YouTube Downloader API działa poprawnie"}


@app.get("/files")
async def list_files():
    """Lista pobranych plików"""
    files = os.listdir(UPLOAD_DIR)
    return {"files": files}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)