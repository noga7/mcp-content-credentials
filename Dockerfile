# Multi-stage build for MCP Content Credentials Server
FROM node:18-alpine AS builder

# Install Python and build dependencies for TrustMark
RUN apk add --no-cache python3 py3-pip build-base

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

# Install Python, pip, and runtime dependencies
RUN apk add --no-cache python3 py3-pip curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Install TrustMark and dependencies
RUN pip3 install --no-cache-dir trustmark Pillow

# Install c2patool
RUN curl -sLO https://github.com/contentauth/c2patool/releases/download/v0.9.9/c2patool-linux-intel && \
    chmod +x c2patool-linux-intel && \
    mv c2patool-linux-intel /usr/local/bin/c2patool

# Copy built files from builder
COPY --from=builder /app/build ./build
COPY scripts ./scripts

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Run the MCP server
CMD ["npm", "run", "start:mcp"]

