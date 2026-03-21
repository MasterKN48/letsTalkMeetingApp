# DevOps & Infrastructure Strategy

This project is built for production from the start, prioritizing security and developer experience.

## 🐳 Docker & Docker Compose
We use a **multi-stage build** strategy to separate the build environment (with compilers and tools) from the runtime environment (minimal).

### Two-Stage Builds:
1.  **Stage 1: Build Image** (`oven/bun:latest`):
    -   Installs compilers (`gcc`, `g++`, `make`, `python3`) needed to build **Mediasoup Worker**.
    -   Performs a `bun next build` (frontend) and `bun build` (server).
2.  **Stage 2: Runtime Image** (`oven/bun:distroless`):
    -   **Minimal Footprint**: No shell, no excess binaries.
    -   **Security**: Minimal attack surface.
    -   Contains only the final binaries (`mediasoup-worker`) and the bundled JS.

### Docker Compose
- `meeting-server`: Exposes the signaling port (3001) and the UDP port range (10000-10100) for WebRTC traffic.
- `meeting-web`: Serves the Next.js frontend on port 3000.

## 🛡️ Security Hardening
In `docker-compose.yml`, we apply several security optimizations:
- `cap_drop: [ALL]`: Drops all Linux kernel capabilities.
- `no-new-privileges:true`: Prevents a process from gaining more privileges than its parent.
- `USER 65532:65532`: Runs the application as a non-privileged system user.

## 🏗️ Husky & Pre-Commit Hooks
To ensure the project always stays in a healthy state, we use **Husky**.

### How it works:
- **Husky Init**: Installed via `npx husky init`.
- **Pre-commit script**: Located in `.husky/pre-commit`.
- **Function**: Automatically runs `bun build --filter "*"` before you can commit code. If the code doesn't build locally, the commit is rejected. This prevents broken code from ever reaching the repository.

### Configuration (`package.json`):
```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

## 🏗️ Monorepo Strategy
- **Bun Workspaces**: Managed in the root `package.json`.
- **Shared Dependencies**: Handled at the root level to minimize `node_modules` duplication across the server and web apps.
- **Filtering**: We use `bun --filter` to run commands in specific workspaces (e.g., `bun dev`).
