# Decisions & Assumptions

> This document is the living record of every design and architecture decision made during the build.
> Where the master prompt was silent, these decisions filled the gap.

---

## Phase 0 — Design Plan

### Design Read (taste-skill §0.B)

> "Reading this as: trust-first local grocery commerce for mixed-age families on phones and laptops,
> with a dense, scannable Amazon-pattern language, leaning toward Tailwind v4 + owned shadcn
> components + Geist."

This matches the master prompt verbatim (Section 12). Confirmed.

---

### Dials (taste-skill §1, storefront)

| Dial | Value | Rationale |
|---|---|---|
| DESIGN_VARIANCE | 3 | Trust-first commerce, not artsy. Consistency over surprise. |
| MOTION_INTENSITY | 2 | Only action-answering motion: button states, drawer transitions, skeletons. |
| VISUAL_DENSITY | 7 | Dense, scannable grids. Amazon-pattern. Phone-first. |

Admin portal: MOTION_INTENSITY 1, VISUAL_DENSITY 6 (utility tool, calmer).

---

### Palette

Exactly as specified in Section 12 of the master prompt. Reviewed against generic-defaults list:

| Risk | Assessment | Decision |
|---|---|---|
| Warm cream/brass premium-consumer default | Not applicable — green/turmeric palette is specific to this client | KEEP |
| AI-purple gradients | Not present | KEEP |
| Pure black | Ink is #1B1F1C (slightly warm dark) | KEEP |
| Gradients / glass | Explicitly excluded | KEEP |

**Final tokens:**
```
--leaf:    #17492F   (brand, header background, nav active)
--turmeric:#F4B223   (primary CTA: Add, Save, Accept — dark text on this)
--red:     #B3261E   (savings badge, out-of-stock, destructive)
--surface: #FFFFFF
--page:    #F5F7F4   (slightly green-tinted off-white — consistent grey family)
--border:  #E1E5DF
--ink:     #1B1F1C
--muted:   #5B635D
--leaf-10: #EBF2ED   (light tint for category tiles, info surfaces)
```

