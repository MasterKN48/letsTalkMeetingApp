# Client Web Application (Frontend)

The frontend is a **Next.js 16** project built with **App Router**, **TypeScript**, and **Tailwind CSS**.

## 🏗️ Next.js 16 Features
- **App Router**: Uses server-side rendering (SSR) by default for layout but manages stateful WebRTC logic in Client components.
- **Standalone Build**: Configured in `next.config.ts` to produce a minimal production server that only includes necessary dependencies.
- **Fast Refresh**: Optimized for a better developer experience (DX).

## 🎥 WebRTC & Mediasoup-Client Integration
Handling video calls in the browser requires managing complex state and signaling. At its core, the app uses `mediasoup-client` to interact with our SFU.

### Step-by-Step Client Lifecycle:
1.  **Auth**: Request a JWT from the signaling server.
2.  **Socket**: Open a WebSocket with the token.
3.  **Produce (Mic/Camera)**:
    -   `navigator.mediaDevices.getUserMedia()` to get local tracks.
    -   Create a `sendTransport` on the server.
    -   Call `transport.produce({ track })` on the client.
4.  **Consume (Other People)**:
    -   Listen for a `new-producer` event from the server.
    -   Create a `recvTransport` locally.
    -   Call `transport.consume()` using server-provided parameters.

## 🎨 UI & Styling
- **Tailwind CSS 4**: Used for modern, utility-first styling.
- **Grid & Flexbox Layouts**: Ensures a responsive video grid that adapts to the number of participants.
- **Lucide Icons**: Provides clean, vector-based iconography.

## 📦 State Management
- **React Hooks**: `useState` and `useEffect` manage the lifecycle of media tracks and connections.
- **Custom Refs**: `useRef` is crucial for storing the `Device`, `Transport`, and `Producer` instances since we don't want them to trigger re-renders or be lost between renders.
