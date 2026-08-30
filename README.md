# VELOUR Fashion eCommerce — Backend REST API

A production-grade, high-performance NestJS + TypeScript + Prisma ORM + PostgreSQL backend API engineered to power the **VELOUR** luxury minimal fashion eCommerce platform.

This backend serves the Next.js frontend by fulfilling the **exact contract** defined in its `lib/api.ts` seam. The frontend can swap its local mock arrays for live `fetch()` calls against this API with **zero frontend component changes**.

---

## 🏗️ Architecture & Technology Stack

- **Framework**: [NestJS](https://nestjs.com/) (v10+) with TypeScript
- **Database & ORM**: PostgreSQL + [Prisma ORM](https://www.prisma.io/)
- **Architecture**: Clean Layered Architecture (`Controller` ➔ `Service` ➔ `Prisma Database`)
- **Authentication**: Stateless JWT access tokens (15m expiry) + Passwordless OTP (Email SMTP & WhatsApp Provider abstraction)
- **Validation**: `class-validator` + `class-transformer` via global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`)
- **API Documentation**: Auto-generated Swagger OpenAPI 3.0 at `/docs`
- **Security**: Rate limiting (`@nestjs/throttler`), Bcrypt password/OTP hashing (10-12 rounds), CORS restricted to `FRONTEND_URL`
- **Data Integrity**: Multi-location inventory validation and atomic transactional checkout via Prisma `$transaction`

---

## 🚀 Quick Start & Setup

### Option A: Run with Docker Compose (Recommended)

Run the backend and PostgreSQL database with a single command:

```bash
# Build and start all services in detached mode
docker compose up --build -d

# View API logs
docker compose logs -f api

# Stop all services
docker compose down
```

Once running:
- **API Server**: [http://localhost:4000](http://localhost:4000)
- **Interactive Swagger Docs**: [http://localhost:4000/docs](http://localhost:4000/docs)
- **PostgreSQL Database**: `localhost:5432` (`postgres` / `postgres`)

---

### Option B: Local Setup (Manual)

#### Prerequisites
- Node.js v18+
- PostgreSQL server running locally or remotely

### 1. Installation
```bash
cd ecommerce-BE
npm install
```

### 2. Environment Configuration
Copy the example environment configuration:
```bash
cp .env.example .env
```

Ensure your PostgreSQL `DATABASE_URL` in `.env` is correct:
```env
DATABASE_URL="postgresql://asadanwar@localhost:5432/velour_ecommerce?schema=public"
PORT=4000
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="velour_super_secure_jwt_secret_key_2026_fashion_lux"
```

### 3. Database Schema & Seeding
Push the schema to PostgreSQL and seed all 24 curated demo products matching the VELOUR catalogue:
```bash
npx prisma db push
npm run prisma:seed
```

### 4. Start the Application
```bash
# Development mode (with hot-reload)
npm run start:dev

# Production build & start
npm run build
npm run start:prod
```

The API will be live at `http://localhost:4000`  
Swagger UI documentation will be available at `http://localhost:4000/docs`

---

## 🔑 Demo Accounts

The database seed provisions the following accounts:

| Role | Email | Password | Phone |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@velour.com` | `VelourAdmin2026!` | `+15550001122` |
| **Customer** | `customer@velour.com` | `CustomerPass2026!` | `+15550003344` |

---

## 🔄 Frontend Contract Swap Guide (`lib/api.ts` Seam)

The frontend's `lib/api.ts` defines several core data fetching functions. Below is the exact 1-to-1 mapping showing how each function connects to this live backend:

### 1. `getProducts(params)`
- **Frontend Function**: `getProducts({ category, subcategory, sort, query, limit })`
- **Backend Endpoint**: `GET /products?category=women|men&subcategory=&sort=featured|price-asc|price-desc|newest&query=&limit=`
- **Implementation in frontend `lib/api.ts`**:
```typescript
export async function getProducts(params: FilterParams = {}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.subcategory) query.set('subcategory', params.subcategory);
  if (params.sort) query.set('sort', params.sort);
  if (params.query) query.set('query', params.query);
  if (params.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products?${query.toString()}`);
  const json = await res.json();
  return json.data;
}
```

### 2. `getProductById(id)`
- **Frontend Function**: `getProductById(id: string)`
- **Backend Endpoint**: `GET /products/:id` (supports unique ID or slug like `w-double-breasted-wool-coat`)
- **Frontend swap**:
```typescript
export async function getProductById(id: string): Promise<Product | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`);
  if (res.status === 404) return null;
  const json = await res.json();
  return json.data;
}
```

### 3. `getFeatured(limit)`
- **Frontend Function**: `getFeatured(limit = 8)`
- **Backend Endpoint**: `GET /products/featured?limit=8`
- **Frontend swap**:
```typescript
export async function getFeatured(limit = 8): Promise<Product[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/featured?limit=${limit}`);
  const json = await res.json();
  return json.data;
}
```

### 4. `getNewArrivals(limit)`
- **Frontend Function**: `getNewArrivals(limit = 8)`
- **Backend Endpoint**: `GET /products/new-arrivals?limit=8`
- **Frontend swap**:
```typescript
export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/new-arrivals?limit=${limit}`);
  const json = await res.json();
  return json.data;
}
```

### 5. `getTrending(limit)`
- **Frontend Function**: `getTrending(limit = 8)`
- **Backend Endpoint**: `GET /products/trending?limit=8`
- **Frontend swap**:
```typescript
export async function getTrending(limit = 8): Promise<Product[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/trending?limit=${limit}`);
  const json = await res.json();
  return json.data;
}
```

### 6. `getRelated(id, limit)`
- **Frontend Function**: `getRelated(id: string, limit = 4)`
- **Backend Endpoint**: `GET /products/:id/related?limit=4`
- **Frontend swap**:
```typescript
export async function getRelated(id: string, limit = 4): Promise<Product[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}/related?limit=${limit}`);
  const json = await res.json();
  return json.data;
}
```

### 7. `searchProducts(query, limit)`
- **Frontend Function**: `searchProducts(query: string, limit = 8)`
- **Backend Endpoint**: `GET /search?q=query&limit=8` (or `GET /products/search?q=query&limit=8`)
- **Frontend swap**:
```typescript
export async function searchProducts(query: string, limit = 8): Promise<Product[]> {
  if (!query || !query.trim()) return [];
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  const json = await res.json();
  return json.data;
}
```

### 8. `subcategoriesFor(category)`
- **Frontend Function**: `subcategoriesFor(category: 'women' | 'men')`
- **Backend Endpoint**: `GET /categories?parent=women|men`
- **Frontend swap**:
```typescript
export async function getActiveSubcategories(category: 'women' | 'men'): Promise<string[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories?parent=${category}`);
  const json = await res.json();
  return json.data;
}
```

---

## 🛒 Cart & Checkout API Contract

The Cart API supports both authenticated users and anonymous guest users using the `x-device-id` header:

| Method | Endpoint | Description | Auth / Headers |
| :--- | :--- | :--- | :--- |
| `GET` | `/cart` | Get active shopping cart | Bearer Token or `x-device-id` |
| `POST` | `/cart/items` | Add product to cart `{ productId, size, quantity }` | Bearer Token or `x-device-id` |
| `PATCH` | `/cart/items/:id` | Update item quantity `{ quantity }` | Bearer Token or `x-device-id` |
| `DELETE` | `/cart/items/:id` | Remove line item | Bearer Token or `x-device-id` |
| `POST` | `/checkout` | Atomic checkout transaction with stock validation | Bearer Token or `x-device-id` |

### Checkout Payload Example (`POST /checkout`):
```json
{
  "contactName": "Elena Rostova",
  "contactEmail": "customer@velour.com",
  "contactPhone": "+15550003344",
  "shippingAddress": {
    "line1": "742 Evergreen Terrace",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  }
}
```

---

## 🔐 Authentication & OTP API Contract

| Method | Endpoint | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register account with email & password | Standard |
| `POST` | `/auth/login` | Login with email & password | 10 req / min |
| `POST` | `/auth/otp/request` | Request 6-digit OTP code (EMAIL or WHATSAPP) | 5 req / min |
| `POST` | `/auth/otp/verify` | Verify OTP code & sign in / create account | Standard |
| `GET` | `/auth/me` | Fetch authenticated user profile & addresses | Protected |

---

## 📦 Inventory & Admin Management

All `/inventory` endpoints and product mutation endpoints require `ADMIN` role (`Authorization: Bearer <admin_token>`):

- `GET /inventory/:productId` — Stock breakdown across all locations and warehouses
- `POST /inventory/adjust` — Atomic quantity adjustment with `StockMovement` audit logging:
  ```json
  {
    "productId": "w-double-breasted-wool-coat",
    "locationId": "<warehouse_id>",
    "quantity": 25,
    "type": "RESTOCK",
    "reason": "Shipment PO-984"
  }
  ```
- `GET /inventory/low-stock` — Products at or below threshold (`lowStockThreshold: 5`)
- `GET /orders/all` — List all orders across the platform with status filtering
- `PATCH /orders/:id/status` — Update order fulfillment status (`PENDING`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`)

---

## 🧪 Response Envelope Standard

Every successful API response is wrapped in a standard JSON envelope:
```json
{
  "data": { ... },
  "meta": { ... } // Included for paginated list queries
}
```

Error responses follow a unified structure:
```json
{
  "statusCode": 400,
  "message": "Insufficient stock for \"Double-Breasted Wool Overcoat\"...",
  "error": "Bad Request",
  "timestamp": "2026-08-25T09:30:00.000Z",
  "path": "/checkout"
}
```
