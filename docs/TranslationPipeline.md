the clean final plan is to keep Bun + mediasoup for realtime transport, add a Python speech gateway for streaming orchestration, and put an OpenAI-shaped API in front of every model so you can swap ASR, MT, or TTS later without touching the app clients. LiteLLM is best used here as the **gateway** layer because it already exposes OpenAI-compatible `/chat/completions`, `/audio/transcriptions`, and `/audio/speech` endpoints, while Marian’s native serving path is a WebSocket server rather than an OpenAI HTTP API. [docs.litellm](https://docs.litellm.ai/docs/audio_transcription)

## Target stack

Use four services: `web` (Next.js), `rtc-gateway` (Bun + mediasoup), `speech-gateway` (FastAPI + WebSocket session manager), and `model-adapters` (OpenAI-shaped wrappers for ASR, MT, and TTS). This keeps your low-latency media path in Bun, while Python handles model streaming, buffering, partial transcripts, and chunked translation.

For self-hosting, keep the northbound contract stable and the southbound runtimes replaceable: Qwen3 ASR today, another ASR later; Marian today, a better MT later; Qwen3 TTS or Chatterbox later. That gives you macOS-local development and cloud deployment with the same Docker Compose and the same client SDK usage.

## API contract

Make every inference call look OpenAI-compatible from the outside, even if the underlying engine is not. LiteLLM Proxy already supports the key audio and chat-style endpoints you need, so use that contract as your public interface. [docs.litellm](https://docs.litellm.ai/docs/text_to_speech)

| Capability    | Public endpoint                                                                             | Internal target                               |
| ------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------- |
| ASR           | `/v1/audio/transcriptions` [docs.litellm](https://docs.litellm.ai/docs/audio_transcription) | `qwen-asr-adapter`                            |
| TTS           | `/v1/audio/speech` [docs.litellm](https://docs.litellm.ai/docs/text_to_speech)              | `qwen-tts-adapter` or `chatterbox-adapter`    |
| MT            | `/v1/chat/completions` [docs.litellm](https://docs.litellm.ai/docs/providers/litellm_proxy) | `marian-adapter` returning OpenAI-shaped JSON |
| Orchestration | WebSocket session API                                                                       | `speech-gateway`                              |

For Marian, do not force the model runtime itself to become “OpenAI-native”; instead, build a thin adapter that accepts `/v1/chat/completions` and internally calls Marian. Marian’s official server is `marian-server`, and it serves translation over WebSocket, so the adapter is the correct place to normalize request and response shapes. [marian-nmt.github](https://marian-nmt.github.io/docs/)

## Marian adapter

Marian’s native deployment primitive is `marian-server`, which exposes translation as a WebSocket service rather than a REST inference API. A persistent WebSocket client is recommended because keeping the connection open can save a few hundred milliseconds per call compared with reconnecting for every request. [github](https://github.com/writer/client.marian)

So the MT path should be: `speech-gateway` → `marian-adapter` (OpenAI-shaped HTTP) → persistent WS → `marian-server`. Keep one Marian instance per hot language pair, and let the adapter route `model="mt-en-hi"` or `model="mt-hi-en"` to the right backend.

## Mediasoup wiring

For mediasoup, keep it focused on WebRTC transport, room state, and fan-out, not model inference. The core server path remains standard mediasoup: create `WebRtcTransport`, bind `listenInfos`, and set `announcedAddress` correctly so browsers receive usable ICE candidates. [mediasoup](https://mediasoup.org/documentation/v3/mediasoup/api/)

My recommendation is simpler than pulling audio back out of mediasoup for ASR: in the browser, run FE VAD and an `AudioWorklet`, send the normal mic track to mediasoup for the room, and send a second low-level PCM stream over WebSocket directly to `speech-gateway`. That avoids RTP decode/transcode in the backend, lowers translation latency, and keeps mediasoup clean.

A good flow is:

1. FE VAD decides whether to forward frames.
2. `AudioWorklet` emits 20–40 ms PCM chunks to `speech-gateway`.
3. `speech-gateway` feeds Qwen ASR streaming, waits for Qwen internal VAD/endpoints, chunks text for MT, and streams translated audio back.
4. Bun forwards translated audio to the listener as a separate track or playback stream.

## Agentic IDE plan

Use this repo layout in your IDE so each service has a single responsibility: `apps/web`, `apps/rtc-gateway`, `apps/speech-gateway`, `apps/qwen-asr-adapter`, `apps/marian-adapter`, `apps/qwen-tts-adapter`, and `infra/docker-compose.yml`. This layout fits your current Bun/mediasoup stack, keeps model code isolated, and makes later replacement easy because only the adapter changes, not the frontend or orchestration code.

Start v1 with this language set: `en, hi, es, fr, de, it, pt, ar, ja, ko, zh`. That is a practical starter list for a self-hosted product; after that, add more pairs only when you have validated ASR quality, Marian pair quality, and TTS naturalness end to end on your exact checkpoints.

Implementation order:

1. Build the OpenAI-shaped adapters first.
2. Add `speech-gateway` streaming sessions and chunk logic.
3. Wire FE VAD + `AudioWorklet`.
4. Connect Bun/mediasoup room events and translated audio return path.
5. Add metrics: first partial ASR time, translation chunk time, first audio byte, end-to-end latency.

To implement your plan, you need three specific "Adapter" services that wrap your raw models. This "Model Inference" layer isolates the complex model runtimes (WebSocket, GPU streams) from your clean speech-gateway logic.

1. Marian MT Adapter (FastAPI Wrapper)
   Marian NMT natively runs as a WebSocket server (marian-server). You need a lightweight Python adapter to accept OpenAI-style JSON requests and proxy them to the Marian WebSocket.
   Why: Converting REST to WebSocket internally keeps your public API standard (OpenAI chat.completions) while leveraging Marian's persistent connection speed.
   apps/marian-adapter/main.py
   python
   import asyncio
   import websockets
   import json
   from fastapi import FastAPI, HTTPException
   from pydantic import BaseModel

app = FastAPI()

# Marian Server URL (internal docker network)

MARIAN_WS_URL = "ws://marian-server:8080/translate"

class ChatMessage(BaseModel):
role: str
content: str

class ChatRequest(BaseModel):
model: str
messages: list[ChatMessage]

@app.post("/v1/chat/completions")
async def translate(request: ChatRequest): # Extract last user message for translation
source_text = request.messages[-1].content

    try:
        async with websockets.connect(MARIAN_WS_URL) as websocket:
            # Marian expects simple text line by default
            await websocket.send(source_text)
            translated_text = await websocket.recv()

            # Return OpenAI-compatible response
            return {
                "id": "chatcmpl-123",
                "object": "chat.completion",
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": translated_text.strip()
                    },
                    "finish_reason": "stop"
                }]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

Use code with caution.

2. Qwen ASR Adapter (Streaming)
   Standard OpenAI ASR (/audio/transcriptions) expects a full file upload, which adds huge latency. For real-time, your adapter should expose a WebSocket endpoint that mimics the behavior of a streaming ASR engine, processing chunks as they arrive.
   Implementation: Use the qwen-asr Python package directly. It supports streaming inference better than generic vLLM serving.
   apps/qwen-asr-adapter/server.py
   python
   from fastapi import FastAPI, WebSocket
   from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
   import torch
   import numpy as np

app = FastAPI()

# Load model once on startup (GPU)

model_id = "Qwen/Qwen2-Audio-7B-Instruct"
device = "cuda:0" if torch.cuda.is_available() else "cpu"

# Note: For strict ASR, Qwen3-ASR-1.7B is more specialized/faster if available

model = AutoModelForSpeechSeq2Seq.from_pretrained(model_id, torch_dtype=torch.float16).to(device)
processor = AutoProcessor.from_pretrained(model_id)

@app.websocket("/v1/audio/stream")
async def websocket_endpoint(websocket: WebSocket):
await websocket.accept()
history = [] # accumulated audio context

    try:
        while True:
            # Receive raw PCM bytes (float32 or int16)
            data = await websocket.receive_bytes()

            # Convert bytes to numpy array
            audio_chunk = np.frombuffer(data, dtype=np.float32)

            # Simple streaming logic (in production, use a rolling buffer/VAD)
            inputs = processor(audio_chunk, sampling_rate=16000, return_tensors="pt").to(device)

            # Run inference (greedy for speed)
            with torch.no_grad():
                generated_ids = model.generate(inputs.input_features, max_new_tokens=128)

            transcription = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

            # Send back partial or final text
            await websocket.send_json({"text": transcription, "is_final": False})

    except Exception:
        await websocket.close()

Use code with caution.

Note: For production, replace the naive .generate() loop with qwen-asr's specialized streaming iterator to avoid re-processing the whole buffer every time. 3. TTS Adapter (Chatterbox / Qwen)
Use Chatterbox for the most "OpenAI-compliant" experience out of the box. It already provides a FastAPI server that matches the /v1/audio/speech spec perfectly.
Deployment:
Simply run the docker container travisvn/chatterbox-tts-api.
yaml
qwen-tts-adapter:
image: travisvn/chatterbox-tts-api:latest
ports: - "8000:8000"
environment: - USE_GPU=true
Use code with caution.

Your speech-gateway then calls it exactly like OpenAI:
python
client.audio.speech.create(
model="tts-1",
voice="alloy", # Maps to a Chatterbox voice ID
input="Hello world"
)
Use code with caution.

4. Orchestration Logic (speech-gateway)
   This is the brain. It connects the low-latency streams (Bun/Mediasoup) with the high-latency intelligence (Models).
   Key Responsibilities:
   Buffer Audio: Incoming WebSocket chunks (20ms) are too small for models. Accumulate them into 200ms-500ms windows before sending to ASR.
   VAD Gating: Use webrtcvad or silero-vad (ONNX) inside this gateway. If silence, drop packets; don't waste GPU time on ASR.
   Flow Control:
   User speaks: Stream audio -> Qwen ASR Adapter.
   User stops (VAD silence): Send "commit" signal to ASR -> Get final text.
   Text ready: Send text -> Marian Adapter -> Get translated text.
   Translation ready: Send text -> TTS Adapter -> Get audio bytes.
   Playback: Stream audio bytes -> Bun/Mediasoup.
   Latency Tip: Don't wait for the full translation. If Marian outputs a sentence, send it to TTS immediately while the next sentence is generating.

For ultra-low latency in a real-time translation pipeline, you should use WebSockets for the ASR (speech-to-text) and TTS (text-to-speech) paths, as these require continuous streaming of binary audio data. For the MT (translation) adapter, a standard REST API is sufficient because text translation is a "discrete" event (you send a sentence and get a sentence back) and the overhead of a single HTTP call is negligible compared to the model's inference time.

1. Final Adapter Architecture
   Your speech-gateway will act as a WebSocket server for the client, orchestrating calls to the three internal services below.
   A. Marian MT Adapter (REST)
   This adapter handles multiple language pairs by loading specific Helsinki-NLP/opus-mt models.
   python

# apps/marian-adapter/main.py

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import MarianMTModel, MarianTokenizer
import torch

app = FastAPI()
device = "cuda" if torch.cuda.is_available() else "cpu"

# Cache for loaded models to avoid reloading on every request

models = {}

class TranslationRequest(BaseModel):
text: str
src: str = "en"
tgt: str = "hi"

@app.post("/translate")
async def translate(req: TranslationRequest):
pair = f"{req.src}-{req.tgt}"
if pair not in models:
model_name = f"Helsinki-NLP/opus-mt-{pair}"
try:
tokenizer = MarianTokenizer.from_pretrained(model_name)
model = MarianMTModel.from_pretrained(model_name).to(device)
models[pair] = (model, tokenizer)
except Exception:
raise HTTPException(status_code=404, detail=f"Language pair {pair} not supported")

    model, tokenizer = models[pair]
    batch = tokenizer([req.text], return_tensors="pt", padding=True).to(device)
    gen = model.generate(**batch)
    return {"translated_text": tokenizer.batch_decode(gen, skip_special_tokens=True)[0]}

Use code with caution.

2. Docker Compose Snippet
   This wires vLLM for ASR, Chatterbox for TTS, and your custom Marian adapter.
   yaml
   version: '3.8'
   services:

# ASR: vLLM serving Qwen2-Audio (OpenAI Compatible)

asr-vllm:
image: vllm/vllm-openai:latest
command: --model Qwen/Qwen2-Audio-7B-Instruct --trust-remote-code --port 8000
deploy:
resources:
reservations:
devices: - driver: nvidia
count: 1
capabilities: [gpu]

# TTS: Chatterbox API (OpenAI Compatible)

tts-chatterbox:
image: travisvn/chatterbox-tts-api:latest
ports: - "5123:5123"
environment: - DEVICE=cuda - VOICE_SAMPLE_PATH=/app/voices/default.wav
volumes: - ./voices:/app/voices

# MT: Custom Marian Adapter

mt-marian:
build: ./apps/marian-adapter
environment: - CUDA_VISIBLE_DEVICES=0

# Orchestrator

speech-gateway:
build: ./apps/speech-gateway
depends_on: - asr-vllm - tts-chatterbox - mt-marian
Use code with caution.

3. Sample Speech Service (Orchestrator Logic)
   The speech-gateway uses a WebSocket to receive PCM audio from the frontend, sends it to vLLM, pipes the result to Marian, and finally streams Chatterbox audio back.
   python

# apps/speech-gateway/main.py (Simplified)

@app.websocket("/ws/translate")
async def speech_translate(websocket: WebSocket):
await websocket.accept()
while True:
audio_chunk = await websocket.receive_bytes()

        # 1. ASR via vLLM (REST or WS if supported by your vLLM version)
        text = await call_vllm_asr(audio_chunk)

        if text:
            # 2. MT via Marian Adapter (REST)
            translated = await client.post("http://mt-marian/translate", json={"text": text})

            # 3. TTS via Chatterbox (REST/Streaming)
            # Chatterbox returns binary audio directly
            audio_out = await client.post("http://tts-chatterbox/v1/audio/speech",
                                          json={"input": translated.json()["translated_text"]})

            await websocket.send_bytes(audio_out.content)

Use code with caution.

To implement the frontend audio capture, you need a high-performance AudioWorklet to extract raw PCM data from the microphone and send it over a [WebSocket](https://javascript.info/websocket) to your speech-gateway. This approach avoids the high latency of standard recording APIs. [1, 2, 3]

1. The Audio Processor (processor.js)
   This script runs in a separate background thread to ensure audio capture isn't interrupted by UI rendering. Save this file as public/processor.js. [2, 4]

// public/processor.jsclass AudioStreamProcessor extends AudioWorkletProcessor {
process(inputs) {
const input = inputs[0]; // Get the first input (mic)
if (input && input.length > 0) {
const channelData = input[0]; // Get the first channel (mono)
// Send the Float32 raw PCM data to the main thread
this.port.postMessage(channelData);
}
return true; // Keep the processor alive
}
}

registerProcessor('audio-stream-processor', AudioStreamProcessor);

2. The React/Next.js Client Logic
   This component initializes the audio context, connects the WebSocket, and pipes the data. [1, 5]

// apps/web/components/AudioClient.jsimport { useEffect, useRef } from 'react';
export default function AudioClient() {
const socketRef = useRef(null);
const audioCtxRef = useRef(null);

const startStreaming = async () => {
// 1. Connect WebSocket to your speech-gateway
socketRef.current = new WebSocket('ws://localhost:8000/ws/translate');

    // 2. Setup Audio Context
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000, // Match Qwen/vLLM ASR expected rate
      latencyHint: 'interactive'
    });

    // 3. Load the Worklet
    await audioCtxRef.current.audioWorklet.addModule('/processor.js');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtxRef.current.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioCtxRef.current, 'audio-stream-processor');

    // 4. Handle incoming PCM from Worklet and send to Backend
    workletNode.port.onmessage = (event) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(event.data.buffer); // Send raw Float32Array
      }
    };

    source.connect(workletNode);
    workletNode.connect(audioCtxRef.current.destination);

};

return <button onClick={startStreaming}>Start Live Translation</button>;
}

Key Technical Details

- Sample Rate: Setting the AudioContext to 16000 Hz directly in the browser is the most efficient way to match the requirements of ASR models like Qwen or Whisper.
- Data Format: Sending raw Float32 PCM is standard for modern web audio, but if your backend (vLLM) expects Int16, perform the conversion inside the onmessage handler before sending.
- Low Latency: Using AudioWorklet instead of ScriptProcessor (deprecated) or MediaRecorder reduces audio processing lag to near-zero levels. [2, 3, 6, 7, 8]

To keep your pipeline efficient, you should handle VAD (Voice Activity Detection) in the browser. This prevents your GPU from wasting cycles on "empty" audio and avoids sending background noise to the ASR model.
The best tool for this is Silero VAD, which is extremely lightweight and accurate.

1. The VAD logic in the Frontend
   You can wrap your AudioWorklet with a VAD check. If the "speech probability" is low, you skip sending that chunk to the WebSocket.

// apps/web/utils/vad.js (Conceptual logic for AudioClient.js)import { Silero } from '@ricky0123/vad-web'; // Highly recommended library
const startStreamingWithVAD = async () => {
const vad = await Silero.new({
onSpeechStart: () => {
console.log("Speech detected - resuming stream");
},
onSpeechEnd: (audio) => {
// 'audio' is the final float32 array of the spoken segment
if (socketRef.current?.readyState === WebSocket.OPEN) {
socketRef.current.send(audio.buffer);
// Optional: Send a "commit" message to signal ASR to finalize
socketRef.current.send(JSON.stringify({ type: "END_OF_SPEECH" }));
}
},
onVADPositive: (probability) => {
// If probability > 0.5, you can also stream real-time chunks here
}
});

const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
vad.receive(stream);
};

2. Backend Gating (The "Speech Gateway")
   If you prefer to handle VAD on the server (to keep the client ultra-thin), use webrtcvad in your Python speech-gateway.

# apps/speech-gateway/vad_utils.pyimport webrtcvad

vad = webrtcvad.Vad(3) # Aggressiveness level (0-3)
def is_speech(audio_chunk, sample_rate=16000): # webrtcvad expects 10, 20, or 30ms frames of 16-bit PCM
return vad.is_speech(audio_chunk, sample_rate)

# Inside your WebSocket loop:if is_speech(raw_pcm):

    accumulator.append(raw_pcm)else:
    if len(accumulator) > 0:
        # User just stopped speaking, trigger MT/TTS pipeline
        process_full_sentence(accumulator)
        accumulator = []

Why this is critical for your stack:

1.  Cost/Compute: vLLM (ASR) is heavy. Gating by VAD ensures you only call the model when there is actual content.
2.  Accuracy: ASR models often hallucinate "thank you" or "um" when listening to pure silence or background hum.
3.  MT Triggering: VAD provides the "natural pause" signal needed to know when a sentence is finished so you can send it to the Marian MT Adapter.

Final Pipeline Flow:

1.  Client: Captures audio -> Local VAD check.
2.  Gateway: Receives speech chunks -> Accumulates until a "silence" threshold.
3.  ASR: Transcribes accumulated buffer.
4.  MT: Translates text.
5.  TTS: Generates audio.
6.  Client: Plays translated audio.
