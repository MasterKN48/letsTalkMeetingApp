# Stage 1: Build stage
FROM oven/bun:latest AS build
WORKDIR /app

# Install monorepo dependencies
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
RUN bun install --frozen-lockfile

# Copy web app source and build Next.js (with standalone output)
COPY apps/web/ ./apps/web/
WORKDIR /app/apps/web

# Build with standalone output (as configured in next.config.ts)
RUN bun next build

# Stage 2: Runtime stage
FROM oven/bun:distroless AS runtime
WORKDIR /app

# Production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy Next.js standalone build and its assets
# The standalone output includes all necessary node_modules.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./.next/static
COPY --from=build /app/apps/web/public ./public

# Expose port
EXPOSE 3000

USER 65532:65532

# Using bun to run the standalone Next.js server
ENTRYPOINT ["bun"]
CMD ["run", "server.js"]
