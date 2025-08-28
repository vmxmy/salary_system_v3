# ============================================
# Multi-stage Dockerfile for Salary System v3
# ============================================

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS builder

# Build arguments
ARG BUILD_DATE
ARG GIT_COMMIT
ARG NODE_ENV=production

# Labels for image metadata
LABEL maintainer="salary-system-team" \
      version="3.0" \
      description="Salary Management System v3" \
      build-date=${BUILD_DATE} \
      git-commit=${GIT_COMMIT}

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    && npm install -g npm@latest

# Set working directory
WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies with optimizations
RUN npm ci --only=production --silent \
    && npm cache clean --force

# Copy source code
COPY frontend/ ./

# Set build-time environment variables
ENV NODE_ENV=${NODE_ENV}
ENV GENERATE_SOURCEMAP=false
ENV INLINE_RUNTIME_CHUNK=false

# Build the application
RUN npm run build

# ============================================
# Production stage
# ============================================
FROM nginx:alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    bash \
    tzdata \
    && rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=Asia/Shanghai

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Create necessary directories
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run \
    && chown -R appuser:appgroup /var/cache/nginx /var/log/nginx /var/run \
    && chown -R appuser:appgroup /usr/share/nginx/html

# Copy health check script
COPY .docker/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

# Start nginx
CMD ["nginx", "-g", "daemon off;"]