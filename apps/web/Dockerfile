# Stage 1: Build stage
FROM oven/bun:latest AS build
WORKDIR /app

# Install monorepo dependencies
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
RUN bun install --frozen-lockfile

# Copy web app source and build Next.js (with standalone output)
COPY apps/web/ ./apps/web/
WORKDIR /app/apps/web

# Build with standalone output (as configured in next.config.ts)
RUN bun next build

# DEBUG: Verify standalone output exists
RUN ls -la /app/apps/web/.next/standalone/ || echo "STANDALONE DIR MISSING"
RUN ls -la /app/apps/web/.next/standalone/server.js || echo "server.js MISSING"

# Stage 2: Runtime stage
FROM oven/bun:distroless AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy the standalone bundle as the working directory
COPY --from=build /app/apps/web/.next/standalone ./    
COPY --from=build /app/apps/web/.next/static ./.next/static
COPY --from=build /app/apps/web/public ./public

# Expose port
EXPOSE 3000

USER 65532:65532

# Bun is the entrypoint; run Next.js standalone server via the start script
ENTRYPOINT ["bun"]
CMD ["server.js"]
