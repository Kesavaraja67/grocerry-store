import { describe, it, expect } from "vitest";
import { Decimal } from "decimal.js";
import { roundPrice, formatINR, RoundingMode } from "@/server/domain/money";
import {
  convertToBaseQuantity,
  formatQuantity,
  UnitInfo,
} from "@/server/domain/units";
import {
  allocateExtraChargesAndComputeUnitCosts,
  calculateNewCosts,
  recomputeCostsFromLedger,
  LedgerEvent,
} from "@/server/domain/costing";
import {
  calculatePriceMetrics,
  calculatePriceFromMarkup,
  generatePriceSuggestions,
  validateSellingPrice,
  isPriceReviewNeeded,
} from "@/server/domain/pricing";
import {
  canTransitionOrder,
  assertLegalTransition,
  validateItemQuantity,
  calculateOrderTotals,
  OrderStatus,
} from "@/server/domain/orders";

describe("Domain: Money & Rounding", () => {
  it("rounds correctly with ROUND_HALF_UP under NONE (2 decimal places)", () => {
    expect(roundPrice("10.124", "NONE").toFixed(2)).toBe("10.12");
    expect(roundPrice("10.125", "NONE").toFixed(2)).toBe("10.13");
    expect(roundPrice("10.126", "NONE").toFixed(2)).toBe("10.13");
  });

  it("rounds to NEAREST_HALF correctly", () => {
    expect(roundPrice("10.10", "NEAREST_HALF").toFixed(2)).toBe("10.00");
    expect(roundPrice("10.24", "NEAREST_HALF").toFixed(2)).toBe("10.00");
    expect(roundPrice("10.25", "NEAREST_HALF").toFixed(2)).toBe("10.50");
    expect(roundPrice("10.60", "NEAREST_HALF").toFixed(2)).toBe("10.50");
    expect(roundPrice("10.74", "NEAREST_HALF").toFixed(2)).toBe("10.50");
    expect(roundPrice("10.75", "NEAREST_HALF").toFixed(2)).toBe("11.00");
  });

  it("rounds to NEAREST_1 correctly", () => {
    expect(roundPrice("10.49", "NEAREST_1").toFixed(2)).toBe("10.00");
    expect(roundPrice("10.50", "NEAREST_1").toFixed(2)).toBe("11.00");
    expect(roundPrice("10.99", "NEAREST_1").toFixed(2)).toBe("11.00");
  });

  it("rounds UP_1 correctly (ceil to whole rupee)", () => {
    expect(roundPrice("10.00", "UP_1").toFixed(2)).toBe("10.00");
    expect(roundPrice("10.01", "UP_1").toFixed(2)).toBe("11.00");
    expect(roundPrice("10.50", "UP_1").toFixed(2)).toBe("11.00");
    expect(roundPrice("10.99", "UP_1").toFixed(2)).toBe("11.00");
  });

  it("formats currency to Indian en-IN grouping (₹1,23,456.50)", () => {
    expect(formatINR("123456.50")).toBe("₹1,23,456.50");
    expect(formatINR("1000")).toBe("₹1,000.00");
    expect(formatINR("50")).toBe("₹50.00");
    expect(formatINR("10000000")).toBe("₹1,00,00,000.00");
    expect(formatINR(null)).toBe("₹0.00");
  });
});

