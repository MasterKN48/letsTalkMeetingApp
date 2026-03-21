# Stage 1: Build stage with compiler tools
FROM oven/bun:latest AS base
WORKDIR /app

# Mediasoup native build dependencies
RUN apt-get update && apt-get install -y python3 make gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies (Monorepo root)
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
RUN bun install --frozen-lockfile

# Copy server source
COPY apps/server/ ./apps/server/
WORKDIR /app/apps/server

# Build the server code into a single executable bundle
RUN bun build ./index.ts --target bun --outfile ./dist/index.js

# Robustly find and stage the mediasoup worker binary
# In Bun monorepos, it could be in root node_modules or workspace node_modules
RUN mkdir -p /app/staging && \
    cp $(find /app -name mediasoup-worker | grep Release | head -n 1) /app/staging/mediasoup-worker

# Stage 2: Final runtime image (Distroless for minimal size/security)
FROM oven/bun:distroless AS runtime
WORKDIR /app

# Production environment
ENV NODE_ENV=production

# Copy the bundled server code
COPY --from=base /app/apps/server/dist/index.js ./

# Mediasoup requires its external worker binary to be present at a specific relative path
# We copy it to a path where the mediasoup library expects it
COPY --from=base /app/staging/mediasoup-worker ./node_modules/mediasoup/worker/out/Release/mediasoup-worker

# Expose the API and WebRTC ports
EXPOSE 3001
EXPOSE 10000-10100/udp

# Run with non-root user (1001 is common in distroless but Bun user might be "bun")
USER 65532:65532

ENTRYPOINT ["bun"]
CMD ["run", "index.js"]
