import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from transformers import AutoTokenizer
import ctranslate2
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mt-adapter-ct2")

app = FastAPI()

# Cache for loaded ctranslate2 translators
translators = {}
tokenizers = {}

DEVICE = "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"

@app.websocket("/ws/translate")
async def translate_stream(websocket: WebSocket):
    await websocket.accept()
    logger.info("Gateway connected to MT Stream")
    try:
        while True:
            data = await websocket.receive_text()
            req = json.loads(data)
            text = req.get("text", "")
            src = req.get("src", "en")
            tgt = req.get("tgt", "es")
            
            pair = f"{src}-{tgt}"
            # CTranslate2 models need to be pre-converted. 
            # In a real scenario you would have ./models_cache/opus-mt-en-es-ct2
            model_path = f"./models_cache/opus-mt-{pair}-ct2"
            
            if pair not in translators:
                logger.info(f"Loading CT2 model for {pair}")
                # Mock loading since we haven't actually converted the models on disk
                # tokenizers[pair] = AutoTokenizer.from_pretrained(f"Helsinki-NLP/opus-mt-{pair}")
                # translators[pair] = ctranslate2.Translator(model_path, device=DEVICE)
                translators[pair] = True
                
            # Perform ultra-fast CTranslate2 inference
            # tokens = tokenizers[pair].convert_ids_to_tokens(tokenizers[pair].encode(text))
            # results = translators[pair].translate_batch([tokens])
            # translated_text = tokenizers[pair].decode(results[0].hypotheses[0], skip_special_tokens=True)
            
            # Dummy logic
            translated_text = f"[{tgt.upper()} CT2] {text}"
            
            await websocket.send_text(json.dumps({"translated_text": translated_text}))
            
    except WebSocketDisconnect:
        logger.info("Gateway disconnected.")
    except Exception as e:
        logger.error(f"MT Error: {e}")
        await websocket.close()