describe("Domain: Units and Conversion", () => {
  const kgUnit: UnitInfo = {
    code: "kg",
    label: "Kilogram",
    symbol: "kg",
    dimension: "WEIGHT",
    factorToBase: 1,
    isBaseable: true,
  };

  const gUnit: UnitInfo = {
    code: "g",
    label: "Gram",
    symbol: "g",
    dimension: "WEIGHT",
    factorToBase: 0.001,
    isBaseable: false,
  };

  const litreUnit: UnitInfo = {
    code: "litre",
    label: "Litre",
    symbol: "L",
    dimension: "VOLUME",
    factorToBase: 1,
    isBaseable: true,
  };

  const mlUnit: UnitInfo = {
    code: "ml",
    label: "Millilitre",
    symbol: "ml",
    dimension: "VOLUME",
    factorToBase: 0.001,
    isBaseable: false,
  };

  const pieceUnit: UnitInfo = {
    code: "piece",
    label: "Piece",
    symbol: "pc",
    dimension: "COUNT",
    factorToBase: 1,
    isBaseable: true,
  };

  const dozenUnit: UnitInfo = {
    code: "dozen",
    label: "Dozen",
    symbol: "dz",
    dimension: "COUNT",
    factorToBase: 12,
    isBaseable: false,
  };

  const boxUnit: UnitInfo = {
    code: "box",
    label: "Box",
    symbol: "box",
    dimension: "PACK",
    factorToBase: null,
    isBaseable: false,
  };

  const packetUnit: UnitInfo = {
    code: "packet",
    label: "Packet",
    symbol: "pkt",
    dimension: "COUNT",
    factorToBase: 1,
    isBaseable: true,
  };

  it("converts same unit (1:1)", () => {
    const res = convertToBaseQuantity(5, kgUnit, kgUnit);
    expect(res.baseQty.toString()).toBe("5");
  });

  it("converts grams to kg (500 g -> 0.5 kg)", () => {
    const res = convertToBaseQuantity(500, gUnit, kgUnit);
    expect(res.baseQty.toString()).toBe("0.5");
  });

  it("converts ml to litre (250 ml -> 0.25 L)", () => {
    const res = convertToBaseQuantity(250, mlUnit, litreUnit);
    expect(res.baseQty.toString()).toBe("0.25");
  });

  it("converts dozen to pieces (2 dozen -> 24 pieces)", () => {
    const res = convertToBaseQuantity(2, dozenUnit, pieceUnit);
    expect(res.baseQty.toString()).toBe("24");
  });

  it("converts PACK units (2 boxes × 24 packets -> 48 packets)", () => {
    const res = convertToBaseQuantity(2, boxUnit, packetUnit, 24);
    expect(res.baseQty.toString()).toBe("48");
  });

  it("rejects PACK units without pack size", () => {
    expect(() => convertToBaseQuantity(2, boxUnit, packetUnit, null)).toThrowError(
      /Please specify how many/
    );
  });

  it("rejects cross-dimension conversion (litre to kg)", () => {
    expect(() => convertToBaseQuantity(5, litreUnit, kgUnit)).toThrowError(
      /Cannot convert Litre \(volume\) to Kilogram \(weight\)/
    );
  });

  it("formats quantities with friendly unit transitions", () => {
    expect(formatQuantity(0.5, "kg", "kg")).toBe("500 g");
    expect(formatQuantity(1.5, "kg", "kg")).toBe("1.5 kg");
    expect(formatQuantity(0.25, "litre", "L")).toBe("250 ml");
    expect(formatQuantity(2, "litre", "L")).toBe("2 L");
    expect(formatQuantity(10, "piece", "pc")).toBe("10 pc");
  });
});

describe("Domain: Unit Cost & Extra Charges Allocation", () => {
  it("allocates extra charges proportionally by lineAmount and computes unit cost", () => {
    // 2 lines: line 1 = ₹1000 (qty 10), line 2 = ₹3000 (qty 30)
    // Extra charges = ₹400
    // Total line amount = ₹4000
    // line 1 share = 400 * 1000 / 4000 = ₹100
    // line 1 unitCost = (1000 + 100) / 10 = ₹110
    // line 2 share = 400 * 3000 / 4000 = ₹300
    // line 2 unitCost = (3000 + 300) / 30 = ₹110
    const lines = [
      { lineAmount: 1000, baseQty: 10 },
      { lineAmount: 3000, baseQty: 30 },
    ];
    const result = allocateExtraChargesAndComputeUnitCosts(lines, 400);

    expect(result[0].extraShare.toString()).toBe("100");
    expect(result[0].unitCost.toString()).toBe("110");
    expect(result[1].extraShare.toString()).toBe("300");
    expect(result[1].unitCost.toString()).toBe("110");
  });

  it("handles Section 9.2 box example: 2 boxes × 24 packets for ₹2,880 -> baseQty 48, unitCost ₹60 / packet", () => {
    const lines = [{ lineAmount: 2880, baseQty: 48 }];
    const result = allocateExtraChargesAndComputeUnitCosts(lines, 0);

    expect(result[0].extraShare.toString()).toBe("0");
    expect(result[0].unitCost.toString()).toBe("60");
  });
});

