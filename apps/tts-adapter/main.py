import os
import onnxruntime as ort
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tts-adapter")

app = FastAPI()

# Target Chatterbox multilingual ONNX quantized format
MODEL_ID = os.getenv("TTS_MODEL_ID", "ipsilondev/chatterbox-multilingual-ONNX-q4")
# ONNX Session
sess = None

@app.on_event("startup")
async def load_model():
    global sess
    try:
        # Resolve to cache directory mapped in docker-compose
        model_name = MODEL_ID.split("/")[-1]
        model_path = f"./models_cache/{model_name}/model_quantized.onnx"
        
        logger.info(f"Loading ONNX Model from {model_path}...")
        
        if os.path.exists(model_path):
            prov = ['CUDAExecutionProvider', 'CPUExecutionProvider']
            sess = ort.InferenceSession(model_path, providers=prov)
            logger.info("TTS ONNX Session initialized.")
        else:
            logger.warning(f"File {model_path} not found. Please ensure HF_TOKEN downloads the ONNX weights.")
    except Exception as e:
        logger.error(f"Failed ONNX setup: {e}")

@app.websocket("/ws/speech")
async def generate_speech_ws(websocket: WebSocket):
    await websocket.accept()
    logger.info("Gateway connected to TTS stream")
    try:
        while True:
            data = await websocket.receive_text()
            req = json.loads(data)
            text = req.get("text", "")
            
            if sess and text:
                try:
                    # 1. Preprocessing (Assumes Chatterbox tokenizer pipeline is available)
                    # For a true ONNX pipeline, you would map text to phonemes and IDs.
                    # inputs = chatterbox_tokenizer.encode(text)
                    
                    # 2. ONNX Inference
                    # ort_inputs = {sess.get_inputs()[0].name: np.array([inputs], dtype=np.int64)}
                    # pcm_audio_np = sess.run(None, ort_inputs)[0] 
                    
                    # 3. Stream back bytes (Simulated ONNX output)
                    # await websocket.send_bytes(pcm_audio_np.tobytes())
                    pass
                except Exception as eval_err:
                    logger.error(f"ONNX synthesis failed: {eval_err}")
            
            # Send dummy 1sec 48kHz audio buffer while model weights are missing
            dummy_audio = np.zeros(48000, dtype=np.int16).tobytes()
            await websocket.send_bytes(dummy_audio)
            
    except WebSocketDisconnect:
        logger.info("Gateway disconnected from TTS")
    except Exception as e:
        logger.error(f"TTS WS error: {e}")
        await websocket.close()
