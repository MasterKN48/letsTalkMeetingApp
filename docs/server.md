# Theater Signaling Server (Backend)

The backend is built with **Bun** using the **Hono** framework and specifically the `@hono/zod-openapi` extension. This provides a type-safe, auto-documenting API.

## 🚀 Key Technologies
- **Bun Runtime**: Provides native performance, faster startup, and built-in SQLite/WebSocket support.
- **Hono**: A small, fast, and web-standard based framework.
- **Zod OpenAPI**: Bridges the gap between Zod schemas and OpenAPI (Swagger) specifications.

## 📝 API Documentation (Swagger)
We use `createRoute` from `@hono/zod-openapi` to define our endpoints. This ensures that the documentation and the implementation never drift apart.

### How to use Swagger:
1.  Run the server (`bun dev`).
2.  Navigate to `http://localhost:3001/docs`.
3.  The documentation is auto-generated from the `loginRoute` definition in `apps/server/index.ts`.

### Example Route Definition:
```typescript
const loginRoute = createRoute({
  method: 'post',
  path: '/auth/login',
  request: {
    body: { content: { 'application/json': { schema: LoginSchema } } }
  },
  responses: {
    200: { content: { 'application/json': { schema: ResponseSchema } }, description: 'Success' }
  }
});
```

## 🔐 Authentication Flow
1.  **Identity**: The `/auth/login` endpoint generates a **JWT (JSON Web Token)**.
2.  **Authorization**: This token encodes the user's allowed `roomId` and `userId`.
3.  **Connection**: When the client connects via WebSocket, they MUST provide this token. This prevents users from joining rooms they aren't authorized for.

## 📡 WebSocket Signaling
The signaling server doesn't handle media directly; it facilitates the "negotiation" (SDP/RTP parameters) between the client and the Mediasoup SFU.

### Common Messages:
- `join-room`: Asks the server for the room's capabilities.
- `create-transport`: Creates a WebRTC transport on the server.
- `produce`: Sends local media to the server.
- `consume`: Receives media from another producer.