describe("Domain: Costing & Moving Average", () => {
  it("calculates moving weighted average: 20 L @ ₹120 then 30 L @ ₹125 with nothing sold gives ₹123", () => {
    // Purchase 1: 20 L @ ₹120, initial stock = 0
    const p1 = calculateNewCosts(null, 0, 20, 120);
    expect(p1.avgCost.toString()).toBe("120");
    expect(p1.lastCost.toString()).toBe("120");

    // Purchase 2: 30 L @ ₹125, stock before = 20 L
    const p2 = calculateNewCosts(p1.avgCost, 20, 30, 125);
    // (20 * 120 + 30 * 125) / 50 = (2400 + 3750) / 50 = 6150 / 50 = 123
    expect(p2.avgCost.toString()).toBe("123");
    expect(p2.lastCost.toString()).toBe("125");
  });

  it("sale in between leaves the average cost unchanged", () => {
    // Initial: 20 L @ ₹120
    const p1 = calculateNewCosts(null, 0, 20, 120);

    // Sale of 10 L happens. Stock becomes 10 L. Average cost stays 120.
    // Next purchase: 30 L @ ₹125 with stock = 10 L
    const p2 = calculateNewCosts(p1.avgCost, 10, 30, 125);
    // (10 * 120 + 30 * 125) / 40 = (1200 + 3750) / 40 = 4950 / 40 = 123.75
    expect(p2.avgCost.toString()).toBe("123.75");
    expect(p2.lastCost.toString()).toBe("125");
  });

  it("recomputes costs from ledger accurately, ignoring voided purchases", () => {
    const ledger: LedgerEvent[] = [
      { type: "PURCHASE", baseQty: 20, unitCost: 120 },
      { type: "SALE", baseQty: -5 },
      { type: "PURCHASE", baseQty: 30, unitCost: 125 },
      { type: "PURCHASE", baseQty: 10, unitCost: 150, isVoided: true }, // Voided!
    ];

    const result = recomputeCostsFromLedger(ledger);
    // Effective: 20 @ 120 -> sell 5 (stock 15) -> 30 @ 125
    // (15 * 120 + 30 * 125) / 45 = (1800 + 3750) / 45 = 5550 / 45 = 123.3333
    expect(result.avgCost?.toFixed(4)).toBe("123.3333");
    expect(result.lastCost?.toString()).toBe("125");
    expect(result.finalStock.toString()).toBe("45");
  });
});

