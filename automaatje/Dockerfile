# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

# Install production dependencies and cron
RUN apk add --no-cache \
    tini \
    && npm install -g tsx

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Copy necessary source files for job processor
COPY app ./app
COPY lib ./lib
COPY scripts ./scripts
COPY drizzle ./drizzle
COPY next.config.ts ./
COPY middleware.ts ./
COPY tsconfig.json ./

# Create data directory
RUN mkdir -p /data

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3123
ENV DATABASE_URL=/data/sqlite.db

# Expose port
EXPOSE 3123

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Run the entrypoint script
CMD ["/docker-entrypoint.sh"]
