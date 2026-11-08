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

**Status:** IN PROGRESS

---

## Phase 3 — Purchases, Inventory, Costing

**Status:** PENDING

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

