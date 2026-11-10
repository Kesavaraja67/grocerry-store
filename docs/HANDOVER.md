# Pandian Store — Technical Handover Document

**Project:** Pandian Store MVP 1.0  
**Stack:** Next.js 15.5+ (App Router), Tailwind CSS v4, PostgreSQL 16 (Neon / Prisma 6.4), Auth.js v5 (JWT session), Decimal.js, @phosphor-icons/react.

---

## 1. Architecture Overview

Pandian Store is designed as an asymmetric two-sided platform:

```
┌────────────────────────────────────────────────────────┐
│                   Pandian Store App                    │
├──────────────────────────┬─────────────────────────────┤
│   Customer Storefront    │        Owner Portal         │
│         (/)              │          (/admin)           │
├──────────────────────────┼─────────────────────────────┤
│ - Public DTO layer       │ - requireOwner() auth check │
│ - ZERO cost/supplier key │ - ProductCost separate model│
│ - Client cart validation │ - Purchases & costing engine│
│ - Guest checkout flow    │ - Stock movement ledger     │
│ - Order tracking (phone) │ - Order state machine       │
└──────────────────────────┴─────────────────────────────┘
```

### The Privacy Boundary (Strict Architectural Isolation)
- **Database Model**: Wholesale costs, supplier references, and markup parameters are stored in a separate `ProductCost` model (`prisma/schema.prisma`). The public `Product` model contains **no cost columns**.
- **DTO Projection**: Storefront queries in `src/server/public/` strictly select public fields only.
- **Static Boundary Enforcement**: An ESLint rule in `eslint.config.mjs` enforces `no-restricted-imports` forbidding any storefront or public API code from importing `@/server/admin/*`.
- **Automated Verification**: `tests/integration/privacy-boundary.test.ts` validates that public endpoints, cart re-pricing, and tracking queries contain zero cost, supplier, or markup keys.

---

## 2. Environment Variables Checklist

Copy `.env.example` to `.env` on production:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection string (Neon / Supabase) |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection string for Prisma migrations |
| `AUTH_SECRET` | Yes | 32+ character random secret for Auth.js JWT signing |
| `AUTH_URL` | Yes | Base URL of deployment, e.g. `https://pandianstore.in` |
| `OWNER_EMAIL` | Yes | Primary owner login email |
| `OWNER_INITIAL_PASSWORD`| Yes | Initial password used by seed script (hashed with bcrypt) |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud identifier for product photo uploads |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API Secret |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical storefront origin (e.g., `https://pandianstore.in`) |

---

## 3. Deployment Guide (Vercel + Neon)

### Neon PostgreSQL Setup
1. Create a Neon Postgres database project (region: `ap-southeast-1` or `ap-south-1` for lowest latency to Tamil Nadu).
2. Grab the pooled connection string (`DATABASE_URL`) and direct connection string (`DIRECT_URL`).

### Database Migration & Seed
Run in your local or CI terminal:
```bash
# Push schema to Neon
npm run db:push

# Seed canonical master data (categories, units, shop settings, owner account)
npm run db:seed

# Optional: Seed demo dataset (realistic grocery products, suppliers, sample purchases)
npm run db:seed:demo
```

### Vercel Deployment
1. Connect Git repository to Vercel.
2. Set Environment Variables in Project Settings.
3. Build command: `npm run build`
4. Output directory: Next.js default (`.next`)
5. Deploy.

---

## 4. Key Subsystems & Verification

### Pure Domain Logic (`src/server/domain/`)
- `money.ts`: Rounding modes (`NONE`, `NEAREST_HALF`, `NEAREST_1`, `UP_1`), INR formatting (`en-IN`), Decimal calculations.
- `units.ts`: Exact conversions between PACK, dozen, grams, kilograms, millilitres, and litres. Cross-dimension validation.
- `costing.ts`: Proportional extra charge allocation, weighted moving average cost calculation, purchase ledger replay after voiding.
- `pricing.ts`: Markup vs. margin calculations, price recommendations (Low/Recommended/High), MRP guard cap, price review flagging.
- `orders.ts`: Order state machine (`LEGAL_TRANSITIONS`), quantity step verification, server-side line total recomputation, WhatsApp message URL generation.

### Automated Test Suite
Run tests with:
```bash
npm test
```
- Total tests: 42 (all passing)
  - Unit tests: 28 pure domain tests
  - Integration tests: 6 purchases & inventory tests, 4 privacy boundary tests, 4 order state machine tests.

---

## 5. Maintenance & Disaster Recovery

### Resetting Demo Data
To reset demo data back to clean baseline without affecting schema:
```bash
npm run db:reset-demo
```

### Changing Owner Password
The owner can change their password at `/admin/settings` directly via the web portal, or an administrator can update the bcrypt hash in the `User` table.

### Audit Logs
All critical operations (price changes, inventory adjustments, purchase voids, order acceptance/cancellation) are logged in the `AuditLog` table with action name, entity ID, timestamp, and metadata payload.

