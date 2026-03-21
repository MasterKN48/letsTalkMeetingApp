# 🚀 Future Architecture & Performance Roadmap

This document outlines key technical improvements and strategic additions to take this Mediasoup project from a proof-of-concept to a production-grade, high-scale application.

## 📺 1. Hybrid Streaming with HLS
While WebRTC is unbeatable for real-time interaction (<200ms latency), scaling it to thousands of viewers is resource-intensive. 

### Proposed Integration:
- **Large-Scale Broadcasting**: For sessions with 5 speakers and 10,000 "passive" viewers, record the Mediasoup session on the server and use **FFmpeg** to transcode it into an HLS stream.
- **Recording & Playback**: Enable "Live DVR" so viewers can rewind the meeting in real-time.
- **Improved Accessibility**: HLS works natively on almost all devices (Smart TVs, legacy browsers), providing a reliable fallback for WebRTC.

---

## ⚡ 2. Performance & Speed Optimizations

### 🛡️ Layering (Simulcast & SVC)
Currently, participants send a single high-resolution stream. This is inefficient for users with weak connections.
- **Simulcast**: Have clients send three quality layers (Low, Mid, High). The SFU will selectively forward based on each receiver's available bandwidth.
- **Scalable Video Coding (SVC)**: Use VP9 or AV1 codecs to send a single stream that can be decoded at multiple resolutions.

### 🏢 Scaling the SFU
Mediasoup is single-threaded per process. For high-scale rooms:
- **Worker Pools**: Spawn one Mediasoup `Worker` per CPU core.
- **Router Piping**: Connect multiple routers across different workers or even different servers using `router.pipeToRouter()` for massive participant counts.

### 📡 Network & Infrastructure
- **UDP over TCP**: Prioritize raw UDP for media to prevent "freezing" caused by TCP re-transmission.
- **Docker Networking**: In production, use `network: host` to bypass the Docker bridge overhead and reduce packet latency.
- **Announced IP Tuning**: Ensure the server uses the correct public IP for NAT traversal (ICE/STUN/TURN).

### ⚛️ Frontend Enhancements (DX & Performance)
- **Web Workers**: Move signaling and Mediasoup state management out of the React main thread to keep the UI at a buttery-smooth 60FPS.
- **Offscreen Canvas**: Use `OffscreenCanvas` for heavy video rendering or effects (like blur) to prevent main-thread blocking.
- **Optimized Re-renders**: Apply `React.memo` and `useRef` carefully to prevent expensive video grid updates when simple state changes occur (e.g., chat messages).
