# 🎥 Mediasoup Meeting App (Monorepo)

A high-performance, secure, and modern WebRTC application built with **Mediasoup (SFU)**, **Bun**, and **Next.js 16**.

## ✨ Key Features
- **SFU Architecture**: Leverages Mediasoup for high-bandwidth, multi-user media routing instead of resource-intensive Mesh/P2P.
- **Low Latency**: Sub-250ms latency for global video/audio streaming.
- **Security First**: JWT-authenticated signaling and Mediasoup DTLS/SRTP protection.
- **Modern UI/UX**: Next.js 16 powered with View Transitions API and Partial Prerendering (PPR).
- **Type Safety**: End-to-end TypeScript with Zod-OpenAPI for self-documenting APIs.
- **High-Fidelity Media**: Support for 1080p60 streaming with adaptive simulcast layers (HD, SD, Low) for optimal performance.
- **Scalable Infrastructure**: Containerized with Docker and ready for Kubernetes.


## 🛠️ Technical Stack
- **Runtime**: [Bun](https://bun.sh/) (Server & Tooling)
- **Media Engine**: [Mediasoup](https://mediasoup.org/) (SFU / Selective Forwarding Unit)
- **Backend Framework**: [Hono](https://hono.dev/) (with Zod-OpenAPI)
- **Frontend Framework**: [Next.js 16](https://nextjs.org/) (App Router & PPR)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **API Documentation**: [Swagger UI](https://swagger.io/) & [AsyncAPI](https://www.asyncapi.com/)
- **Containerization**: [Docker](https://www.docker.com/) (Distroless Node)


## 🚀 Quick Start

1.  **Install Bun**: `curl -fsSL https://bun.sh/install | bash`
2.  **Install dependencies**: `bun install`
3.  **Start Developing**: `bun dev` (Runs both `/apps/server` and `/apps/web`)

## 🏗️ Project Structure

- **`apps/server`**: Hono-based Signaling Server (Swagger Docs: `http://localhost:3001/docs`)
- **`apps/web`**: Next.js 16 Frontend (App Router, Tailwind 4)
- **`docs/`**: Detailed project documentation.

## 📡 Architecture & Signaling Flow

The application uses a dual-protocol approach: **REST** for authentication and system health, and **Secure WebSockets (WSS)** for low-latency media signaling. 

> [!TIP]
> For a full deep-dive including JSON examples and event references, check the **[Signaling & Media Flow Guide](docs/architecture.md)**.

### Session Lifecycle Sequence
Below is the sequence of events between the Client (Next.js) and Server (Bun/Mediasoup) for a typical meeting session.


```mermaid
sequenceDiagram
    participant C as Client (Frontend)
    participant S as Server (Signaling/SFU)

    Note over C,S: 1. Authentication & Socket
    C->>S: POST /auth/login
    S-->>C: JWT Token
    C->>S: WSS /?token=JWT
    S-->>C: WebSocket Connected

    Note over C,S: 2. Room Synchronization
    C->>S: join-room { roomId }
    S-->>C: response { rtpCapabilities, existingProducers }

    Note over C,S: 3. Mediasoup Transport Setup
    C->>S: create-transport { roomId }
    S-->>C: response { params: ice, dtls, candidates }
    C->>S: connect-transport { transportId, dtlsParameters }

    Note over C,S: 4. Producing Media (Local)
    C->>S: produce { kind, rtpParameters }
    S-->>C: response { id: producerId }
    S->>S: Broadcast "new-producer" to Peers

    Note over C,S: 5. Consuming Media (Remote)
    C->>S: consume { producerId, rtpCapabilities }
    S-->>C: response { params: id, kind, rtpParameters }
    C->>S: resume-consumer { consumerId }

    Note over C,S: 6. Cleanup
    C->>S: Close WebSocket / Disconnect
    S->>S: Close Producers/Consumers
    S->>S: Broadcast "producer-closed" to Peers
```


## 📚 Learning & Documentation

We've provided comprehensive documentation to help you understand the architecture, protocols, and deployment of this project:

-   **[Signaling & Media Flow](docs/architecture.md)**: Detailed events, diagrams, and example signaling data.
-   **[Signaling Server Deep-Dive](docs/server.md)**: Hono, Zod-OpenAPI, and WebSocket logic.
-   **[Web App Architecture](docs/web.md)**: Next.js 16, Mediasoup-client, and Frontend state.
-   [Mediasoup & SFU Core Concepts](docs/mediasoup.md): Routers, Transports, Producers, and Consumers.
-   [DevOps & Deployment](docs/devops.md): Docker, Husky, Compose, and Distroless security.
-   [Future Roadmap](docs/future_improvements.md): HLS Streaming and Performance Optimization.
-   [Architecture Directives](AGENTS.md): Project-level rules for AI engineering.


## 🐳 Docker Deployment

To spin up the full production environment locally:

```bash
docker compose up --build
```

---

*Built with ❤️ in 2026 using the latest tech stack.*
