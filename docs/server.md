# Signaling Server (Backend)

The backend is built with **Bun** using the **Hono** framework and specifically the `@hono/zod-openapi` extension. This provides a type-safe, auto-documenting API.

## 🚀 Key Technologies
- **Bun Runtime**: Provides native performance, faster startup, and built-in WebSocket support.
- **Hono**: A small, fast, and web-standard based framework.
- **Zod OpenAPI**: Bridges the gap between Zod schemas and OpenAPI (Swagger) specifications.

## 📝 API Documentation (Swagger & AsyncAPI)
We use `@hono/zod-openapi` to define our REST endpoints and a custom AsyncAPI spec for WebSockets.

### Documentation Endpoints:
- **REST (Swagger)**: `http://localhost:3001/docs` (Login, Health)
- **WebSockets (AsyncAPI)**: `http://localhost:3001/asyncapi` (Signaling Protocol)
- **Health Check**: `http://localhost:3001/health` (Uptime, Worker Stats)

## 🔐 Authentication & WebSocket Upgrade
The server uses `Bun.serve` to handle both REST and WebSocket traffic.
1.  **Handshake**: Clients must request the `/` path with a `?token=JWT` query parameter.
2.  **Validation**: The `fetch` handler verifies the JWT before calling `server.upgrade(req, { data: { ... } })`.
3.  **Context**: Authenticated user data (`userId`, `userName`, `roomId`) is stored in the `ws.data` context.
4.  **🔒 Security Hardening**: JWT verification is configured to **strictly enforce** the `HS256` algorithm. This prevents both the "none" algorithm attack and "algorithm confusion" attacks, where an attacker might try to use a public key as a HMAC secret.

## 📡 Mediasoup Server Implementation
The server manages the following core Mediasoup objects in memory:
- **Workers**: Single-threaded media processing processes.
- **Routers**: Virtual rooms associated with a specific core.
- **Transports**: `WebRtcTransport` objects configured for clients to send or receive media.

### State Management:
The server tracks these entities in Maps for efficient lookup during signaling:
```typescript
const rooms = new Map<string, mediasoup.types.Router>();
const producers = new Map<string, { producer: mediasoup.types.Producer, userId: string, ... }>();
const transports = new Map<string, mediasoup.types.WebRtcTransport>();
```

### Event Handling:
- **`join-room`**: Initializes the Router if not already present and returns current room metadata.
- **`produce`**: Creates a Producer and broadcasts a `new-producer` event to all other room subscribers.
- **`consume`**: Creates a Consumer linked to a specific producer, returning the necessary RTP parameters for the client.

## 📡 WebSocket Signaling Protocol
The signaling server facilitates the "negotiation" between the client and the Mediasoup SFU using a **Request-Response** pattern.

### Message Structure:
- **Request**: `{ type: string, data: object, requestId: string }`
- **Response**: `{ type: 'response', requestId: string, data: object }`
- **Events (Server -> Client)**: `{ type: string, data: object }` (e.g., `new-producer`, `producer-closed`)

### Common Operations:
- `join-room`: Asks the server for the room's RTP capabilities and existing producers.
- `create-transport`: Creates a `WebRtcTransport` on the server for sending or receiving.
- `connect-transport`: Finalizes the DTLS connection for a transport.
- `produce`: Sends local media tracks (audio/video) to the server.
- `consume`: Receives a specific producer's media from the server.
- `resume-consumer`: Starts the media flow for a consumer.
