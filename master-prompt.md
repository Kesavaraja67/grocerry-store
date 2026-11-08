# PANDIAN STORE: MASTER BUILD PROMPT (MVP 1.0)

You are a senior full-stack engineer and product designer building a complete, production-quality MVP for a real client. Read this whole document before writing any code. It is the single source of truth. Where it conflicts with your habits, this document wins.

---

## 1. MISSION AND OPERATING RULES

**Mission.** Build **Pandian Store**, a grocery shop's two-sided web platform:

1. **Owner portal (`/admin`)**: record wholesale purchases, see where/when/at what price every item was bought, track stock, get selling-price suggestions with an adjustable profit percentage, and manage customer orders.
2. **Customer storefront (`/`)**: an Amazon-inspired but beginner-friendly grocery store where customers browse, search, fill a cart and submit an order request.

The client is a first-time software user. He will judge the MVP on one question: *"Is this easy and does it actually help me run the shop?"* If it is easy and effective, he orders the full system. Ease of use beats feature count in every trade-off, but **every feature listed in Section 4 must ship**.

**Operating rules (non-negotiable).**

1. **Plan, critique, build, verify.** For each phase: write a short plan, challenge it once, build, then run the verification gate. Do not move on until the gate passes.
2. **No stubs, no TODOs, no placeholder code, no "left as an exercise".** Every file is complete and runnable. If you approach an output limit, stop at a clean file boundary and say exactly what remains (see the `output-skill` rules).
3. **Never guess an API.** Before using any library, check `package.json`, then the installed package's types or current official docs. Install the latest stable versions. Next.js, Tailwind v4, Auth.js v5, Prisma and shadcn/ui all changed recently; follow the docs for the versions you install, not memory.
4. **Ask at most one question, only if truly blocked.** Otherwise state the assumption in `docs/DECISIONS.md` and continue. Shop address, phone, hours and logo are *not* blockers: use clearly editable config (Section 16) and list them in the final report.
5. **Money and quantities never use floating point.** Use `Decimal` end to end (Prisma `Decimal`, `decimal.js`). Round half up.
6. **Privacy first.** Purchase prices, suppliers, markup and profit must be structurally impossible to leak to customers (Section 7 and 14). A hidden CSS class is not security.
7. **Commit after every phase** with a clear message. Keep `docs/BUILD_LOG.md` updated: what was built, decisions, gate results.
8. **Parallelize** independent work if your environment supports sub-agents (for example: domain library and tests in one track, design tokens and shells in another). Merge only through the gates.
9. **Test the domain logic first.** Money, units, costing, pricing and the order state machine are pure functions with unit tests *before* any UI uses them.

---

## 2. SKILLS PROTOCOL (READ THESE FILES FIRST)

The client's skills pack is installed at `./skills/<skill-name>/SKILL.md` (if it lives elsewhere, such as `.claude/skills/`, use that path). **Read the SKILL.md of every skill marked ALWAYS before designing or coding, and re-read the relevant sections at each gate.** State in `docs/BUILD_LOG.md` which skills you applied and where.

### ALWAYS use

| Skill | Use it for | How |
|---|---|---|
| `output-skill` (full-output-enforcement) | Every file | Complete code only. Cross-check deliverable counts before finishing each phase. |
| `frontend-design` | Both portals | Follow its process literally: write the design plan (4 to 6 named hex colors, type roles, layout concept with ASCII wireframes, principles), **review the plan against its list of generic AI defaults, revise, then build**, then critique with screenshots. Follow its writing rules for all UI copy. |
| `taste-skill` (`design-taste-frontend`) | Storefront fully; admin partially | Its scope note says it is for landing pages, not dashboards. So: **Storefront**: do Section 0 (one-line Design Read), set dials, follow Sections 3 (stack conventions, Phosphor icons, `min-h-[100dvh]`, CSS Grid, dependency checks), 4 (type, color, layout discipline, states), 6 (accessibility, reduced motion) and **Section 9 (AI Tells) as a hard checklist**. **Admin**: use only Section 9 (AI Tells), 4.7 (layout discipline), 3.C (icons) and 6. Ignore its hero paradigms, scroll-stack, horizontal-pan, block library and cinematic motion sections: they do not fit a utility grocery store. |
| `redesign-skill` (`redesign-existing-projects`) | After the first full UI exists (Phase 8) | Run its Design Audit on every page, list findings, apply **targeted fixes** without rewriting working code. |
| `webapp-testing` | Every UI gate | Use its Python Playwright pattern and `scripts/with_server.py` (run `--help` first, do not read the source). Take screenshots at 360x740, 390x844, 768x1024, 1280x800 and 1536x900, read the browser console, and fix what you see. |

### OPTIONAL (only if your environment can generate images)

`imagegen-frontend-mobile` and `imagegen-frontend-web` (plus `image-to-code`): generate reference comps for **Storefront Home, Product page, Cart (mobile)** and **Admin New Purchase (mobile)**, then implement to match. If you cannot generate images, skip them and rely on the ASCII wireframes required by `frontend-design`. Never block the build on this.

### DO NOT use (and why)

