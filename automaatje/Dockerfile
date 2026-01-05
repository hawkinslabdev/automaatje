# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build Next.js application with standalone output
RUN npm run build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

# Install only required system dependencies
RUN apk add --no-cache tini wget

# Copy standalone Next.js output (includes minimal node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy package.json for npm scripts
COPY --from=builder /app/package.json ./package.json

# Copy only necessary runtime files for job processor
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/get-tsconfig ./node_modules/get-tsconfig
COPY --from=builder /app/node_modules/resolve-pkg-maps ./node_modules/resolve-pkg-maps
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

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
