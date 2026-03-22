#!/usr/bin/env bash
# start-python-local.sh
# Bootstraps and starts all Python Translation Adapters locally using uv

set -e

echo "==================================="
echo " Installing dependencies using uv  "
echo "==================================="

# Ensure we are at the monorepo root
if [ ! -d "apps/speech-gateway" ]; then
  echo "Please run this script from the root of the meetingApp monorepo."
  exit 1
fi

for service in asr-adapter mt-adapter tts-adapter speech-gateway; do
  echo "-> Setting up dependencies for $service..."
  cd "apps/$service"
  
  # Create a virtual environment using Fast uv
  uv venv .venv
  
  # Ensure the venv uses the uv wrapper to install pip deps super fast
  VIRTUAL_ENV=".venv" uv pip install -r requirements.txt
  
  cd ../../
done

echo "==================================="
echo " Starting Local Uvicorn Servers    "
echo "==================================="

# Function to kill all background processes on exit
cleanup() {
  echo "Shutting down all local Python servers..."
  kill $(jobs -p) 2>/dev/null
  exit
}
trap cleanup EXIT INT TERM

cd apps

echo "[ASR Adapter] Starting on port 8000..."
source asr-adapter/.venv/bin/activate
uvicorn asr-adapter.main:app --port 8000 --host 127.0.0.1 &
deactivate

echo "[MT Adapter] Starting on port 8001..."
source mt-adapter/.venv/bin/activate
uvicorn mt-adapter.main:app --port 8001 --host 127.0.0.1 &
deactivate

echo "[TTS Adapter] Starting on port 8002..."
source tts-adapter/.venv/bin/activate
uvicorn tts-adapter.main:app --port 8002 --host 127.0.0.1 &
deactivate

echo "[Speech Gateway] Starting on port 8003..."
source speech-gateway/.venv/bin/activate
ASR_WS_URL="ws://127.0.0.1:8000/v1/audio/stream" \
MT_WS_URL="ws://127.0.0.1:8001/ws/translate" \
TTS_WS_URL="ws://127.0.0.1:8002/ws/speech" \
uvicorn speech-gateway.main:app --port 8003 --host 127.0.0.1 &

# Wait for all background jobs
wait
