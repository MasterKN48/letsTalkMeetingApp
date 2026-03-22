import asyncio
import logging
import json
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import websockets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("speech-gateway")

app = FastAPI()

ASR_WS_URL = os.environ.get("ASR_WS_URL", "ws://127.0.0.1:8000/v1/audio/stream")
MT_WS_URL = os.environ.get("MT_WS_URL", "ws://127.0.0.1:8001/ws/translate")
TTS_WS_URL = os.environ.get("TTS_WS_URL", "ws://127.0.0.1:8002/ws/speech")

@app.websocket("/ws/orchestrate")
async def orchestrate_translation(client_ws: WebSocket):
    await client_ws.accept()
    logger.info("Bun Server connected to Speech Gateway.")
    
    audio_accumulator = bytearray()
    has_cloned_voice = False
    
    try:
        # Establish persistent internal IPC pipelines over WebSockets
        async with websockets.connect(ASR_WS_URL) as asr_ws, \
                   websockets.connect(MT_WS_URL) as mt_ws, \
                   websockets.connect(TTS_WS_URL) as tts_ws:
            
            logger.info("Internal IPC (ASR, MT, TTS) pipelines established.")
            
            while True:
                # 1. Receive Int16 PCM chunk from Bun
                chunk = await client_ws.receive_bytes()
                
                # 2. Extract 5-second reference audio for Voice Cloning (Optional)
                if not has_cloned_voice:
                    audio_accumulator.extend(chunk)
                    if len(audio_accumulator) >= (16000 * 2 * 5): # 16kHz * 16bit * 5s = 160KB
                        has_cloned_voice = True
                        logger.info("Collected Voice Cloning reference sample.")
                
                # 3. Stream to ASR pipeline
                await asr_ws.send(chunk)
                asr_response = await asr_ws.recv()
                asr_data = json.loads(asr_response)
                text = asr_data.get("text", "")
                is_final = asr_data.get("is_final", False)
                
                # 4. Stream to MT pipeline (cascaded execution)
                if text:
                    await mt_ws.send(json.dumps({"text": text, "src": "en", "tgt": "es"}))
                    mt_response = await mt_ws.recv()
                    translated = json.loads(mt_response).get("translated_text", "")
                    
                    # 5. Send translated text to frontend UI
                    await client_ws.send_json({"type": "translation_text", "text": translated})
                    
                    # 6. Stream to TTS pipeline
                    await tts_ws.send(json.dumps({"text": translated}))
                    audio_out = await tts_ws.recv() # Receives raw PCM generator bytes
                    
                    # 7. Rapid injection back to Bun for Mediasoup
                    await client_ws.send_bytes(audio_out)

    except WebSocketDisconnect:
        logger.info("Bun Server disconnected.")
    except Exception as e:
        logger.error(f"Gateway error: {e}")
        await client_ws.close()
