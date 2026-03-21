# 🏢 Project Architecture & Engineering Strategy

This project is a high-performance WebRTC meeting application built as a monorepo. It leverages **Mediasoup** for low-latency media routing and **Bun** for both runtime and server performance.

## 🏗️ System Architecture

### Monorepo Structure (Bun Workspaces)
- `/apps/server`: Signaling API & Mediasoup SFU.
  - **Framework**: `OpenAPIHono` for type-safe REST/WS documentation.
  - **Signaling**: WebSocket-based (Bun.serve) with JWT-protected connections.
  - **Media Engine**: Mediasoup (SFU - Selective Forwarding Unit).
- `/apps/web`: Frontend Application.
  - **Framework**: Next.js 16 (App Router) + Tailwind CSS.
  - **Media Client**: `mediasoup-client` wrapped in a custom `MediasoupClient` class.

## 📡 Media & Signaling Detail

### Signaling Flow
1. **Authentication**: Client POSTs to `/auth/login` to receive a JWT containing `userId`, `userName`, and `roomId`.
2. **Connection**: Client connects to WebSocket at `/` with `?token=JWT`.
3. **Join Room**: Client sends `join-room` message. The server creates/retrieves a Mediasoup Router for that room and returns `rtpCapabilities` and `existingProducers`.
4. **Transport Setup**: Client initializes the Mediasoup `Device` with router capabilities and creates `send` and `recv` `WebRtcTransport` objects through the signaling server.
5. **Producing**: Client publishing media (audio/video tracks) generates a `Producer` on the server. The server broadcasts a `new-producer` event to other participants in the room.
6. **Consuming**: Remote clients receive `new-producer`. They request a `Consumer` for that producer, which is created on their `recv` transport.

### WebSocket Communication Pattern
- **Request-Response**: Most signaling messages include a `requestId`. The server replies with `{ type: 'response', requestId, data }`.
- **Broadcasting**: Events like `new-producer` and `producer-closed` are published to room-specific pub/sub topics (e.g., `room:ROOM_ID`).

### Mediasoup Server Core
- **Workers**: High-performance multi-process media processing (RTC ports 10000-10100).
- **Routers**: Isolated media environments per room.
- **Transports**: WebRTC endpoints configured with `announcedIp` for proper NAT traversal.
- **Producers/Consumers**: Abstract representations of media tracks; automatically cleaned up on socket closure.

## 📱 Frontend Architecture

### Core Media Logic (`/apps/web/src/lib/mediasoup.ts`)
- **`MediasoupClient`**: A wrapper class that hides the complexity of signaling and media orchestration.
- **Device Load**: The `mediasoup-client` `Device` is loaded once per room join.
- **State Flow**: Lobby Preview -> Authentication -> Signaling Connect -> Transport Creation -> Media Production -> Consumption Sync.

### UI Architecture (`/apps/web/src/app/room/[roomId]/page.tsx`)
- **Lobby Concept**: Prevents unauthorized access and allows camera/mic testing before joining.
- **Video Grid**: Dynamically scales based on `remoteStreams` (Map of User IDs to MediaStreams).
- **Control System**: Centralized dock for muting, camera toggle, and room sharing.

## 🤖 Directives for AI Agents

### Coding Standards
- **Runtime**: Always prefer `Bun` over `Node`.
- **Frameworks**:
  - Backend: `OpenAPIHono` from `@hono/zod-openapi` for type-safe API/Documentation.
  - Frontend: `Next.js` (App Router) with `Tailwind CSS`.
- **Typing**: Strict TypeScript. Use `any` only for complex external library types (documented).
- **Cleanup**: Always ensure producers are closed and transports are disposed of during component unmounting or socket disconnection.

### Documentation Endpoints
- **REST Swagger**: `http://localhost:3001/docs`
- **WS AsyncAPI**: `http://localhost:3001/asyncapi`
- **Health Check**: `http://localhost:3001/health`

### Deployment & DevOps
- **Docker**: Always use `multi-stage` builds.
- **Media Ports**: Ensure Docker exposes the specified RTC port range (10000-10100) for WebRTC traffic.

## 🛠️ Key Commands
- `bun dev`: Runs both web and server in watch mode using `concurrently`.
- `bun build`: Builds the entire monorepo for production.
- `docker compose up --build`: Spins up the full secure production environment.
