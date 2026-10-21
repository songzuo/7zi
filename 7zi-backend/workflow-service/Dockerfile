# Workflow Service Dockerfile
# Multi-stage build for optimized production image

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only needed for build
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Production image
FROM base AS production
WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/

# Create non-root user for security
RUN addgroup -g 1001 -S wfgroup && \
    adduser -S wfuser -u 1001 -G wfgroup
USER wfuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start command
CMD ["node", "src/index.js"]
