---
name: postgres-docker-discipline
description: >-
  Enforces database migration discipline, foreign-key and high-frequency search indexing in PostgreSQL/Prisma, and clean multi-container Docker orchestration. Use when modifying schema.prisma, database queries, Dockerfiles, or docker-compose.yml.
---

# PostgreSQL & Docker Discipline Standard

This skill establishes strict standards for database management (PostgreSQL 16, Prisma 6) and multi-container Docker orchestration across the full-stack e-commerce platform.

---

## 1. Prisma & PostgreSQL Migration Discipline

> [!CAUTION]
> **Zero `prisma db push` in Production/Staging**: `db push` can cause silent schema drifts and data loss. All schema evolutions must be tracked in versioned migration files.

### Standard Migration Lifecycle:

1. **Development Schema Update**:
   ```bash
   # In ecommerce-BE directory:
   npx prisma migrate dev --name add_mfa_backup_codes
   ```
2. **Production Deployment Command**:
   ```bash
   # Run only in CI/CD or container entrypoint:
   npx prisma migrate deploy
   ```
3. **Idempotent Database Seeding**:
   - `prisma/seed.ts` must use `upsert` exclusively (never blind `create`):
   ```typescript
   await prisma.brandSetting.upsert({
     where: { id: 'default' },
     update: {},
     create: { brandName: 'VELOUR', freeShippingThreshold: 75.00 },
   });
   ```

---

## 2. High-Performance Indexing Strategy

Every relation, foreign key, filter, and sorting column in `schema.prisma` must have an explicit `@@index` or `@@unique` constraint:

```prisma
model Order {
  id              String      @id @default(uuid())
  userId          String?
  orderNumber     String      @unique
  status          OrderStatus @default(PENDING)
  total           Decimal     @db.Decimal(10, 2)
  createdAt       DateTime    @default(now())

  user            User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
  items           OrderItem[]

  // High-frequency query indexes:
  @@index([userId])                     // Customer order history lookups
  @@index([status, createdAt(sort: Desc)]) // Admin order fulfillment queue
  @@map("orders")
}

model InventoryItem {
  id                String   @id @default(uuid())
  productId         String
  locationId        String
  quantity          Int      @default(0)

  product  Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@unique([productId, locationId]) // Fast composite lookup
  @@index([productId])
  @@index([locationId])
  @@map("inventory_items")
}
```

### Indexing Rules:
- **Foreign Keys**: Always index the scalar column backing `@relation(fields: [...])`.
- **Compound Filters**: If queries filter by `category` AND `isNew`, create composite `@@index([category, isNew])`.
- **Temporal Sorting**: For time-series queries (e.g. recent reviews, orders), index `[createdAt(sort: Desc)]`.

---

## 3. Production Dockerfile Multi-Stage Build

All Dockerfiles must use multi-stage builds, non-root users, and Alpine minimal images:

```dockerfile
# Dockerfile for NestJS Backend
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs
EXPOSE 4000
CMD ["node", "dist/src/main"]
```

---

## 4. Multi-Container Orchestration (`docker-compose.yml`)

Ensure clean network isolation, health-dependent startup, and persistent volume binding:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: velour_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-velour_ecommerce}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-velour_ecommerce}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - velour_network

  api:
    build:
      context: ./ecommerce-BE
      dockerfile: Dockerfile
    container_name: velour_api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@postgres:5432/${POSTGRES_DB:-velour_ecommerce}?schema=public
    ports:
      - "4000:4000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - velour_network

volumes:
  postgres_data:
    name: velour_postgres_data

networks:
  velour_network:
    name: velour_network
    driver: bridge
```

---

## 5. Reliability Checklist

- [ ] Are all schema changes versioned through `prisma migrate dev`?
- [ ] Are all foreign keys and search query columns indexed?
- [ ] Does `docker-compose.yml` use health checks with `condition: service_healthy`?
- [ ] Are containers running as unprivileged non-root users (`USER node` / `USER nestjs`)?
- [ ] Are sensitive credentials referenced via `.env` variables and excluded in `.dockerignore`?
