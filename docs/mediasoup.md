# Mediasoup (SFU) Architecture

This project is a **Selective Forwarding Unit (SFU)**, powered by **Mediasoup**.

## 🔄 P2P vs. SFU
- **P2P (mesh)**: Everyone sends video to everyone else. It's expensive for clients (CPU/Upload bandwidth) and doesn't scale well (N*N connections).
- **SFU (mediasoup)**: Everyone sends **one** stream to the server. The server then replicates and forwards it to everyone else. The client only needs **one** upload and **one** download *per participant*.

## 🏗️ Core Structural Entities

### 1. Worker (The Process)
A Mediasoup process is a single-threaded C++ worker. For multi-core scaling, we typically spawn one worker per CPU core.

### 2. Router (The Virtual Room)
Each room has its own Router. It manages:
- **RtpCapabilities**: Codecs (VP8, VP9, Opus, H.264) supported by clients and the server.
- **Matching**: Connecting Producers (senders) to Consumers (receivers).

### 3. Transport (The Pipe)
A `WebRtcTransport` represents a network tunnel between the Client and the SFU.
- **ICE & DTLS**: Negotiation protocols to handle NAT traversal and encryption.
- **Port Management**: Mediasoup requires a dynamic port range (e.g., 10000-10100) for these transports.

### 4. Producer (Sending)
Represents an incoming stream to the server (e.g., your camera).
-   `kind`: 'audio' or 'video'.
-   `rtpParameters`: How the media is encoded and sent.

### 5. Consumer (Receiving)
Represents an outgoing stream from the server (someone else's camera).
-   `producerId`: Which original stream this consumer is linked to.
-   `rtpParameters`: How the server sends the media to you.

## ⚙️ Lifecycle in this Project
Check `apps/server/index.ts` to see how we handle these events:
1.  `worker.createRouter({ mediaCodecs })`
2.  `router.createWebRtcTransport({ ... })`
3.  `transport.produce({ kind, rtpParameters })`
4.  `transport.consume({ producerId, rtpCapabilities })`
