from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/clips")
async def get_clips():
    """Zwraca metadane wszystkich wygenerowanych klipów"""
    clips_data = []

    if os.path.exists("timeline_data.json"):
        with open("timeline_data.json", "r") as f:
            clips_data = json.load(f)

    return {"clips": clips_data}


@app.get("/video/{clip_id}")
async def get_video(clip_id: str, request: Request):
    """Streamuje konkretny klip video z obsługą Range requests"""
    file_path = f"media/clip_{clip_id}.mp4"

    if not os.path.exists(file_path):
        return {"error": "Clip not found"}, 404

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")

    if range_header:
        byte_range = range_header.replace("bytes=", "").split("-")
        start = int(byte_range[0])
        end = int(byte_range[1]) if byte_range[1] else file_size - 1
        end = min(end, file_size - 1)
        content_length = end - start + 1

        def iterfile():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining:
                    chunk_size = min(8192, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": "video/mp4",
        }

        return StreamingResponse(iterfile(), status_code=206, headers=headers)

    def iterfile():
        with open(file_path, "rb") as f:
            yield from f

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": "video/mp4",
    }



    return StreamingResponse(iterfile(), headers=headers)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)