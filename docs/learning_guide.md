# 🎓 Project Learning Guide: Advanced System Architecture

This document serves as a comprehensive guide to the technologies and architectural patterns used in this high-performance WebRTC monorepo. It is designed for developers who want to understand how **Next.js 16**, **Mediasoup**, and **Bun** work together to create a cutting-edge communication platform.

---

## 🚀 1. The Power of Bun (Runtime & Server)

### Why Bun?
- **Speed**: Bun is an all-in-one JavaScript runtime (using JavaScriptCore) that is significantly faster than Node.js for cold starts and execution.
- **Native WebSockets**: This project leverages `Bun.serve({ websocket: { ... } })` in the server app. This is a high-performance, native implementation that simplifies signaling without needing heavy libraries like Socket.io.
- **Unified Tooling**: Bun acts as the package manager, bundler, and runner for the entire monorepo, providing a seamless DX.

---

## 📡 2. Server Architecture: Hono + Mediasoup

### Hono & OpenAPI
- **OpenAPIHono**: We use `@hono/zod-openapi` to define our API.
- **Type Safety**: Routing, request validation, and response schema are all derived from Zod.
- **Unified Documentation**: The server automatically generates **Swagger** (REST) and **AsyncAPI** (WebSockets) documentation from a single source of truth.

### Mediasoup (SFU Model)
Mediasoup is a **Selective Forwarding Unit (SFU)** rather than a MCU. It doesn't mix media; it intelligently routes it.
- **Workers**: Multi-process workers that leverage multi-core CPUs for heavy media processing.
- **Routers**: Isolated "rooms" for media traffic.
- **Transports (WebRTC)**: Endpoints where clients connect via UDP/TCP.
- **Producers**: When a client sends a stream (mic/cam), a Producer is created on the server.
- **Consumers**: When a client wants to receive a stream, the server creates a Consumer on that client's transport.

---

## 📱 3. Next.js 16 Frontend Concepts

### Page & Layout System
- **`layout.tsx`**: Defines the shared UI (like fonts, themes, and shell) that persists during navigation.
- **`page.tsx`**: The entry point for specific routes. In this project, we prioritize making these **Server Components**.

### Server vs. Client Components
- **Server Components (Default)**: Rendered on the server. They reduce the amount of JavaScript sent to the browser and are excellent for SEO and data fetching.
- **`use client` Directive**: We use this only when necessary—for hooks (`useState`, `useEffect`) and interactive UI elements like the video grid or the join form.
- **Hydration Isolation**: By keeping the `page.tsx` as a Server Component and importing `use client` components like `JoinRoomForm` inside it, we keep the static parts of the page static (0 hydration cost).

### Partial Prerendering (PPR) & Cache Components
This project implements the newest **Next.js 16 PPR model**.
- **Configuration**: Enabled via `cacheComponents: true` in `next.config.ts`.
- **The Suspense Pattern**: We wrap dynamic client-side "Islands" (like the video grid) in `<Suspense>`.
- **Static Shell**: During the request, Next.js sends the static parts of the page (Header, Background, Features) immediately from the cache, while the dynamic parts are streamed in as they hydrate.

### View Transitions API
Next.js 16 experimental support for the browser **View Transitions API**:
- **Enablement**: `experimental: { viewTransition: true }`.
- **Navigation**: Uses `router.push(url, { viewTransition: true })`.
- **CSS Synergy**: Using `view-transition-name: logo` in our CSS allows elements to animate smoothly into new positions even when the page DOM structure changes during navigation.

---

## 🎨 4. UI System: Shadcn + Glassmorphism

### Shadcn/UI Component Architecture
- **Philosophy**: Components are owned, not just installed. We use Radix-based primitives styled with Tailwind.
- **Advanced Components**:
    - **`GlassDock`**: A custom implementation of a responsive, blurred control bar.
    - **`PerspectiveGrid`**: A CSS-based dynamic background that reacts to themes.

### Aesthetics & Performance
- **Zero Placeholder Policy**: All visual elements are generated or computed to ensure a premium feel.
- **Tailwind v4/Next.js 16 Compatibility**: Using the latest CSS features like `@theme` and `oklch` colors for vibrance and low-light excellence.

---

## 🛠️ 5. Development Workflow

### Key Learning Exercises
1.  **Inspect Signaling**: Open the browser's Network tab (WS section) to watch the `join-room`, `new-producer`, and `consume` flow.
2.  **Experiment with PPR**: Check the network "Waterfall" in the Performance tab to see how the static shell loads before the dynamic form hydrates.
3.  **Mediasoup Debugging**: Review the server console logs to see Worker and Producer PIDs being managed in real-time.

---

*This project is built to be a template for modern AI-integrated communication apps. Study the interplay between the Bun runtime and Next.js 16 streaming for the best understanding.*
