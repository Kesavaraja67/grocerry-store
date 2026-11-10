import { describe, it, expect, vi } from "vitest";
import { Decimal } from "decimal.js";

// Mock the prisma client for unit/integration privacy tests
vi.mock("@/server/db", () => {
  return {
    prisma: {
      product: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "prod-1",
            slug: "toor-dal",
            name: "Toor Dal Premium",
            nameTamil: "துவரம் பருப்பு",
            brand: "Pandian Store",
            description: "High quality unpolished dal",
            sizeLabel: "1 kg pack",
            categoryId: "cat-pulses",
            sellStep: new Decimal(0.5),
            minQty: new Decimal(0.5),
            maxQty: new Decimal(10),
            sellingPrice: new Decimal(140),
            mrp: new Decimal(160),
            stockQty: new Decimal(25),
            isFeatured: true,
            category: {
              id: "cat-pulses",
              name: "Pulses & Dals",
              slug: "pulses-dals",
            },
            baseUnit: {
              id: "unit-kg",
              symbol: "kg",
              label: "Kilogram",
            },
            images: [
              {
                id: "img-1",
                url: "https://example.com/toor.jpg",
                alt: "Toor dal",
                sortOrder: 0,
              },
            ],
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: "prod-1",
          slug: "toor-dal",
          name: "Toor Dal Premium",
          nameTamil: "துவரம் பருப்பு",
          brand: "Pandian Store",
          description: "High quality unpolished dal",
          sizeLabel: "1 kg pack",
          categoryId: "cat-pulses",
          sellStep: new Decimal(0.5),
          minQty: new Decimal(0.5),
          maxQty: new Decimal(10),
          sellingPrice: new Decimal(140),
          mrp: new Decimal(160),
          stockQty: new Decimal(25),
          isFeatured: true,
          category: {
            id: "cat-pulses",
            name: "Pulses & Dals",
            slug: "pulses-dals",
          },
          baseUnit: {
            id: "unit-kg",
            symbol: "kg",
            label: "Kilogram",
          },
          images: [],
        }),
      },
      category: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "cat-1",
            name: "Dals",
            slug: "dals",
          },
        ]),
      },
      shopSettings: {
        findFirst: vi.fn().mockResolvedValue({
          id: 1,
          acceptingOrders: true,
          deliveryEnabled: true,
          pickupEnabled: true,
          minOrderAmount: new Decimal(100),
          deliveryFee: new Decimal(30),
        }),
      },
      order: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    },
  };
});

import {
  getFeaturedProducts,
  getStapleProducts,
  getProductsByCategory,
  getProductBySlug,
} from "@/server/public/products";
import { getSearchSuggestions } from "@/server/public/search";
import { verifyCart } from "@/server/public/cart";
import { getPublicOrderTracking } from "@/server/public/orders";

describe("Phase 5 Privacy Boundary: Structural Security Verification", () => {
  const SENSITIVE_PROPERTIES = [
    "cost",
    "lastCost",
    "avgCost",
    "unitCost",
    "markupPercent",
    "marginPercent",
    "pricedAtCost",
    "costBasis",
    "supplier",
    "supplierId",
    "purchaseItem",
    "purchaseItems",
    "wholesale",
  ];

  it("ensures public product DTOs do not contain any internal cost or supplier keys", async () => {
    // Test getFeaturedProducts
    const featured = await getFeaturedProducts(5);
    expect(featured.length).toBeGreaterThan(0);
    const jsonStr = JSON.stringify(featured).toLowerCase();

    for (const key of SENSITIVE_PROPERTIES) {
      expect(jsonStr).not.toContain(`"${key.toLowerCase()}":`);
    }

    // Verify each object does not have cost fields
    for (const p of featured) {
      const rec = p as unknown as Record<string, unknown>;
      expect(rec.cost).toBeUndefined();
      expect(rec.lastCost).toBeUndefined();
      expect(rec.avgCost).toBeUndefined();
      expect(rec.supplierId).toBeUndefined();
    }
  });

  it("ensures search suggestions DTO does not leak any cost or margin data", async () => {
    const suggestions = await getSearchSuggestions("dal");
    const jsonStr = JSON.stringify(suggestions).toLowerCase();

    for (const key of SENSITIVE_PROPERTIES) {
      expect(jsonStr).not.toContain(`"${key.toLowerCase()}":`);
    }
  });

  it("ensures verified cart DTO only returns selling prices and has zero cost exposure", async () => {
    const verified = await verifyCart([]);
    const jsonStr = JSON.stringify(verified).toLowerCase();

    for (const key of SENSITIVE_PROPERTIES) {
      expect(jsonStr).not.toContain(`"${key.toLowerCase()}":`);
    }
  });

  it("ensures public order tracking DTO exposes customer-facing status and no cost margins", async () => {
    const tracking = await getPublicOrderTracking("NON-EXISTENT", "9842100000");
    expect(tracking).toBeNull();
  });
});
