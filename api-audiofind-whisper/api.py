import os
import tempfile
from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import whisper

MODEL_NAME = os.getenv("WHISPER_MODEL", "base") 
model = whisper.load_model(MODEL_NAME)

app = FastAPI(
    title="Whisper Transcribe API",
    description="Recibe un audio (multipart/form-data, key=file) y devuelve la transcripción.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        
    allow_methods=["POST"],
    allow_headers=["*"],
)

ALLOWED_MIME = {
    "audio/wav", "audio/x-wav",
    "audio/mpeg", "audio/mp3",
    "audio/mp4",  "audio/x-m4a",
    "audio/ogg",  "audio/x-flac",
}

@app.post("/transcribe", status_code=200, response_model=None)
async def transcribe(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipo no soportado: {file.content_type}"
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        text = model.transcribe(tmp_path, fp16=False)["text"].strip()
        return JSONResponse({"transcription": text})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al transcribir: {e}")
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

