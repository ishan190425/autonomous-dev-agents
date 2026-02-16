# ADA SaaS Container
# Single container that runs autonomous AI dev agents on your repo
#
# Build: docker build -t ada-container .
# Run:   docker run -e GITHUB_TOKEN=xxx -e GITHUB_REPO=owner/repo -e ANTHROPIC_API_KEY=xxx ada-container
#
# Author: ⚙️ Engineering | Cycle 717 | Phase 1 Container MVP

FROM node:20-alpine AS base

# Install required system dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S ada && \
    adduser -u 1001 -S ada -G ada

WORKDIR /app

# ============================================
# Build stage: compile TypeScript
# ============================================
FROM base AS builder

# Copy package files for dependency installation
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/cli/package*.json ./packages/cli/

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev

# Copy source code
COPY tsconfig.json ./
COPY packages/core/ ./packages/core/
COPY packages/cli/ ./packages/cli/

# Build packages
RUN npm run build --workspace=packages/core && \
    npm run build --workspace=packages/cli

# ============================================
# Production stage: minimal runtime image
# ============================================
FROM base AS production

# Set environment
ENV NODE_ENV=production
ENV ADA_CONTAINER_MODE=true

# Copy built application from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/core/dist/ ./packages/core/dist/
COPY --from=builder /app/packages/cli/package.json ./packages/cli/
COPY --from=builder /app/packages/cli/dist/ ./packages/cli/dist/

# Copy templates needed for ada init
COPY templates/ ./templates/

# Install production dependencies only
RUN npm ci --omit=dev --workspace=packages/core --workspace=packages/cli && \
    npm cache clean --force

# Install OpenClaw globally (LLM agent gateway)
RUN npm install -g openclaw@latest && \
    npm cache clean --force

# Copy container entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create directories for runtime
RUN mkdir -p /app/workspace /app/logs && \
    chown -R ada:ada /app

# Switch to non-root user
USER ada

# Health check endpoint
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Labels
LABEL org.opencontainers.image.title="ADA SaaS Container"
LABEL org.opencontainers.image.description="Autonomous Dev Agents - AI-powered development team for your repo"
LABEL org.opencontainers.image.source="https://github.com/ishan190425/autonomous-dev-agents"
LABEL org.opencontainers.image.vendor="Rathi Industries"
LABEL org.opencontainers.image.version="1.0.0-alpha"

ENTRYPOINT ["/entrypoint.sh"]
