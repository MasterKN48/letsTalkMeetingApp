# AstroMeet - Premium SFU WebRTC Meeting App

Built with Mediasoup, Hono, Next.js 15, and Bun.

## Architecture
- **SFU**: Mediasoup (Selective Forwarding Unit)
- **Signaling**: Socket.io on Hono Server
- **Frontend**: Next.js (App Router) + medasoup-client

## Getting Started

1. **Install Dependencies**
   ```bash
   bun install
   ```

2. **Run Development**
   ```bash
   bun dev
   ```

## Structure
- `apps/web`: Next.js frontend
- `apps/server`: Hono + Mediasoup backend (Port 3001)
