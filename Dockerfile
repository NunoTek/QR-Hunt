# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
# Server code is in dist/server and expects build folder at dist/build
# Copy dist first, then copy build into dist/build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/build ./dist/build
COPY --from=builder /app/package.json ./dist/package.json

# Create data directory
RUN mkdir -p /app/data

# Build argument for port (default 3000)
ARG PORT=3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=${PORT}
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

# Run the application
CMD ["node", "dist/server/index.js"]
