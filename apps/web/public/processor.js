class AudioStreamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 16kHz audio gives 16000 samples per second.
    // 200ms chunk = 16000 * 0.2 = 3200 samples.
    this.bufferSize = 3200;
    this.buffer = new Int16Array(this.bufferSize);
    this.bufferIndex = 0;
    this.sumSquares = 0;
  }

  process(inputs) {
    const input = inputs[0]; // Get the first input (mic)
    
    // Check if we have active input channels
    if (input && input.length > 0) {
      const channelData = input[0]; // Get the first channel (mono)
      
      for (let i = 0; i < channelData.length; i++) {
        // Clamp and normalize Float32 [-1, 1]
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        
        // Convert to Int16
        this.buffer[this.bufferIndex] = sample < 0 ? sample * 32768 : sample * 32767;
        
        // Accumulate for RMS VAD
        this.sumSquares += sample * sample;
        this.bufferIndex++;
        
        // When buffer is full (200ms reached)
        if (this.bufferIndex >= this.bufferSize) {
          const rms = Math.sqrt(this.sumSquares / this.bufferSize);
          
          // Basic VAD: only send chunk if RMS is above silence threshold
          if (rms > 0.01) {
            // Send the Int16 raw PCM data to the main thread
            this.port.postMessage(new Int16Array(this.buffer));
          }
          
          // Reset buffer
          this.bufferIndex = 0;
          this.sumSquares = 0;
        }
      }
    }
    return true; // Keep the processor alive
  }
}

registerProcessor('audio-stream-processor', AudioStreamProcessor);
