# AI Engineering Strategy (AGENTS.md)

## 🏢 Project Overview
This project is a high-performance WebRTC meeting application built as a monorepo. It leverages **Mediasoup** for low-latency media routing and **Bun** for both runtime and server performance.

### Architecture
- **Monorepo Structure**: Uses Bun Workspaces.
  - `/apps/server`: Signaling API (Hono + OpenAPI + Mediasoup).
  - `/apps/web`: Frontend Application (Next.js 16 + Tailwind CSS).
- **Communication**: WebSocket-based signaling with JWT authentication.
- **Media Routing**: Selective Forwarding Unit (SFU) architecture via Mediasoup.

## 🤖 Directives for AI Agents

### Coding Standards
- **Runtime**: Always prefer `Bun` over `Node`.
- **Frameworks**:
  - Backend: `OpenAPIHono` from `@hono/zod-openapi` for type-safe API/Documentation.
  - Frontend: `Next.js` (App Router) with `Tailwind CSS`.
- **Typing**: Strict TypeScript. Avoid `any` except when bypassing complex library inference issues (documented in `apps/server/index.ts`).
- **Media**: Mediasoup code should be optimized for CPU efficiency and handle proper producer/consumer lifecycle management.

### Deployment & DevOps
- **Docker**: Always use `multi-stage` builds and `distroless` runtimes to keep images minimal and secure.
- **Capabilities**: Containers should run with `cap_drop: [ALL]` where possible.

### Git & Hooks
- **Husky**: Pre-commit hooks are active. Ensure code passes linting and basic checks before committing.

## 🛠️ Key Commands
- `bun dev`: Runs both web and server in watch mode.
- `bun build`: Builds the entire monorepo for production.
- `docker compose up --build`: Spins up the full secure production environment.
