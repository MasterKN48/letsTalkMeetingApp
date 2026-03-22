FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for handling audio
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Install uv for blazingly fast package installation
RUN pip install uv

COPY requirements.txt .
# Use uv to install system-wide dependencies
RUN uv pip install --system -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
