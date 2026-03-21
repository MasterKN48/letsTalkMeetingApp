# Mediasoup (SFU) Architecture

This project is a **Selective Forwarding Unit (SFU)**, powered by **Mediasoup**.

## 🔄 P2P vs. SFU
- **P2P (mesh)**: Everyone sends video to everyone else. Expensive for clients and doesn't scale well (N² connections).
- **SFU (mediasoup)**: Everyone sends **one** stream to the server. The server replicate and forwards it. The client needs **one** upload and **N-1** downloads.

## 🏗️ Core Structural Entities
- **Worker**: A single-threaded C++ process. Managed by the Bun server.
- **Router**: The virtual room that manages audio/video codecs (RTP Capabilities).
- **Transport**: WebRTC endpoints between client and server.
- **Producer**: Incoming stream to the server (e.g., your camera).
- **Consumer**: Outgoing stream from the server (someone else's camera).

## ⚙️ Lifecycle in this Project

### 1. Room Creation
When the first user joins a room, a Mediasoup Router is created using the `mediaCodecs` configuration (currently supporting **audio/opus** and **video/VP8**).

### 2. State Management
The signaling server maintains in-memory Maps to track the state across the room:
- `rooms`: Map of `roomId` to `Router`.
- `producers`: Map of `producerId` to its metadata (userId, userName, roomId).
- `transports`: Map of `transportId` to the `WebRtcTransport`.

### 3. Disconnection & Cleanup
When a user disconnects:
1.  All `Producers` belonging to that user are closed on the server.
2.  The server broadcasts a `producer-closed` event to the specific room topic.
3.  Remote clients receive this and remove the corresponding streams from their UI.

## 🎥 Simulcast & Video Quality

This application uses **Simulcast (Multi-Layer Encoding)** to ensure high-performance video across varying network conditions.

### Multi-Tier Encodings
The video producer sends multiple quality layers simultaneously:
- **Low ('l')**: 360p @ 15fps, 100 kbps (Efficient for grid views/mobile).
- **Medium ('m')**: 720p @ 30fps, 400 kbps (Standard quality).
- **High ('h')**: 1080p @ 30fps, 1.2 Mbps (High fidelity).
- **Ultra ('f')**: 1080p @ 60fps, 4.0 Mbps (Premium quality for robust networks).

### 🚀 1080p@60fps Support
The system is configured to request **1080p at 60 frames per second** from the user's camera when available. The Mediasoup SFU intelligently manages these layers, delivering the highest possible quality to each viewer based on their individual bandwidth.

## 📺 Spotlight (Maximize) Mode

To enhance the meeting experience, the application includes a **Spotlight (Maximize)** feature:
- Users can click the **Maximize** icon on any video tile (including their own).
- The selected video becomes the primary focus (taking up major screen space).
- Other participants are moved to a high-density, scrollable side gallery.
- This transition is handled dynamically without re-negotiating the media stream, ensuring zero-latency switching.

## 🌐 Port Management
Mediasoup requires specific port ranges for WebRTC traffic (configured in `apps/server/index.ts`):
- **RTC Ports**: 10000 - 10100 (UDP and TCP).
- **Announced IP**: Crucial for NAT traversal. The `ANNOUNCED_IP` environment variable ensures clients can reach the SFU behind a firewall or in a Docker container.