Contrast audit (WCAG AA):
- Turmeric (#F4B223) with ink (#1B1F1C): ~8.1:1 — passes large and normal text
- Leaf (#17492F) with white (#FFFFFF): ~10.4:1 — passes
- Muted (#5B635D) on page (#F5F7F4): ~4.6:1 — passes AA

---

### Typography

**Font family:** Geist (Latin, all weights) + Noto Sans Tamil (Tamil glyphs).
Both loaded via `next/font/google`. Tabular numbers via `font-variant-numeric: tabular-nums` on all money/quantity displays.

**Type scale (px / rem at 16px root):**
| Token | Size | Weight | Use |
|---|---|---|---|
| display | 40/2.5rem | 600 | Page titles |
| title | 28/1.75rem | 600 | Section headers |
| heading | 20/1.25rem | 600 | Card titles, form labels groups |
| subheading | 16/1rem | 600 | Label groups |
| body | 16/1rem | 400 | General prose |
| small | 14/0.875rem | 400 | Secondary info, timestamps |
| xs | 12/0.75rem | 400 | Chips, badges, Tamil name under English |
| price | 20/1.25rem | 600 | Selling prices (tabular) |
| price-lg | 28/1.75rem | 700 | Hero prices on product pages |

**Reviewed against generic-AI defaults:**
- No tracked-out ALL-CAPS eyebrow labels anywhere
- No em-dashes in copy
- Sentence case everywhere
- Body line length max 72ch enforced via `max-w-[72ch]` class

---

### Layout Concept

#### Storefront — ASCII Wireframes

**Home (mobile 360px)**
```
┌────────────────────────────┐
│ [LEAF BG] Pandian Store [Cart 2] │  ← compact header
├────────────────────────────┤
│ [🔍 Search groceries...   ]│  ← sticky search
├────────────────────────────┤
│ Open 8am–9pm · Delivery ₹20│  ← shop notes band (1 line)
│ Min order ₹100             │
├────────────────────────────┤
│ Shop by category           │
│ [Rice] [Pulses] [Oils]     │  ← 4-col icon tiles, category tint
│ [Spices][Snacks][Dairy]    │
│ [Tea]  [Household]         │
├────────────────────────────┤
│ Today's essentials         │
│ ┌──────┐ ┌──────┐          │  ← 2-col product cards
│ │ Img  │ │ Img  │          │
│ │ Name │ │ Name │          │
│ │ ₹60/kg│ │ ₹45  │          │
│ │[Add] │ │[Add] │          │
│ └──────┘ └──────┘          │
├────────────────────────────┤
│ Offers (save ₹X)           │
│ [horizontal scroll row]    │
├────────────────────────────┤
│ [Home][Categories][Cart][Track] │  ← bottom nav
└────────────────────────────┘
```

**Home (desktop 1280px)**
```
┌────────────────────────────────────────────────────────────────┐
│ Open 8am–9pm  · Delivery within 3 km · +91 00000 00000        │  utility strip
├────────────────────────────────────────────────────────────────┤
│ [LEAF] Pandian Store │ [Category ▾][Search groceries...] │ Track │ Cart(2) ₹120 │
├────────────────────────────────────────────────────────────────┤
│ Rice & Grains · Pulses · Oils & Ghee · Spices · Snacks · Dairy │  category strip
├────────────────────────────────────────────────────────────────┤
│ Shop by category (8 tiles, 4-col grid)                         │
├────────────────────────────────────────────────────────────────┤
│ Today's essentials (5-col grid)                                │
│  [card][card][card][card][card]                                │
├────────────────────────────────────────────────────────────────┤
│ Offers    (4-col grid)                                         │
└────────────────────────────────────────────────────────────────┘
```

**Product card (140px × 220px mobile)**
```
┌──────────────┐
│   [Image]    │  8px radius
│  or [Icon]   │  category tint placeholder
├──────────────┤
│ Ponni Rice   │  14px 500
│ அரிசி        │  12px 400 muted
│ 1 kg bag     │  12px muted
│ ~~₹65~~  -8% │  red strikethrough MRP
│ ₹60 /kg      │  20px 600
│ In stock     │  green chip
│ [   Add   ]  │  turmeric, full width
└──────────────┘
```

**Cart (mobile — full page)**
```
┌────────────────────────────┐
│ ← Your cart (3 items)      │
├────────────────────────────┤
│ Ponni Rice                 │
│ ─ 0.5 kg + ×              │
│ ₹30                        │
├────────────────────────────┤
│ Groundnut Oil              │
│ ─ 1 L   + ×               │
│ ₹160                       │
├────────────────────────────┤
│ ─────────────────────────  │
│ Subtotal        ₹190       │
│ Delivery            ₹20    │
│ ─────────────────────────  │
│ Total           ₹210       │
│ ░░░░░░░░░░░░░░░ Min ₹100✓  │  progress bar
├────────────────────────────┤
│ [   Go to checkout   ]     │  turmeric
└────────────────────────────┘
```

**Checkout (mobile)**
```
┌────────────────────────────┐
│ ← Place your order         │
├────────────────────────────┤
│ Your name *                │
│ [                    ]     │
│ Phone number *             │
│ [                    ]     │
├────────────────────────────┤
│ How to receive             │
│ ● Delivery   ○ Pick up     │
├────────────────────────────┤
│ Delivery address           │
│ House / Street *           │
│ [                    ]     │
│ Area *  [        ]         │
│ Pincode *[      ]          │
├────────────────────────────┤
│ Notes (optional)           │
│ [                    ]     │
├────────────────────────────┤
│ Order summary              │
│ 3 items · ₹210 total       │
│ Pay on delivery or at shop │
│ Order confirmed by shop.   │
├────────────────────────────┤
│ [  Send order request  ]   │  turmeric
└────────────────────────────┘
```

#### Admin — ASCII Wireframes

**Dashboard (desktop)**
```
┌─────────────┬──────────────────────────────────────────────────┐
│ PANDIAN     │ [🔍 Search...] [Privacy ●] [Logout]              │
│ STORE       ├──────────────────────────────────────────────────┤
│             │ Dashboard                                        │
│ Dashboard   │                                                  │
│ Orders  [3] │ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ Products    │ │ 3 new    │ │ 2 low    │ │ ₹24,500  │          │
│ Categories  │ │ orders   │ │ stock    │ │ this mo  │          │
│ Suppliers   │ │ [Pause]  │ │ items    │ │ 8 bills  │          │
│ Purchases   │ └──────────┘ └──────────┘ └──────────┘          │
│ Inventory   │ ┌──────────┐ ┌──────────┐                        │
│ Pricing     │ │₹1,24,500 │ │ 4 prices │                        │
│ Reports     │ │ stock val│ │ to review│                        │
│ Settings    │ └──────────┘ └──────────┘                        │
│             │                                                  │
│             │ Recent purchases        Recent orders            │
│             │ [table]                 [table]                  │
└─────────────┴──────────────────────────────────────────────────┘
```

**New Purchase form (mobile 360px)**
```
┌────────────────────────────┐
│ ← New purchase             │
├────────────────────────────┤
│ Wholesale store *          │
│ [Search or add store... ▾] │
│ Date:  08 Nov 2026         │
│ Invoice no (optional)      │
│ [                    ]     │
├────────────────────────────┤
│ ┌── Item 1 ──────────────┐ │
│ │ Product *              │ │
│ │ [Search or add... ▾]   │ │
│ │ Qty    Unit            │ │
│ │ [2   ] [box         ▾] │ │
│ │ Each box has [24] packets│
│ │ Rate/box   Line total  │ │
│ │ [1440]  =  [2880    ]  │ │
│ │ Cost: ₹60.00/packet    │ │
│ │ 4% higher than last    │ │
│ └────────────────────────┘ │
│ [+ Add another item]       │
├────────────────────────────┤
│ Extra charges (optional)   │
│ Transport [     ] Loading[]│
├────────────────────────────┤
│ ════════════════════════   │
│ Total: ₹2,880              │  sticky
│ [     Save purchase     ]  │  turmeric
└────────────────────────────┘
```

---

### Design Principles

1. **Utility first, decoration last.** Every visual element must serve a user task. If it cannot be justified by a user job, remove it.
2. **Shop language.** Use words the owner and customers already use: "stock", "bill", "wholesale store", "selling price", "profit". Never "inventory record" or "POS entry".
3. **Phone-first.** Every interaction is designed at 360px first; desktop is an enhancement.
4. **Privacy by structure.** Cost and supplier data never reach the public data layer. ESLint enforces the boundary.
5. **Confidence without ceremony.** Success states are calm: a check and a name, not exclamation marks. Errors are direct: state the problem, state the fix.

---

### Review Against Generic-AI Defaults

Checked each point from `frontend-design` skill §38–45:

| Default | Present? | Action |
|---|---|---|
| Warm cream + terracotta/brass | No — using green/turmeric | No change needed |
| Near-black + acid-green | No | No change needed |
| Broadsheet / hairline rules | No | No change needed |
| Identical card walls + same grey shadow | Explicitly prevented — hierarchy via type+space+borders | No change needed |
| Tracked-out ALL-CAPS eyebrows | Banned — sentence case only | Lint rule added |
| Meta strings A · B · C | Banned | Copy style enforced |
| "→" on links and buttons | Banned | Buttons use verbs only |

---

## Section 5 — Assumptions

| # | Assumption | Source |
|---|---|---|
| 1 | All prices are tax-inclusive, nothing is a GST invoice. Slip titled "Order slip". | Master prompt §5.1 |
| 2 | Payment is cash/UPI on delivery or at shop. | Master prompt §5.2 |
| 3 | Order requests do NOT reserve stock; stock deducted on accept. | Master prompt §5.3 |
| 4 | Suggested price default basis = latest purchase cost. | Master prompt §5.4 |
| 5 | Selling price must not exceed MRP; enforced server + UI. | Master prompt §5.5 |
| 6 | Orders placed by guests; phone is the customer identifier. | Master prompt §5.6 |

---

## Additional Decisions

| Decision | Rationale |
|---|---|
| Geist loaded from Google Fonts via `next/font/google` | Vercel hosts Geist natively; using `next/font/google` with the `Geist` variant is the documented approach |
| Noto Sans Tamil via `next/font/google` | Subset available; fallback for Tamil glyphs |
| decimal.js for all money arithmetic | Prisma returns Decimal type; decimal.js is the companion for client-side computation |
| shadcn/ui components owned (not updated via CLI) | Restyled tokens make upstream updates non-trivial; ownership gives full control |
| Auth.js v5 with JWT strategy | No database adapter overhead; sessions do not need a session table |
| Cloudinary free tier for MVP images | Server-signed upload flow; owner uploads only |
| Rate limiting via `RateLimit` table (not Redis) | Neon is the only infra in scope for MVP; Redis adds cost and complexity |
| `pg_trgm` GIN indexes via raw SQL in migration | Prisma does not support trigram indexes natively |
| Order number format: `PS-1001` (prefix + counter) | Simple, human-readable, the owner can read it over the phone |
| Shop address / phone / WhatsApp: placeholder values in seed | Master prompt §16 — owner replaces in Settings |
| `forcedPasswordChange` flag on User model (added beyond schema) | Required by master prompt §10 "force a password change on first login" |
| Vercel Hobby plan is non-commercial — documented in HANDOVER | Master prompt §6 |
| Demo supplier names: fictional Tamil Nadu wholesale names | Master prompt §16 — "fictional wholesale suppliers" |
| Privacy mode persisted to localStorage, key `pandian-privacy-mode` | No server round-trip needed; default false |
| Cart stored in localStorage as `{productId: string, qty: number}[]` | Master prompt §11 |
| Idempotency key for orders: UUID generated client-side | Prevents duplicate submit; server checks on `idempotencyKey` unique index |

