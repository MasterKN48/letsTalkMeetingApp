import os
print("ASR Adapter: Script started...")
import torch
import numpy as np
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
import logging
import json

print("ASR Adapter: Imports completed.")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("asr-adapter")

app = FastAPI()

# Target Qwen3 ASR as requested
MODEL_ID = os.getenv("ASR_MODEL_ID", "Qwen/Qwen3-ASR-0.6B")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32

processor = None
model = None


@app.on_event("startup")
async def load_model():
    global processor, model
    try:
        logger.info("Initializing ASR Pipeline...")
        logger.info(f"Target Model: {MODEL_ID}")
        logger.info(f"Device: {DEVICE} | Dtype: {DTYPE}")
        
        # This will download the model if not present. It can take several minutes.
        logger.info("Loading Processor...")
        processor = AutoProcessor.from_pretrained(MODEL_ID)
        
        logger.info("Loading Model (this may take a few minutes if downloading)...")
        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            MODEL_ID, 
            torch_dtype=DTYPE, 
            low_cpu_mem_usage=True
        ).to(DEVICE)
        
        logger.info("✅ ASR Model loaded successfully and ready for inference.")
    except Exception as e:
        logger.error(f"❌ Failed to load ASR Model: {e}")
        logger.error("Check your internet connection and disk space (approx 2GB required).")


@app.websocket("/v1/audio/stream")
async def process_audio_stream(websocket: WebSocket):
    await websocket.accept()
    logger.info("Gateway connected to ASR stream")

    audio_buffer = bytearray()

    try:
        while True:
            # 1. Receive Int16 bytes
            chunk = await websocket.receive_bytes()
            audio_buffer.extend(chunk)

            # 2. Process when we have 1 sec of audio (16000 samples * 2 bytes = 32000 bytes)
            # ASR models need sentence/word context to transcribe accurately
            if len(audio_buffer) >= 32000 and processor and model:
                # Convert Int16 PCM to Float32 [-1.0, 1.0] expected by Torchaudio/Transformers
                audio_np = (
                    np.frombuffer(audio_buffer, dtype=np.int16).astype(np.float32)
                    / 32768.0
                )

                # 3. Model Inference
                inputs = processor(audio_np, sampling_rate=16000, return_tensors="pt")
                inputs = inputs.to(
                    DEVICE, dtype=DTYPE if "input_features" in inputs else None
                )

                with torch.no_grad():
                    # For Qwen sequence-to-sequence ASR
                    generated_ids = model.generate(
                        inputs.get("input_features", inputs.get("input_values")),
                        max_new_tokens=128,
                    )

                # 4. Decode
                transcription = processor.batch_decode(
                    generated_ids, skip_special_tokens=True
                )[0]

                if transcription.strip():
                    await websocket.send_text(
                        json.dumps({"text": transcription, "is_final": True})
                    )

                # Clear buffer for next phrase (or implement sliding window overlap)
                audio_buffer.clear()

            elif len(audio_buffer) >= 32000:
                # Fallback if model failed to load
                await websocket.send_text(
                    json.dumps({"text": "[ASR Model Offline]", "is_final": True})
                )
                audio_buffer.clear()

    except WebSocketDisconnect:
        logger.info("Gateway disconnected from ASR")
    except Exception as e:
        logger.error(f"ASR WS error: {e}")
        await websocket.close()


if __name__ == "__main__":
    import uvicorn

    print("Starting ASR service...")
    # ASR service port (default is 8000)
    uvicorn.run(app, host="0.0.0.0", port=8000)
