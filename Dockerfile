# ==========================================
# Stage 1: Build stage
# ==========================================
FROM node:22-alpine AS builder

# Install build dependencies for native modules and Prisma engines
RUN apk add --no-cache openssl libc6-compat python3 make g++

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install full dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application configuration and source code
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Build NestJS application and seed script
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/prisma --skipLibCheck || true

# Prune devDependencies to keep production bundle lean
RUN npm prune --production

# ==========================================
# Stage 2: Production runner stage
# ==========================================
FROM node:22-alpine AS runner

# Install runtime dependencies for Prisma and process management
RUN apk add --no-cache openssl libc6-compat dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy package definitions and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy entrypoint initialization script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose API port
EXPOSE 4000

# Set dumb-init as PID 1 to handle signals gracefully
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