`minimalist-skill` (bans the colored primary actions and dense layout a store needs, and prescribes an editorial serif look), `soft-skill` and `gpt-tasteskill` (agency/awwwards motion-heavy landing styles), `brutalist-skill` (wrong tone for a family grocery), `stitch-skill` (Google Stitch only), `taste-skill-v1` (superseded), `brand-guidelines` (it applies **Anthropic's** branding; never apply it here), `theme-factory`, `web-artifacts-builder`, `canvas-design`, `algorithmic-art`, `slack-gif-creator`, `mcp-builder`, `claude-api` (no runtime AI in MVP), `docx`/`pptx`/`xlsx`/`pdf`, `doc-coauthoring`, `internal-comms`, `skill-creator`, `academy-guide`, `discernment-nudge`. `brandkit` is optional later for a logo; for the MVP use a typographic wordmark.

**Rule when skills disagree:** this document wins; then `frontend-design`; then `taste-skill` for the storefront. Trust-first commerce (the taste-skill's own "quiet constraints" rule) overrides decorative preference.

---

## 3. PRODUCT CONTEXT

- **Client:** a single grocery shop, **Pandian Store**, in Tamil Nadu, India. One owner. Customers are local families; many are not tech-savvy. Many will use phones.
- **Currency/locale:** INR, `en-IN` number grouping (₹1,23,456.50). Timezone `Asia/Kolkata`. UI language English, with an optional Tamil product name field that is searchable and shown under the English name. Make all UI strings easy to translate later (central copy file), but do not build i18n now.
- **Owner's needs (verbatim intent):**
  - Buys stock from several wholesale stores. When he enters a purchase he must record the **store, product details, unit (packet/piece/kg/litre/box...), how much he paid, and when**.
  - He must be able to **search a wholesale store and see everything bought there: what, how much, when, at what price, and what he can sell it for**.
  - The system **suggests a selling price/profit** per product; he can **change the profit percentage**.
  - **Purchase prices must never be shown to customers. Ever.**
  - Customers can order from the website. It must feel like a real shop (Amazon-like patterns), simple for beginners, on mobile and desktop.
- **Decisions already made by the client:** customers send **order requests** (no online payment); units: **both** weight/volume and countable; stock: **automatic + manual adjustments**; admin users: **owner only**.

---

## 4. SCOPE

### 4.1 MUST SHIP (all of it)

**Owner portal:** secure login/logout and password change · dashboard · suppliers (add, edit, archive, search, profile with full purchase history) · categories with default markups · products (add, edit, images, units, Tamil name, MRP, publish toggle) · **purchase recording with multiple products per supplier bill, unit conversion, extra charges, void/correct with audit trail** · purchase history searchable by **supplier**, by **product**, and by **date range** · inventory with automatic updates and manual adjustments with reasons, low-stock flags · **pricing engine**: Low/Recommended/High suggestions, custom markup, direct price entry, markup and margin shown separately, MRP guard, price history · "prices to review" workflow after cost changes · customer order management (accept, reject, process, ready, complete, cancel) with automatic stock deduction · printable order slip · basic reports with CSV export · settings (shop info, hours, orders on/off, delivery/pickup, minimum order, rounding rule) · global search · privacy mode (mask costs on screen).

**Storefront:** home, search with suggestions, category pages, product pages, cart, guest checkout (delivery or pickup), order confirmation, order tracking by order number + phone, contact/about, WhatsApp shortcut, empty/error/404 states.

### 4.2 OUT OF SCOPE (do not build; keep the architecture ready)

Online payments · delivery partner integration or live tracking · GST invoicing/filing · customer accounts and loyalty · employees/roles · multi-branch · supplier credit ("udhar") ledger · expiry tracking · automated WhatsApp/SMS · AI features at runtime · product variants (a 500 g and a 1 kg pack are separate products) · i18n.

---

## 5. DEFAULTS AND ASSUMPTIONS (record in `docs/DECISIONS.md`)

1. All selling prices are final, tax-inclusive. Nothing in the app is a tax invoice. The printable slip is titled "Order slip".
2. Payment is cash/UPI on delivery or at the shop. Say so at checkout.
3. Order requests do **not** reserve stock. Stock is deducted when the owner **accepts**, atomically, and restored on cancel after acceptance.
4. Suggested price default basis is the **latest purchase cost** (how the owner thinks: "what I paid last time"); average cost is always shown beside it and selectable per product.
5. Selling price may never exceed a product's MRP (Indian packaged-goods rule); enforce in the server and UI when MRP is set.
6. Orders are placed by guests. The phone number is the customer identifier.

---

## 6. TECH STACK

| Concern | Choice |
|---|---|
| Framework | Next.js (latest stable), App Router, TypeScript strict |
| Styling | Tailwind CSS v4 + shadcn/ui as **owned, restyled components** (never ship default shadcn look) |
| Icons | `@phosphor-icons/react` only, one weight family. No Lucide, no emojis anywhere. No hand-drawn SVG icons |
| Fonts | `next/font`: **Geist** for UI/headings/numbers with `tabular-nums` for money; **Noto Sans Tamil** (or Hind Madurai) as the Tamil fallback. You may change the Latin face if your `frontend-design` plan justifies it, but Tamil glyphs must render well |
| Database | PostgreSQL (Neon). Pooled `DATABASE_URL` for runtime, direct `DIRECT_URL` for migrations. `pg_trgm` for search |
| ORM | Prisma (latest stable; follow its current docs for Neon) |
| Auth | Auth.js v5 credentials provider, JWT session, `bcryptjs` |
| Validation | Zod on every server input |
| Forms/data | React Hook Form + Zod resolver; TanStack Table for admin tables; Recharts for the price-trend chart |
| Images | Cloudinary (server-signed uploads), `next/image` with `remotePatterns` |
| Tests | Vitest (unit + integration), Playwright via the `webapp-testing` skill (e2e + screenshots) |
| Package manager | npm |
| Deployment | Vercel + Neon. Document that Vercel's free Hobby plan is for non-commercial use, so a live shop needs a paid plan or another host. Everything must be env-driven and portable |

---

## 7. ARCHITECTURE AND THE PRIVACY BOUNDARY

```
src/
  app/
    (store)/                 storefront routes
      page.tsx  search/  c/[slug]/  p/[slug]/  cart/  checkout/
      order/[number]/  track/  contact/  not-found.tsx
    (admin)/admin/
      login/                 public login page
      (app)/                 everything else, behind requireOwner()
        page.tsx orders/ products/ categories/ suppliers/
        purchases/ inventory/ pricing/ reports/ settings/
    api/public/              search suggestions, cart validation, place-order, track
    api/admin/upload/        signed Cloudinary upload (owner only)
  server/
    domain/                  PURE logic, no DB: money, units, costing, pricing, order-state, validators
    public/                  the ONLY data layer the storefront may import (explicit DTOs)
    admin/                   owner-only queries/actions; `import "server-only"`; each starts with requireOwner()
    db.ts  auth.ts  ratelimit.ts  audit.ts  cloudinary.ts
  components/ ui/ store/ admin/ shared/
  lib/ format.ts (INR, quantity, dates)  copy.ts (all UI strings)  cn.ts
prisma/ schema.prisma  migrations/  seed/
tests/ unit/ integration/ e2e/
docs/ BUILD_LOG.md DECISIONS.md ADMIN_GUIDE.md HANDOVER.md DEMO_SCRIPT.md
```

**Privacy enforcement, structurally:**

1. Cost data lives only in `PurchaseItem`, `ProductCost`, `PriceHistory`, `OrderItemCost`, `Supplier`. The public `Product` table has **no cost, supplier or markup column**, so a careless `findMany()` cannot leak it.
2. `src/server/public/*` returns **DTOs built from explicit `select` objects**, never raw Prisma rows. Storefront code may import only from `src/server/public`, `src/server/domain` and `src/lib`.
3. ESLint `no-restricted-imports` forbids `@/server/admin/*` from `src/app/(store)/**`, `src/app/api/public/**` and `src/components/store/**`. CI fails on violation.
4. Every admin server action and route handler calls `requireOwner()` **itself**. Never rely on middleware/proxy alone for authorization.
5. Never pass Prisma objects to client components. Map to DTOs; serialize Decimals as strings.
6. A **leak test** (Section 15) proves no cost/supplier/markup string appears in any public HTML, RSC payload or JSON.

---

## 8. DATA MODEL (implement this; adjust syntax to the installed Prisma version)

```prisma
generator client { provider = "prisma-client-js" }

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum UnitDimension   { WEIGHT VOLUME COUNT PACK }
enum PurchaseStatus  { ACTIVE VOIDED }
enum MovementType    { OPENING PURCHASE PURCHASE_VOID ORDER_ACCEPTED ORDER_RESTORED ADJUSTMENT }
enum AdjustmentReason{ DAMAGED EXPIRED COUNT_CORRECTION OPENING_STOCK RETURNED OTHER }
enum OrderStatus     { PLACED ACCEPTED PROCESSING READY COMPLETED REJECTED CANCELLED }
enum FulfilmentType  { DELIVERY PICKUP }
enum CostBasis       { LATEST AVERAGE }
enum RoundingMode    { NONE NEAREST_HALF NEAREST_1 UP_1 }

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  createdAt    DateTime @default(now())
}

model Unit {
  id           String        @id @default(cuid())
  code         String        @unique          // kg, g, litre, ml, piece, packet, bottle, dozen, box, carton, bag, can, case
  label        String
  symbol       String
  dimension    UnitDimension
  factorToBase Decimal?      @db.Decimal(14, 6) // to kg / litre / piece. g=0.001 ml=0.001 dozen=12. null for PACK
  isBaseable   Boolean       @default(false)  // may be a product's stock unit: kg, litre, piece, packet, bottle
  sortOrder    Int           @default(0)
  products     Product[]
  purchaseItems PurchaseItem[]
}

model Category {
  id                  String   @id @default(cuid())
  name                String   @unique
  slug                String   @unique
  iconKey             String                    // key into a fixed Phosphor icon map
  tint                String?                   // hex for the category tile
  sortOrder           Int      @default(0)
  lowMarkup           Decimal  @default(5)  @db.Decimal(6, 2)
  recommendedMarkup   Decimal  @default(10) @db.Decimal(6, 2)
  highMarkup          Decimal  @default(15) @db.Decimal(6, 2)
  isActive            Boolean  @default(true)
  products            Product[]
}

model Product {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String
  nameTamil    String?
  brand        String?
  description  String?
  sizeLabel    String?                           // "1 L pouch", "500 g"
  categoryId   String
  baseUnitId   String                            // stock + price unit (isBaseable only)
  sellStep     Decimal  @default(1)     @db.Decimal(8, 3)   // 0.25 for loose goods, 1 for packets
  minQty       Decimal  @default(1)     @db.Decimal(8, 3)
  maxQty       Decimal  @default(50)    @db.Decimal(8, 3)
  sellingPrice Decimal? @db.Decimal(12, 2)       // per base unit; null = not for sale
  mrp          Decimal? @db.Decimal(12, 2)
  stockQty     Decimal  @default(0)     @db.Decimal(14, 3)
  lowStockAt   Decimal  @default(5)     @db.Decimal(14, 3)
  isPublished  Boolean  @default(false)
  isFeatured   Boolean  @default(false)
  isArchived   Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  category     Category @relation(fields: [categoryId], references: [id])
  baseUnit     Unit     @relation(fields: [baseUnitId], references: [id])
  images       ProductImage[]
  cost         ProductCost?
  purchaseItems PurchaseItem[]
  movements    StockMovement[]
  priceHistory PriceHistory[]
  orderItems   OrderItem[]
  @@index([categoryId, isPublished])
  // + GIN trigram indexes on name, nameTamil, brand (raw SQL in migration)
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  url       String
  publicId  String
  alt       String?
  sortOrder Int     @default(0)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

// ADMIN ONLY. Never selected by public code.
model ProductCost {
  productId       String    @id
  lastCost        Decimal?  @db.Decimal(14, 4)
  lastCostAt      DateTime?
  lastSupplierId  String?
  avgCost         Decimal?  @db.Decimal(14, 4)
  markupPercent   Decimal?  @db.Decimal(6, 2)
  costBasis       CostBasis @default(LATEST)
  pricedAtCost    Decimal?  @db.Decimal(14, 4)  // cost used when the price was last set; mismatch = "price to review"
  updatedAt       DateTime  @updatedAt
  product         Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model Supplier {
  id         String   @id @default(cuid())
  name       String
  phone      String?
  area       String?
  address    String?
  notes      String?
  isArchived Boolean  @default(false)
  createdAt  DateTime @default(now())
  purchases  Purchase[]
  @@index([name])
}

model Purchase {
  id           String         @id @default(cuid())
  supplierId   String
  purchaseDate DateTime       @db.Date
  invoiceNo    String?
  subtotal     Decimal        @db.Decimal(14, 2)
  extraCharges Decimal        @default(0) @db.Decimal(12, 2)   // transport, loading
  total        Decimal        @db.Decimal(14, 2)
  notes        String?
  status       PurchaseStatus @default(ACTIVE)
  voidedAt     DateTime?
  voidReason   String?
  replacesId   String?        @unique
  createdAt    DateTime       @default(now())
  supplier     Supplier       @relation(fields: [supplierId], references: [id])
  items        PurchaseItem[]
  replaces     Purchase?      @relation("PurchaseCorrection", fields: [replacesId], references: [id])
  replacedBy   Purchase?      @relation("PurchaseCorrection")
  @@index([supplierId, purchaseDate])
  @@index([purchaseDate])
}

model PurchaseItem {
  id           String   @id @default(cuid())
  purchaseId   String
  productId    String
  quantity     Decimal  @db.Decimal(14, 3)      // as entered (2 boxes)
  unitId       String                            // unit as entered (box)
  unitsPerPack Decimal? @db.Decimal(14, 3)       // base units inside one pack (24)
  baseQty      Decimal  @db.Decimal(14, 3)       // quantity in product base unit (48)
  lineAmount   Decimal  @db.Decimal(14, 2)       // what the owner paid for this line
  extraShare   Decimal  @default(0) @db.Decimal(14, 2) // allocated share of extra charges
  unitCost     Decimal  @db.Decimal(14, 4)       // (lineAmount + extraShare) / baseQty
  purchase     Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  product      Product  @relation(fields: [productId], references: [id])
  unit         Unit     @relation(fields: [unitId], references: [id])
  @@index([productId, purchaseId])
}

model StockMovement {
  id             String          @id @default(cuid())
  productId      String
  type           MovementType
  quantityChange Decimal         @db.Decimal(14, 3)   // signed, base unit
  stockAfter     Decimal         @db.Decimal(14, 3)
  reason         AdjustmentReason?
  note           String?
  refType        String?                                // "purchase" | "order"
  refId          String?
  createdAt      DateTime        @default(now())
  product        Product         @relation(fields: [productId], references: [id])
  @@index([productId, createdAt])
}

model PriceHistory {            // ADMIN ONLY (contains cost)
  id            String   @id @default(cuid())
  productId     String
  oldPrice      Decimal? @db.Decimal(12, 2)
  newPrice      Decimal  @db.Decimal(12, 2)
  markupPercent Decimal? @db.Decimal(6, 2)
  costUsed      Decimal? @db.Decimal(14, 4)
  createdAt     DateTime @default(now())
  product       Product  @relation(fields: [productId], references: [id])
  @@index([productId, createdAt])
}

model Order {
  id              String         @id @default(cuid())
  orderNumber     String         @unique            // "PS-1001"
  idempotencyKey  String         @unique
  status          OrderStatus    @default(PLACED)
  fulfilment      FulfilmentType
  customerName    String
  customerPhone   String
  addressLine     String?
  area            String?
  landmark        String?
  pincode         String?
  notes           String?
  subtotal        Decimal        @db.Decimal(12, 2)
  deliveryFee     Decimal        @default(0) @db.Decimal(12, 2)
  total           Decimal        @db.Decimal(12, 2)
  rejectedReason  String?
  cancelReason    String?
  placedAt        DateTime       @default(now())
  items           OrderItem[]
  events          OrderEvent[]
  @@index([status, placedAt])
  @@index([customerPhone])
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  productId   String
  productName String                              // snapshot
  unitLabel   String                              // snapshot, e.g. "kg"
  quantity    Decimal @db.Decimal(14, 3)
  unitPrice   Decimal @db.Decimal(12, 2)          // snapshot
  lineTotal   Decimal @db.Decimal(12, 2)
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product     Product @relation(fields: [productId], references: [id])
  cost        OrderItemCost?
}

model OrderItemCost {           // ADMIN ONLY, written at acceptance, for future profit reports
  orderItemId String  @id
  unitCost    Decimal? @db.Decimal(14, 4)
  orderItem   OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
}

model OrderEvent {
  id        String      @id @default(cuid())
  orderId   String
  status    OrderStatus
  note      String?
  createdAt DateTime    @default(now())
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
}

model ShopSettings {            // singleton, id = 1
  id               Int          @id @default(1)
  shopName         String       @default("Pandian Store")
  tagline          String?
  phone            String
  whatsapp         String?
  addressLine      String
  area             String
  city             String
  pincode          String
  hoursText        String
  deliveryEnabled  Boolean      @default(true)
  pickupEnabled    Boolean      @default(true)
  deliveryNote     String?                         // "We deliver within 3 km of the shop."
  minOrderAmount   Decimal      @default(0) @db.Decimal(10, 2)
  deliveryFee      Decimal      @default(0) @db.Decimal(10, 2)
  freeDeliveryAbove Decimal?    @db.Decimal(10, 2)
  acceptingOrders  Boolean      @default(true)
  roundingMode     RoundingMode @default(UP_1)
  orderCounter     Int          @default(1000)
}

model AuditLog {
  id        String   @id @default(cuid())
  action    String
  entity    String
  entityId  String
  data      Json?
  createdAt DateTime @default(now())
  @@index([entity, entityId])
}

model RateLimit {
  key     String   @id
  count   Int
  resetAt DateTime
}
```

**Rules:** products, suppliers, categories and purchases are **never hard-deleted** once referenced (archive/void instead). `onDelete: Restrict` is the default for history. Seed canonical `Unit` rows: `kg`, `g`, `litre`, `ml`, `piece`, `packet`, `bottle` (isBaseable: kg, litre, piece, packet, bottle), `dozen` (COUNT, factor 12), and PACK units `box`, `carton`, `bag`, `can`, `case`.

---

## 9. DOMAIN RULES (pure functions in `src/server/domain`, each with unit tests)

### 9.1 Units and conversion
- A product has one **base unit** (`isBaseable`). Stock, price and cost are all per base unit.
- Purchase line conversion to base units:
  - Same dimension, non-pack (g to kg, ml to litre): `baseQty = quantity × unit.factorToBase / base.factorToBase`.
  - COUNT: allowed purchase units are the product's own base unit or `dozen` (×12). Anything else is rejected.
  - PACK (box, carton, bag, can, case): the owner **must** enter "contains N [base unit]". `baseQty = quantity × unitsPerPack`. Remember `unitsPerPack` as the next default for that product.
  - **Reject cross-dimension conversions** (litre to kg) with a plain-language error.
- Quantities: up to 3 decimals. Formatting helper shows `0.5 kg` as `500 g` and `0.25 litre` as `250 ml`.

### 9.2 Unit cost and extra charges
- `lineAmount` is canonical. The form lets the owner enter **either** the rate per entered unit **or** the line total; the other is computed live.
- `extraShare = extraCharges × lineAmount / Σ lineAmount`. `unitCost = (lineAmount + extraShare) / baseQty`, kept to 4 decimals.
- Example: 2 boxes × 24 packets for ₹2,880 → baseQty 48, unitCost ₹60 / packet.

### 9.3 Costing
- Maintain `lastCost` (most recent ACTIVE purchase item) and `avgCost` (**moving weighted average**).
- On a purchase: `stockBefore' = max(stockBefore, 0)`; `avg = (stockBefore' × avg + baseQty × unitCost) / (stockBefore' + baseQty)`; if `stockBefore' = 0`, `avg = unitCost`. Sales and adjustments change stock but not the average.
- After a **void or correction**, recompute `avgCost` and `lastCost` by **replaying the ledger** in time order, ignoring voided purchases (a pure, tested function `recomputeCosts(events)`).
- Required tests: 20 L @ ₹120 then 30 L @ ₹125 with nothing sold gives ₹123; a sale in between leaves the average unchanged; replay after a void matches a fresh computation.

### 9.4 Pricing engine
- `costForPricing = basis === LATEST ? lastCost : avgCost` (per product, default LATEST).
- `suggested = round(costForPricing × (1 + markup/100))` using `ShopSettings.roundingMode` (NONE, NEAREST_HALF, NEAREST_1, UP_1), ROUND_HALF_UP.
- **Three suggestions** from the product's category: Low / Recommended / High. Seed defaults are *starting points only*; label them "starting points from your category settings", never "market price".
- Also compute and **display separately**: `markup% = (price − cost)/cost`, `margin% = (price − cost)/price`, `profit/unit`. A 20% markup is a 16.67% margin; the UI must make that clear with a one-line helper.
- The owner can enter a markup %, **or** type a selling price directly (markup is back-calculated).
- Guards: if `mrp` is set and `price > mrp`, block and explain; if `price < cost`, warn and require a confirm tap; if no cost exists yet, suggestions are disabled with "Record a purchase to get suggestions" and the product stays unpublished until a price is set.
- Every price change writes a `PriceHistory` row and an `AuditLog` row. Old orders keep their snapshot price.
- **Prices to review:** a product is flagged when `costForPricing !== pricedAtCost`. Saving a price sets `pricedAtCost = costForPricing`.

### 9.5 Stock
- `Product.stockQty` is a cached value updated **in the same transaction** as a `StockMovement` row carrying `stockAfter`. A test asserts `stockQty === Σ movements` for every product after the full seed + flow tests.
- Stock can never go negative. Outflows use a row-locked check (`SELECT ... FOR UPDATE`, ordered by product id to avoid deadlocks) or an atomic conditional update.
- Manual adjustment modes: add, remove, set to counted quantity. A **reason is required** (`AdjustmentReason`) with an optional note.
- Void a purchase: allowed only if reversing it keeps every affected product's stock ≥ 0; otherwise block with "Some of this stock is already sold. Use a stock adjustment instead." **Correct** = pre-filled form; saving creates a new purchase with `replacesId` and voids the old one in a single transaction.

### 9.6 Orders
- Statuses and the only legal transitions (enforced server-side by a pure state machine, with tests):
  - `PLACED → ACCEPTED | REJECTED | CANCELLED`
  - `ACCEPTED → PROCESSING | CANCELLED`
  - `PROCESSING → READY | CANCELLED`
  - `READY → COMPLETED | CANCELLED`
  - `COMPLETED`, `REJECTED`, `CANCELLED` are terminal.
- **Placing an order** (public, one transaction): reject if `acceptingOrders` is off; validate every item (exists, published, priced, not archived); quantity within `minQty..maxQty`, multiple of `sellStep`; soft-check quantity ≤ `stockQty`; enforce minimum order amount; **recompute all prices and totals on the server and ignore any browser-sent price or total**; delivery requires address fields and pincode; take the next order number via an atomic counter increment (`PS-1001`, `PS-1002`...); require an idempotency key (a repeat returns the existing order). No stock change.
- **If prices changed since the customer's cart was priced**, return a `PRICE_CHANGED` result with the new totals and require an explicit "Place order at new prices" confirm.
- **Accept:** in one transaction, lock products, verify stock for every line, deduct, write `ORDER_ACCEPTED` movements, write `OrderItemCost` snapshots (current `avgCost`, falling back to `lastCost`), set status, write an `OrderEvent`. If any line is short, fail the whole accept with a per-item message. The owner may reduce or remove lines on a `PLACED` order before accepting (logged in the event note).
- **Cancel after accept:** write `ORDER_RESTORED` movements. **Reject/cancel from PLACED:** no stock change. A reason is required for reject and cancel.
- Two simultaneous accepts of the last unit must result in exactly one success (tested).
- Customer-facing status wording: Request received · Confirmed · Being packed · Ready for pickup / Out for delivery · Completed · Not accepted · Cancelled. Make clear a submitted request is **not** a confirmation until the shop accepts.

### 9.7 Search
- Postgres `ILIKE` plus `pg_trgm` similarity for typo tolerance over `name`, `nameTamil`, `brand`, category name. Ranking: exact/prefix, then contains, then fuzzy. Suggestions endpoint: debounce 200 ms, max 6 results, public DTO only.
- Admin global search covers suppliers, products, purchases (invoice no), and orders (order number or phone).

---

## 10. OWNER PORTAL SPECIFICATION

**Navigation.** Desktop: left sidebar (Dashboard, Orders with a live count badge, Products, Categories, Suppliers, Purchases, Inventory, Pricing, Reports, Settings), a top bar with global search and a **Privacy mode** toggle (masks every cost/profit figure with dots; persisted in localStorage; default off). Mobile: bottom tab bar (Home, Orders, **New purchase** as the central action, Stock, More). All touch targets ≥ 44 px. Numeric fields use `inputMode="decimal"`.

**Login.** Email + password, clear error text, rate-limited, secure cookie, 14-day session, logout, change password in Settings. The first owner is created by the seed from `OWNER_EMAIL` / `OWNER_INITIAL_PASSWORD`; force a password change on first login.

**Dashboard** answers five questions at a glance: how many products · what is running low · what I bought recently and where · what customer orders are waiting · which prices need review. Cards: new orders (with "Pause orders" switch), low-stock count, purchases this month, stock value (privacy-maskable), prices to review. Lists: recent purchases (supplier, date, item count, total), recent orders. New orders appear without a refresh (poll every 15 s, update the tab title with the count).

**Suppliers.** List with search, add/edit/archive. **Supplier profile:** contact, summary (purchase count, distinct products, total spent), tab **Purchases** (date, invoice, items, total) and tab **Products bought** (product, times bought, last price, lowest price, last date, last quantity) with in-page search. This is the screen that answers "I went to ABC Wholesale; what did I buy there, when and for how much, and what do I sell it for": include a **current selling price** column.

**Categories.** CRUD, order up/down, icon picker from the fixed Phosphor set, tint, and the three default markups (Low/Recommended/High). Cannot archive a category that still has active products.

**Products.** Table with thumbnail, name (+ Tamil), category, stock with status chip, selling price, margin (privacy-maskable), published switch, and a "price to review" marker. Add/edit form: name, Tamil name, brand, category, base unit, size label, sell step, min/max quantity, description, MRP, selling price (via the pricing panel below), up to 3 images (drag to reorder, first is primary, ≤ 3 MB, jpg/png/webp), featured, published. **Product detail tabs:** Overview, **Purchase history** (every purchase of this product: supplier, date, qty, unit, total, unit cost; filter by supplier and date; the cheapest supplier highlighted; a small price-trend chart), **Stock movements**, **Price history**.

**Purchases.**
- *List:* filters (supplier, product, date range), search by invoice no, status chip. Detail view with items, void and "Correct" actions, audit trail (who/when/why).
- *New purchase form* (the most important screen; design it phone-first):
  1. Supplier combobox with **"Add new supplier"** inline. Date (defaults to today, no future dates). Optional invoice no.
  2. **Line cards** (not a spreadsheet): product combobox (search English or Tamil; **"Add new product"** inline asking only name, category, base unit), quantity, unit (only compatible units offered), pack contents when a pack unit is chosen ("Each box has [24] packets"), then rate **or** line total, with the other computed live and the base-unit cost shown ("₹60 / packet"). A chip compares with the last purchase ("4% higher than last time" using an icon, never a typed arrow).
  3. "Add another item", optional extra charges (transport/loading), running total, sticky Save bar.
  4. **Autosave the draft** locally and offer to restore it after a refresh.
  5. After save: success state, then the **Review selling prices** step: for every line whose cost changed, show product, new cost, last cost, current price, Low/Recommended/High chips plus custom %, resulting price, profit/unit, markup and margin; checkboxes; "Apply selected prices" or "Skip for now" (items stay in *Prices to review*). Also "Add another purchase".

**Inventory.** Table with filters (All, Low, Out), stock in base unit, threshold, stock value (privacy-maskable), "Adjust stock" dialog (add/remove/set + required reason), movement history drawer, CSV export.

**Pricing.** One table of all products: cost basis toggle (latest/average), last cost, avg cost, markup %, selling price, margin %, MRP, status ("review", "below cost", "above MRP"). Inline editing of markup or price with the same guards as 9.4, bulk "Apply recommended to selected", and the page-level helper that explains markup vs margin in one sentence.

**Orders.** Tabs by status with counts. Detail: customer, fulfilment, address, notes, items with a stock-OK / short badge per line, timeline of events, action buttons for legal transitions only, reject/cancel dialog with required reason, reduce/remove line before accepting, a **"Message on WhatsApp"** link (`wa.me` with a prefilled, status-aware message; no API), and **Print order slip** (print stylesheet, A5, **contains no cost data**).

**Reports (basic, all with CSV export):** purchases by supplier and date range · purchases by product (with price trend) · stock valuation · low stock · orders summary (count and value by status). Also **"Export all data"** (a zip of CSVs) on Settings for owner-held backups.

**Settings.** Shop profile (name, phone, WhatsApp, address, hours, tagline), delivery and pickup toggles, delivery note, minimum order, delivery fee and free-delivery threshold, **Accepting orders** switch, rounding rule, change password.

**Empty and error states** are designed for every list and form: say what is empty and the one action to fix it. Errors say what happened and how to fix it; they do not apologize.

---

## 11. STOREFRONT SPECIFICATION (Amazon-inspired, beginner-friendly)

Borrow Amazon's *patterns* (search-first, dense scannable grids, clear price hierarchy, sticky cart, trust cues), not its look.

**Global chrome.**
- *Desktop header:* utility strip (shop hours, delivery/pickup note, phone) · main bar (Pandian Store wordmark, **large search with a category dropdown and live suggestions**, Track order, Cart with item count and subtotal) · category strip (horizontal links).
- *Mobile:* compact top bar with wordmark and cart; **sticky search field**; **bottom navigation** (Home, Categories, Cart, Track); category chips row. Respect safe-area insets; never horizontal scroll at 360 px.
- Footer: address, hours, phone, WhatsApp, "Prices include taxes. Pay on delivery or at the shop."
- If `acceptingOrders` is off: a persistent notice "We're not taking new orders right now", add-to-cart and checkout disabled.

**Home.** Compact "shop notes" band (hours, delivery area, minimum order: real values from settings, not marketing slogans) · **Shop by category** (tile per category using its Phosphor icon on its tint) · **Today's essentials** (featured) · **Offers** (products with MRP above price, showing the saving) · **Recently added**. Rows are horizontal scrollers on mobile and grids on desktop. Not a marketing hero.

**Search and category pages.** Results grid with: category filter, price range, in-stock-only, sort (relevance, price low to high, high to low, name). Mobile filters open as a bottom sheet. Pagination or "Load more" (60 items max per page). A helpful no-results state with spelling hints and category links.

**Product card.** Image, name (2 lines max) with the Tamil name smaller beneath, size label, price large (₹ small) with `/ kg`-style unit for weight/volume, MRP struck through and "Save ₹X" when applicable, stock chip ("In stock", "Only 3 kg left", "Out of stock"), and **Add** that turns into a **− qty +** stepper after the first tap (steps follow `sellStep`). Loose goods also offer quick picks (250 g, 500 g, 1 kg, 2 kg).

**Product page.** Gallery, name, price block, unit/quantity selector with quick picks, stock status, Add to cart, description, "More from this category". **Sticky add-to-cart bar on mobile.**

**Placeholder imagery.** Products without photos render a designed tile: the category's Phosphor icon, large, on the category tint, with the size label. No stock photos, no random-photo services, no fake logos. The tile is replaced automatically when a real photo is uploaded.

**Cart.** Slide-over from the header on desktop, full page on mobile. Quantity steppers, remove, subtotal, minimum-order progress, and notices for changed prices or items that went out of stock (the cart is stored in `localStorage` as `{productId, qty}` only and **re-priced from the server on every load**). Add feedback is a button state change plus a cart-count bump, nothing flashy.

**Checkout (single page).** Name, phone (10-digit Indian mobile validation), **Delivery or Pickup** (only enabled options), address fields for delivery (house/street, area, landmark, pincode), notes, an order summary, and a clear line: "This sends your order to the shop. It is confirmed only when the shop accepts it. Pay on delivery or at the shop." Primary button: **Send order request**. Anti-spam: honeypot field, per-IP and per-phone rate limit, idempotency key generated client-side, double-tap protection. Server-side validation with field-level error messages.

**Confirmation.** Order number, summary, what happens next, a Track order link, and an optional **"Send this order on WhatsApp"** button (`wa.me`) to the shop number.

**Track.** Order number + phone → status timeline with the customer-facing wording from 9.6. Rate-limited, generic failure message.

**Contact.** Address, hours, phone, WhatsApp, map link (a link, not an embedded script).

**SEO and technical.** Metadata, Open Graph, `sitemap.xml`, `robots.txt` (disallow `/admin`), JSON-LD `GroceryStore` and `Product` (price, availability; never cost). Catalogue pages use tag-based caching revalidated on product, price and stock changes, with availability re-checked at cart and checkout. Loading skeletons for every async region (Neon can cold-start).

---

## 12. DESIGN DIRECTION (proposal; refine through the `frontend-design` process, and justify every change)

**Design Read (state this line before designing):** *"Reading this as: trust-first local grocery commerce for mixed-age families on phones and laptops, with a dense, scannable Amazon-pattern language, leaning toward Tailwind v4 + owned shadcn components + Geist."*

**Dials (taste-skill, storefront):** `DESIGN_VARIANCE 3`, `MOTION_INTENSITY 2`, `VISUAL_DENSITY 7`. The admin portal is calmer and denser: motion 1, density 6.

**Palette (proposal; tune within the same intent):**
- Leaf (brand, header): `#17492F`
- Turmeric (primary action, the "Add" button; dark text on it): `#F4B223`
- Deal red (savings, out-of-stock, destructive): `#B3261E`
- Surface: `#FFFFFF`; page background `#F5F7F4`; border `#E1E5DF`
- Ink `#1B1F1C`; muted `#5B635D`
- One accent family only (leaf + turmeric). Greys share one slightly green-tinted hue. No pure black. No gradients, no glass, no colored glows.

**Type.** One family (Geist) plus the Tamil fallback. Prices and quantities use tabular figures. A clear scale (for example 12/14/16/20/28/40), weights 400/500/600, sentence case, body line length under 75 characters. Do **not** accent a single word in a headline.

**Shape and depth.** A deliberate radius hierarchy (image 8 px, controls 6 px, dialogs 12 px, chips pill-shaped but small), borders over shadows, at most one very soft shadow for popovers. Cards are used only where they group real content; no cards inside cards.

**Motion.** Only motion that answers an action: button states, cart-count bump, drawer and sheet transitions, skeletons. **No** scroll-reveal fade-ups, no hover lifts on every card, no ambient loops. Respect `prefers-reduced-motion`.

**Responsive.** Breakpoints 360 / 640 / 768 / 1024 / 1280 / 1536. Mobile first. Use CSS Grid, `min-h-[100dvh]`, and `max-w-7xl`. Product grids: 2 columns on phones, 3 at 768, 4 to 5 on desktop. Admin tables collapse into stacked rows on phones, never sideways scrolling for primary data.

**Accessibility.** WCAG AA contrast, visible focus rings, labelled inputs, a keyboard-operable combobox, `aria-live` for cart updates and form errors, semantic landmarks, 44 px targets.

### 12.1 AI-slop prevention checklist (hard gate; run `taste-skill` Section 9 and `redesign-skill`)
- [ ] No purple/blue AI gradients, mesh backgrounds, glassmorphism, gradient text, or glowing buttons
- [ ] No emojis anywhere (UI, seed data, alt text, docs for the owner)
- [ ] No identical rounded-card walls with the same grey shadow; hierarchy comes from type, space and borders
- [ ] No tracked-out ALL-CAPS eyebrow labels, no "01 / 02 / 03" numbering unless content is a real sequence, no "A · B · C" meta strings, no "→" appended to links or buttons
- [ ] No em dashes in UI copy; no centered-hero-over-gradient; no three-equal-feature-cards row
- [ ] No fake testimonials, fake stats, "10,000+ happy customers", or invented brand logos
- [ ] No "Lorem ipsum", "John Doe", "Acme", or generic product names; seed data is realistic and Indian
- [ ] Icons: one Phosphor family, one weight, no hand-drawn SVGs
- [ ] No default shadcn look: tokens, radii, focus rings, tables and buttons are visibly restyled
- [ ] Every screen has loading, empty, error and success states
- [ ] Copy is plain, specific, active voice (see Section 13)

---

## 13. COPY RULES

Write for a shop owner and for families, not for developers. Sentence case. Buttons say exactly what happens: "Save purchase", "Send order request", "Apply selected prices". Use shop words: "stock", "bill", "wholesale store", "what you paid", "selling price", "profit". Never show raw codes, enums or error stacks. An action keeps one name through the whole flow ("Saved" toast after "Save"). Errors state the problem and the fix. Keep every string in `lib/copy.ts`. Avoid filler words such as "seamless", "elevate", "unlock", "supercharge".

---

## 14. SECURITY REQUIREMENTS

1. Auth: bcrypt hashes, `httpOnly` + `secure` + `sameSite=lax` cookies, 14-day session, generic login errors, login rate limit (5 per 15 min per IP+email) using the `RateLimit` table.
2. Authorization: `requireOwner()` at the top of **every** admin server action, route handler and admin data function. Admin pages send `Cache-Control: no-store` and `noindex`.
3. Validate every input with Zod on the server. Never trust browser prices, totals, stock or IDs. Enforce quantity step, min/max and string length limits.
4. Public endpoints rate-limited: place order (5 per 10 min per IP and per phone), track (10 per 10 min), suggestions (generous but capped).
5. CSRF: rely on Server Actions' origin checks; for JSON route handlers verify `Origin`/`Host`.
6. Headers: strict CSP appropriate for Next (nonce if feasible, otherwise a minimal-allowance policy that you verify does not break pages), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`, HSTS.
7. Uploads: owner only, server-signed, type and size checked, Cloudinary `f_auto,q_auto`.
8. Secrets only in environment variables; `.env.example` lists all of them; nothing secret reaches the client bundle.
9. Database writes that touch stock or money run in transactions. Log price changes, adjustments, voids and order status changes to `AuditLog`.
10. Customer personal data (name, phone, address) is visible only to the owner and only on order screens.

Environment variables: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, `OWNER_EMAIL`, `OWNER_INITIAL_PASSWORD`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_SITE_URL`.

---

## 15. TESTING AND VERIFICATION

**Unit (Vitest), written before the UI that uses them:** money rounding (half up, each rounding mode); unit conversion (pack, dozen, g↔kg, ml↔litre, rejected cross-dimension); extra-charge allocation; unit cost; moving average (including the ₹123 example, a sale in between, replay after void); pricing (₹100 @ 12% = ₹112; 20% markup = 16.67% margin; MRP cap; below-cost flag); order state machine (every legal and illegal transition); quantity step validation; order total recomputation.

**Integration (real Postgres, separate test schema or Neon branch):**
1. Buy rice from two suppliers: both purchases appear in each history; both costs retained.
2. Same item at a new price: old purchase cost unchanged; `lastCost` and `avgCost` update correctly.
3. 25 kg bag purchase: stock +25 kg. Sell 0.5 kg through an accepted order: stock −0.5.
4. 2 boxes × 24 packets: stock +48 packets.
5. Void a purchase: stock and costs revert; blocked when stock was already sold.
6. Correct a purchase: old voided, new linked, one transaction.
7. Two simultaneous accepts of the last unit: exactly one succeeds, stock never negative.
8. Reject/cancel: correct stock behavior per 9.6.
9. Change a price: the old order keeps its snapshot price.
10. Ledger invariant: `stockQty === Σ movements` for every product.
11. Place-order idempotency: same key twice returns one order.
12. Tampered browser total/price is ignored.

**Privacy leak test (mandatory, runs in CI):** seed distinctive secrets (a supplier named `ZZ-SECRET-SUPPLIER`, a cost of `37.77`, a markup of `13.37`). Crawl every public page and every public API route (home, search, categories, products, cart validation, checkout, confirmation, track) and assert none of those strings, nor the keys `cost`, `avgCost`, `lastCost`, `markup`, `supplier`, `purchase`, appear in HTML, the RSC/flight payload, JSON responses, `__NEXT_DATA__`, sitemap or JSON-LD. Also assert unauthenticated requests to every admin route and action return a redirect or 401/403.

**UI verification (via `webapp-testing`):** for every page, screenshot at 360x740, 390x844, 768x1024, 1280x800, 1536x900; assert zero console errors, no horizontal overflow, all touch targets ≥ 44 px on mobile. Scripted end-to-end flows: owner login → add supplier → add product → record multi-line purchase with a box conversion → review prices → customer finds the product by searching → adds loose goods (500 g) → checks out as delivery → owner accepts → stock drops → owner completes → customer tracks the order. Also keyboard-only passes through the purchase form and checkout.

**Performance:** Lighthouse mobile ≥ 90 on Home, Product and Search on a production build; LCP image prioritized; no layout shift from images.

---

## 16. DEMO DATA AND SHOP CONFIG

Two seed modes: `npm run db:seed` (**production-safe**: units, categories with markup defaults, settings, the owner account) and `npm run db:seed:demo` (adds demo data), plus `npm run db:reset-demo` to remove demo data cleanly. Demo data must never be required for the app to function.

**Shop details** live in `config/shop.seed.ts` as clearly marked editable fields: name "Pandian Store", phone, WhatsApp, address, area, city, pincode, hours. Do **not** invent a real-looking address or phone number: use an obviously placeholder value that the owner replaces in Settings, and list it in the final report. The wordmark is typographic text; do not generate a logo image.

**Demo catalogue (about 32 products, 8 categories):** Rice and Grains (loose Ponni rice, idli rice, wheat flour, rava, poha), Pulses and Dals (toor, urad, moong, chana dal), Oils and Ghee (groundnut oil and gingelly oil as 1 L pouches and loose litres, sunflower oil, ghee), Spices and Masala (chilli powder, turmeric powder, cumin, mustard, tamarind, salt, sugar), Snacks and Biscuits, Tea, Coffee and Beverages, Dairy and Eggs (packet milk, curd, eggs by the piece or tray), Household and Personal Care. Use mixed units: loose goods in kg/litre with 0.25 steps; packets, pieces, bottles; some bought in boxes/cartons/bags with conversions. Add Tamil names only where you are certain of the spelling (for example அரிசி, துவரம் பருப்பு, உளுத்தம் பருப்பு, பாசிப்பருப்பு, கடலைப் பருப்பு, சர்க்கரை, உப்பு, நல்லெண்ணெய், கடலை எண்ணெய், மிளகாய்த் தூள், மஞ்சள் தூள், புளி, சீரகம், கடுகு) and flag them for the owner to verify. Prices and MRPs are **demo values**, labelled as such in the README.

Also seed 4 fictional wholesale suppliers, about 25 purchases over six weeks with believable price movement between suppliers (so history, trends and "cheapest supplier" look real), about 8 orders across all statuses with realistic Tamil Nadu customer names and obviously fake phone numbers (`9000000001`...), and a few products flagged "price to review".

---

## 17. BUILD PHASES AND GATES

Every gate = `npm run typecheck && npm run lint && npm test` all green, plus the phase's listed checks, plus a `BUILD_LOG.md` entry and a commit. Do not start the next phase on a red gate.

**Phase 0. Plan (no code yet).** Read the ALWAYS skills. Write in `docs/DECISIONS.md`: the Design Read line; the `frontend-design` plan (palette, type, layout concept, principles, ASCII wireframes for storefront Home, Product, Cart, and admin Dashboard, New Purchase mobile); your review of that plan against the generic-defaults list and what you changed; the assumptions from Section 5. Optionally generate image comps (Section 2).

**Phase 1. Foundation.** Scaffold the app, Tailwind v4 tokens, fonts, restyled shadcn primitives, Phosphor icon map, route groups and shells (storefront and admin), Prisma schema + migration (including `pg_trgm`), seeds, Auth.js, `requireOwner`, rate limiter, audit helper, security headers, ESLint import boundary, CI scripts. **Domain library with full unit tests** (Section 9). Gate: unit tests green, owner can log in, public site renders an empty shell, import-boundary lint proven by a deliberate failing example that you then remove.

**Phase 2. Admin master data.** Settings, categories, suppliers (with profile shell), products with image upload and the pricing panel, units reference. Gate: create/edit/archive flows work on phone and desktop viewports.

**Phase 3. Purchases, inventory, costing.** New purchase form (all features in Section 10), purchase list/detail, void/correct, product and supplier purchase histories, inventory with adjustments, ledger invariant, price-review step. Gate: integration tests 1 to 6 and 10 pass; screenshot review of the purchase form at 360 and 1280.

**Phase 4. Pricing, dashboard, reports.** Pricing table, prices-to-review, dashboard, reports with CSV, global search, privacy mode, export-all. Gate: pricing tests, CSV opens correctly, privacy mode masks every cost surface (add a Playwright assertion).

**Phase 5. Storefront.** The `server/public` DTO layer first, then Home, search with suggestions, category, product, cart, checkout, confirmation, track, contact, SEO. Gate: leak test passes; full customer flow runs on mobile and desktop viewports.

**Phase 6. Order management.** Admin orders with the state machine, accept/deduct, restore, reduce-before-accept, notifications by polling, WhatsApp link, order slip. Gate: integration tests 7, 8, 11, 12 pass; the full end-to-end flow in Section 15 passes.

**Phase 7. Polish and states.** Loading, empty, error, success and 404 for every screen, copy pass against Section 13, keyboard and screen-reader checks, reduced motion.

**Phase 8. Design audit (`redesign-skill` + `taste-skill` Section 9 + `frontend-design` critique).** Take the full screenshot set, run the audit on every page, list generic patterns found, apply **targeted** fixes, re-shoot, and repeat until the Section 12.1 checklist is fully ticked. Apply the "remove one accessory" rule: cut decoration that does not serve a user task.

**Phase 9. Hardening.** Full security pass against Section 14, Lighthouse, concurrency test repeated 50 times, production build, `npm audit`, seed-from-scratch on an empty database, deployment config and a smoke test on the deployed preview.

**Phase 10. Handover.** `docs/ADMIN_GUIDE.md` (plain-language, step by step with screenshots of the real app: record a purchase, change profit, handle an order, fix a mistake), `docs/HANDOVER.md` (env vars, deploy, backup and restore, rotating secrets, free-tier limits and the Vercel Hobby note, how to add a field, known limitations), `docs/DEMO_SCRIPT.md` (a 10-minute walkthrough that shows the owner's two key wins first: *find what I bought from a store and for how much*, then *price it in two taps*; then the customer experience), and `README.md`.

---

## 18. FINAL REPORT (what you return when done)

1. What was built, per module, mapped to Section 4.1 (tick each).
2. Gate results and test counts; the leak test and concurrency test results explicitly.
3. Skills applied and where; skills skipped and why.
4. Screenshots list and any known visual compromises.
5. Decisions and assumptions you made beyond this document.
6. Items the client must supply or confirm: shop address, phone, WhatsApp, hours, logo, **real product photos (start with the top 30 items)**, Tamil name spellings, markup defaults per category, delivery area and minimum order, domain and hosting accounts.
7. Known limitations and the recommended next version (billing/invoices, supplier credit ledger, online payments, notifications).

## 19. DEFINITION OF DONE

- [ ] Every item in 4.1 works end to end on a phone and a desktop
- [ ] A customer can never obtain a purchase price, supplier, markup or profit figure by any route (leak test green)
- [ ] The owner can answer "what did I buy from this store, when, for how much, and what do I sell it for" in two taps from the supplier list
- [ ] The owner can change a profit percentage and see price, markup, margin and profit instantly
- [ ] Stock is always consistent with the ledger and never negative; the last unit cannot be oversold
- [ ] Old orders and old purchase costs are never altered by later changes
- [ ] The UI passes the Section 12.1 checklist and looks like a deliberate shop, not a template
- [ ] Production build, deployed preview, fresh-database seed and docs are all complete
- [ ] No TODOs, stubs, dead code, unused dependencies or console errors remain