# Pandian Store (பாண்டியன் ஸ்டோர்) — MVP 1.0

A complete, production-quality, two-sided web platform built for a neighbourhood grocery store in Madurai, Tamil Nadu.

- **Owner Portal (`/admin`)**: Wholesale purchase recording with pack conversion & proportional extra charge allocation, moving average inventory costing, selling price suggestions with MRP guards and markup/margin controls, stock adjustments ledger, and complete customer order lifecycle management with printable A5 order slips.
- **Customer Storefront (`/`)**: Amazon-inspired but beginner-friendly grocery store with bilingual English/Tamil product search, live search suggestions, category catalog, persistent cart with free-delivery progress bar, single-page guest checkout, order tracking, and direct WhatsApp shortcuts.

---

## Key Features & Invariants

1. **Strict Privacy Boundary**:
   - Wholesale purchase rates, supplier details, markup percentages, and margins are structurally impossible to leak to storefront customers.
   - Public database model (`Product`) has **zero cost columns**; costs reside in a separate admin-only `ProductCost` model.
   - Public DTO layer (`src/server/public/`) projects only public fields.
   - Static ESLint rule forbids storefront code from importing `@/server/admin/*`.
   - Verified by automated privacy boundary integration test suite.
2. **Deterministic Decimal Arithmetic**:
   - Money and quantities never use floating-point numbers. Built end-to-end with `decimal.js` and Prisma `Decimal` using `ROUND_HALF_UP`.
3. **Pure Domain Logic First**:
   - Tested pure functions for money rounding, unit conversions (PACK, dozen, g↔kg, ml↔L), moving weighted average costing, pricing suggestions, and legal order state machine transitions.
4. **Phone-First Admin & Storefront Design**:
   - 44px minimum touch targets, tabular numerals for monetary values, responsive layouts for 360px mobile viewports up to 1536px desktop screens.
   - Privacy Mode button in admin top bar to mask wholesale costs with a single click when customers are near the counter.

---

## Tech Stack

- **Framework**: Next.js 15.5+ (App Router, Server Actions)
- **Styling**: Tailwind CSS v4, custom theme tokens (Deep Leaf `#17492F`, Golden Turmeric `#F4B223`, Clean Surface `#FFFFFF`)
- **Icons**: `@phosphor-icons/react` exclusively
- **Typography**: Geist Sans + Geist Mono + Noto Sans Tamil fallback
- **Database**: PostgreSQL 16 (Neon / Prisma 6.4)
- **Authentication**: Auth.js v5 (NextAuth) with 14-day JWT sessions and `requireOwner()` guards
- **Testing**: Vitest (42 tests, 100% green)

---

## Quick Start

### 1. Prerequisites & Installation

```bash
# Install dependencies
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your PostgreSQL and Auth credentials:

```bash
cp .env.example .env
```

### 3. Database Migration & Seed

```bash
# Push schema to database
npm run db:push

# Seed master categories, units, and initial owner account
npm run db:seed

# (Optional) Seed realistic Madurai grocery demo catalog with sample purchases
npm run db:seed:demo
```

### 4. Run Development Server

```bash
npm run dev
```

Visit:
- Customer Storefront: `http://localhost:3000`
- Owner Admin Portal: `http://localhost:3000/admin` (Default: `owner@pandianstore.in` / `Pandian@2026`)

---

## Verification & Quality Gates

Run all quality gates:

```bash
# TypeScript strict typecheck (0 errors)
npm run typecheck

# ESLint boundary verification (0 errors)
npm run lint

# Vitest test suite (42 tests passing)
npm test

# Next.js production build (100% clean bundle)
npm run build
```

---

## Documentation

- [`docs/ADMIN_GUIDE.md`](./docs/ADMIN_GUIDE.md): Plain-language owner manual with Tamil terms and step-by-step instructions.
- [`docs/HANDOVER.md`](./docs/HANDOVER.md): Technical architecture, deployment guide, and security specifications.
- [`docs/DEMO_SCRIPT.md`](./docs/DEMO_SCRIPT.md): Step-by-step walkthrough script for client demonstrations.
- [`docs/BUILD_LOG.md`](./docs/BUILD_LOG.md): Full development log with phase gates and deliverable checklists.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md): Architectural decisions, design system tokens, and ASCII wireframes.
