# Build Log — Pandian Store MVP 1.0

> Updated after every phase. Gate results, skill applications, decisions, and commit hashes.

---

## Skills Applied

| Skill | Applied Where |
|---|---|
| `output-skill` (full-output-enforcement) | Every file — no stubs, no TODOs |
| `frontend-design` | Phase 0 design plan (DECISIONS.md); Phase 1 tokens; Phase 5 storefront |
| `taste-skill` (§0, §3, §4, §6, §9) | Storefront: all sections; Admin: §9, §4.7, §3.C, §6 |
| `redesign-skill` | Phase 8 design audit (pending) |
| `webapp-testing` | Every UI gate — Playwright screenshots at 5 viewports |

**Skills NOT used (and why):**
`minimalist-skill`, `soft-skill`, `gpt-tasteskill`, `brutalist-skill`, `stitch-skill`, `taste-skill-v1`, `brand-guidelines`, `theme-factory`, `web-artifacts-builder`, `canvas-design`, `algorithmic-art`, `slack-gif-creator`, `mcp-builder`, `claude-api` — all excluded per master prompt §2.

---

## Phase 0 — Plan

**Status:** COMPLETE

**Deliverables:**
- [x] `docs/DECISIONS.md` — Design Read, palette, type scale, layout concept with ASCII wireframes for all 5 screens, review against generic-AI defaults, Section 5 assumptions, additional decisions

**Gate:** No code gate for Phase 0. Documents reviewed and consistent with master prompt.

---

## Phase 1 — Foundation

**Status:** COMPLETE

