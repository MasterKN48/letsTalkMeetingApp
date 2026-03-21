# Client Web Application (Frontend)

The frontend is a **Next.js 16** project built with **App Router**, **TypeScript**, and **Tailwind CSS**.

## 🏗️ Next.js 16 Features
- **App Router**: Uses server-side rendering (SSR) by default for layout but manages stateful WebRTC logic in Client components.
- **Dynamic Routing**: The `room/[roomId]` segment allows direct access to isolated meeting rooms.

## 🎥 Mediasoup-Client Orchestration
Handling Mediasoup in the browser is complex and involves several asynchronous steps. We use a custom **`MediasoupClient`** wrapper class located in `src/lib/mediasoup.ts`.

### MediasoupClient Header Class Structure
```typescript
export class MediasoupClient {
  private ws: WebSocket | null = null;
  private device: Device | null = null;
  private sendTransport: types.Transport | null = null;
  private recvTransport: types.Transport | null = null;
  private producers: Map<string, types.Producer> = new Map();
  private consumers: Map<string, types.Consumer> = new Map();
  // ... callbacks for UI integration
}
```

### Key Implementation Details:
- **WebSocket `request`**: Each message sent using `request()` includes a `requestId`. A Promise is created and stored in a `pendingRequests` Map, which is resolved when the server sends a matching `response`.
- **Media Transports**: The `initTransports()` method invokes `create-transport` on the server and then calls `device.createSendTransport()` or `device.createRecvTransport()` with the server-provided parameters.
- **Producing**: The `produce(track)` method uses the `sendTransport` and updates the internal `producers` map.
- **Consuming**: The `consume(producerId)` method asks the server to create a consumer and then initializes it locally on the `recvTransport`.

### State Flow (Lobby -> Room Transition)
1. **Lobby Preview**: The camera is turned on immediately for the user to adjust their appearance.
2. **HandleJoin()**:
   - `MediasoupClient` is instantiated with room-specific callbacks.
   - `client.connect(token)` establishes the WebSocket connection.
   - `client.joinRoom()` gets the initial state and room capabilities.
   - `client.initTransports()` prepares the sending and receiving pipelines.
   - `client.produce(track)` publishes the local streams.

## 🎨 UI Architecture
- **State Map**: `remoteStreams` is a `Map<string, { stream: MediaStream, userName: string }>` that reactive components iterate over to render the video grid.
- **Component Lifecycle**: We use `useEffect` extensively for cleaning up streams and the WebSocket connection when the component unmounts.

## 📦 State Management
- **React Refs (`useRef`)**: Crucial for persistent objects like the `MediasoupClient` and `localVideo` elements that must survive re-renders.
- **React State (`useState`)**: Manages UI flags (`showLobby`, `isJoined`), local media tracks, and the `remoteStreams` map.
- **Cleanup**: The `useEffect` cleanup function ensures that WebSockets are closed and camera tracks are stopped when the user leaves.