describe("Domain: Pricing Engine", () => {
  it("computes markup and margin correctly: 20% markup is 16.67% margin", () => {
    // cost = 100, price = 120
    // markup = (120 - 100) / 100 = 20%
    // margin = (120 - 100) / 120 = 20 / 120 = 16.67%
    const metrics = calculatePriceMetrics(120, 100);
    expect(metrics.profitPerUnit.toString()).toBe("20");
    expect(metrics.markupPercent.toString()).toBe("20");
    expect(metrics.marginPercent.toString()).toBe("16.67");
    expect(metrics.isBelowCost).toBe(false);
  });

  it("calculates price from markup: ₹100 @ 12% = ₹112", () => {
    const price = calculatePriceFromMarkup(100, 12, "NONE");
    expect(price.toFixed(2)).toBe("112.00");
  });

  it("generates Low, Recommended, High suggestions from category markups", () => {
    const markups = {
      lowMarkup: 5,
      recommendedMarkup: 10,
      highMarkup: 15,
    };

    const suggestions = generatePriceSuggestions(100, markups, "UP_1");
    expect(suggestions.low.price.toFixed(2)).toBe("105.00");
    expect(suggestions.recommended.price.toFixed(2)).toBe("110.00");
    expect(suggestions.high.price.toFixed(2)).toBe("115.00");
  });

  it("enforces MRP guard (Section 5.5): sellingPrice > MRP is blocked", () => {
    const validation = validateSellingPrice(150, 100, 140);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toMatch(/cannot be higher than Maximum Retail Price MRP/);
  });

  it("warns when selling price is below cost", () => {
    const validation = validateSellingPrice(80, 100, 120);
    expect(validation.isValid).toBe(true);
    expect(validation.warning).toMatch(/lower than what you paid/);
  });

  it("flags price review needed when cost changes", () => {
    expect(isPriceReviewNeeded(100, 100)).toBe(false);
    expect(isPriceReviewNeeded(105, 100)).toBe(true);
    expect(isPriceReviewNeeded(100, null)).toBe(true);
  });
});

describe("Domain: Order State Machine & Validation", () => {
  it("allows legal transitions", () => {
    expect(canTransitionOrder("PLACED", "ACCEPTED")).toBe(true);
    expect(canTransitionOrder("PLACED", "REJECTED")).toBe(true);
    expect(canTransitionOrder("PLACED", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("ACCEPTED", "PROCESSING")).toBe(true);
    expect(canTransitionOrder("PROCESSING", "READY")).toBe(true);
    expect(canTransitionOrder("READY", "COMPLETED")).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(canTransitionOrder("PLACED", "READY")).toBe(false);
    expect(canTransitionOrder("PLACED", "COMPLETED")).toBe(false);
    expect(canTransitionOrder("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransitionOrder("REJECTED", "ACCEPTED")).toBe(false);
    expect(() => assertLegalTransition("COMPLETED", "PROCESSING")).toThrowError(
      /Cannot change order status from COMPLETED to PROCESSING/
    );
  });

  it("validates quantity step (e.g. 0.25 sellStep for loose goods)", () => {
    expect(validateItemQuantity(0.5, 0.25, 0.25, 10).isValid).toBe(true);
    expect(validateItemQuantity(0.75, 0.25, 0.25, 10).isValid).toBe(true);
    expect(validateItemQuantity(0.3, 0.25, 0.25, 10).isValid).toBe(false);
    expect(validateItemQuantity(0.1, 0.25, 0.25, 10).isValid).toBe(false); // below minQty
    expect(validateItemQuantity(12, 0.25, 0.25, 10).isValid).toBe(false); // above maxQty
  });

  it("recomputes order totals on the server and applies free delivery threshold", () => {
    const items = [
      { quantity: 2, unitPrice: 50 }, // 100
      { quantity: 0.5, unitPrice: 200 }, // 100
    ];

    // Subtotal 200, delivery fee 30, free delivery above 300 -> fee applies
    const o1 = calculateOrderTotals(items, "DELIVERY", 30, 300);
    expect(o1.subtotal.toString()).toBe("200");
    expect(o1.deliveryFee.toString()).toBe("30");
    expect(o1.total.toString()).toBe("230");

    // Subtotal 200, free delivery above 150 -> free delivery!
    const o2 = calculateOrderTotals(items, "DELIVERY", 30, 150);
    expect(o2.subtotal.toString()).toBe("200");
    expect(o2.deliveryFee.toString()).toBe("0");
    expect(o2.total.toString()).toBe("200");

    // PICKUP fulfilment -> no delivery fee
    const o3 = calculateOrderTotals(items, "PICKUP", 30, 500);
    expect(o3.deliveryFee.toString()).toBe("0");
    expect(o3.total.toString()).toBe("200");
  });
});