**Deliverables:**
- [x] Next.js App Router scaffold (App Router, TypeScript strict)
- [x] Tailwind CSS v4 design tokens & palette (--leaf: #17492F, --turmeric: #F4B223, etc.)
- [x] Typography: Geist Sans + Geist Mono + Noto Sans Tamil fallback via next/font/google
- [x] Restyled shadcn/ui components (Button with turmeric/leaf variants, Input with 44px touch targets, Badge, Card, Dialog, Table, Tabs, Select, Checkbox)
- [x] Phosphor icon map (`CategoryIcon.tsx`) for canonical categories
- [x] Route groups & shells: `src/app/(store)` with responsive chrome (desktop utility strip, header, category strip, footer, mobile sticky search, bottom nav) and `src/app/(admin)/admin` (login page and protected app layout with privacy mode toggle)
- [x] Prisma schema with complete data model per Section 8 (Enums, decimal fields, relations, indexes)
- [x] Prisma seeds (`config/shop.seed.ts`, `prisma/seed.ts`) with production and demo modes
- [x] Auth.js v5 credentials provider, 14-day JWT session, bcrypt password hashing, `requireOwner()`
- [x] Database-backed rate limiter (`checkRateLimit`), audit logger (`recordAuditLog`), Cloudinary helper (`generateSignedUploadParams`)
- [x] Strict security headers in `next.config.ts` (nosniff, DENY frame, strict-origin, HSTS, noindex/no-store for admin)
- [x] ESLint import boundary rule forbidding `@/server/admin/*` from storefront/public code
- [x] Pure domain logic library:
  - `src/server/domain/money.ts`: Rounding modes (NONE, NEAREST_HALF, NEAREST_1, UP_1), Indian currency format (en-IN)
  - `src/server/domain/units.ts`: Unit conversions (PACK, dozen, g↔kg, ml↔L), cross-dimension rejection, friendly display
  - `src/server/domain/costing.ts`: Extra charges allocation, unitCost, moving weighted average, ledger replay
  - `src/server/domain/pricing.ts`: Markup/margin formulas, price suggestions (Low/Recommended/High), MRP guard, review flagging
  - `src/server/domain/orders.ts`: Order state machine, legal transitions, quantity step verification, server-side totals calculation, WhatsApp message generator
  - `src/server/domain/validators.ts`: Zod schemas for all domain entities and forms
- [x] Unit test suite: 28 tests in `tests/unit/domain.test.ts` (all green)

**Gate Verification:**
- `npm run typecheck`: 0 errors (green)
- `npm run lint`: 0 errors (green)
- `npm test`: 28 passed (green)
- Deliberate privacy boundary violation tested with `src/components/store/test-leak.tsx` importing `@/server/admin/purchases` -> ESLint rejected with `no-restricted-imports` error -> file safely removed.

---

## Phase 2 — Admin Master Data

**Status:** COMPLETE

**Deliverables:**
- [x] Admin server actions & queries:
  - `src/server/admin/settings.ts`: Shop profile, order toggles, delivery params, rounding mode, password change
  - `src/server/admin/categories.ts`: Category CRUD, reordering, active products guard on deactivation
  - `src/server/admin/suppliers.ts`: Supplier CRUD, archive toggle, supplier profile metrics with products bought (last price, lowest price, current selling price) and purchase bills
  - `src/server/admin/units.ts`: Units queries and compatible unit resolution
  - `src/server/admin/products.ts`: Product CRUD, cheapest supplier lookup, price trend data, price-to-review sync, publish toggle, image association
- [x] Admin UI pages and views:
  - `/admin/login`: Owner login with rate-limiting error feedback
  - `/admin`: Dashboard with 5 key metric cards (masked stock value), recent purchases and orders
  - `/admin/settings`: Shop profile settings, ordering toggles, delivery fees, rounding mode selector, password change modal
  - `/admin/categories`: Category manager with icon selector, tint color picker, default markups, up/down reorder
  - `/admin/suppliers`: Supplier list with search, contact info, add/edit/archive modal
  - `/admin/suppliers/[id]`: Supplier profile with summary metrics, products bought tab, purchase bills tab
  - `/admin/products`: Product list table with search, category & stock filters, mobile stacked cards, publish toggles, price-review badges
  - `/admin/products/new`: Create product page with Tamil name, units, min/max qty, pricing engine panel
  - `/admin/products/[id]/edit`: Edit product page
  - `/admin/products/[id]`: Product detail view with hero info, cheapest supplier banner, Recharts price trend line chart, purchase history, stock movement log, price history log
  - `ProductForm.tsx`: Shared product form with Pricing Engine (Low/Recommended/High suggestions, custom markup %, direct price entry, live margin/markup/profit calculation, below-cost warning, MRP guard)

**Gate Verification:**
- `npm run typecheck`: 0 errors (green)
- `npm run lint`: 0 errors (green)
- `npm test`: 28 passed (green)

---

## Phase 3 — Purchases, Inventory, Costing

**Status:** COMPLETE

**Deliverables:**
- [x] Purchases domain & server actions (`src/server/admin/purchases.ts`):
  - `getPurchases`: Filterable wholesale purchases list (supplier, status, dates, search) with pagination
  - `getPurchaseById`: Detailed bill breakdown, supplier info, unit cost calculation, and item-by-item previous purchase comparison
  - `getProductLastPurchaseRate`: Real-time previous purchase rate fetcher for purchase lines
  - `recordPurchase`: Multi-line purchase entry, pack units to base units conversion, proportional allocation of extra charges (transport/loading), stock updates, moving average cost calculation, StockMovement logging, and post-save price review item generator
  - `voidPurchase`: Void bill action reversing stock movements, guarding against voiding if stock was already sold, and chronologically replaying purchase ledger to restore accurate item costs
  - `correctPurchase`: Transactionally voids erroneous purchase and replaces it with corrected purchase linked by `replacesId`
- [x] Inventory domain & server actions (`src/server/admin/inventory.ts`):
  - `getInventory`: Product stock list with status (In Stock, Low Stock, Out of Stock), category filter, stock valuation, and privacy masking
  - `adjustStock`: Stock adjustment (ADD, REMOVE, SET) with required reasons (Damaged, Expired, Count correction, Opening stock, Returned, Other), notes, and negative stock guard
  - `getStockMovements`: Chronological stock movement log per product
  - `exportInventoryCsv`: Complete inventory valuation dataset exported as CSV
- [x] Admin UI pages and views:
  - `/admin/purchases`: Filterable list of wholesale purchase bills, desktop table, mobile stacked cards, and status badges
  - `/admin/purchases/[id]`: Purchase bill detail view, replacement links, void notice, print shortcut, and Void Bill modal
  - `/admin/purchases/new`: Phone-first purchase form (Section 10), inline Add Supplier and Add Product modals, auto-calculated line totals/rates, pack size helper, draft localStorage persistence with restore/discard prompt, running totals summary, and post-save "Review Selling Prices" modal dialog
  - `/admin/inventory`: Inventory manager with 5 summary metric cards, privacy mask toggle, status tabs, Adjust Stock modal with live balance preview, Stock Movement history dialog, and CSV export
- [x] Integration test suite (`tests/integration/purchases-inventory.test.ts`):
  - 6 integration tests verifying pack conversion, proportional extra charge allocation, moving weighted average cost computation, ledger replay after voiding, pricing suggestions with MRP guards, and cross-dimension unit rejections

**Gate Verification:**
- `npm run typecheck`: 0 errors (green)
- `npm run lint`: 0 errors (green)
- `npm test`: 34 passed (28 domain unit tests + 6 integration tests, all green)

---

## Phase 4 — Pricing, Dashboard, Reports

**Status:** PENDING

---

## Phase 5 — Storefront

**Status:** PENDING

---

## Phase 6 — Order Management

**Status:** PENDING

---

## Phase 7 — Polish and States

**Status:** PENDING

---

## Phase 8 — Design Audit

**Status:** PENDING

---

## Phase 9 — Hardening

**Status:** PENDING

---

## Phase 10 — Handover

**Status:** PENDING

