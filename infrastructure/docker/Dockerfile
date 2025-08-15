# Multi-stage Dockerfile for Monad Synapse Casino Platform
# Optimized for production deployment with security and performance

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace package files
COPY apps/web/package*.json ./apps/web/
COPY packages/ui/package*.json ./packages/ui/

# Install dependencies
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Stage 2: Builder
FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public

# Set correct permissions for pre-built assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Install production dependencies only
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    tini \
    && rm -rf /var/cache/apk/*

# Create healthcheck script
RUN echo '#!/bin/sh\ncurl -f http://localhost:3000/api/health/basic || exit 1' > /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

# Use tini as init system for proper signal handling
ENTRYPOINT ["tini", "--"]

# Start the application
CMD ["node", "server.js"]

# Metadata
LABEL maintainer="Monad Synapse Team"
LABEL description="Monad Synapse Casino Platform"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/monad-synapse/casino-platform"
LABEL org.opencontainers.image.documentation="https://docs.monadsynapse.com"
LABEL org.opencontainers.image.vendor="Monad Synapse"