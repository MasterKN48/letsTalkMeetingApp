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

## 🌐 Port Management
Mediasoup requires specific port ranges for WebRTC traffic (configured in `apps/server/index.ts`):
- **RTC Ports**: 10000 - 10100 (UDP and TCP).
- **Announced IP**: Crucial for NAT traversal. The `ANNOUNCED_IP` environment variable ensures clients can reach the SFU behind a firewall or in a Docker container.
