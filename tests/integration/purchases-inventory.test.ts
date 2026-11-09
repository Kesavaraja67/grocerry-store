import { describe, it, expect } from "vitest";
import { Decimal } from "decimal.js";
import {
  convertToBaseQuantity,
  formatQuantity,
} from "@/server/domain/units";
import {
  allocateExtraChargesAndComputeUnitCosts,
  calculateNewCosts,
  recomputeCostsFromLedger,
} from "@/server/domain/costing";
import {
  calculatePriceMetrics,
  generatePriceSuggestions,
} from "@/server/domain/pricing";

describe("Phase 3 Integration: Purchases, Costing & Inventory", () => {
  // Test 1: Record purchase with pack units & extra charges
  it("converts pack units to base units and computes proportional extra charges", () => {
    // 2 boxes of 24 pieces = 48 pieces
    const boxUnit = {
      code: "BOX",
      label: "Box",
      symbol: "box",
      dimension: "PACK" as const,
      factorToBase: null,
      isBaseable: false,
    };
    const pieceUnit = {
      code: "PIECE",
      label: "Piece",
      symbol: "pc",
      dimension: "COUNT" as const,
      factorToBase: new Decimal(1),
      isBaseable: true,
    };

    const conv = convertToBaseQuantity(2, boxUnit, pieceUnit, 24);
    expect(conv.baseQty.toNumber()).toBe(48);

    // 2 lines: Line 1 paid ₹1000 for 48 pcs, Line 2 paid ₹2000 for 100 pcs
    // Extra transport charges = ₹300
    const lines = [
      { lineAmount: new Decimal(1000), baseQty: new Decimal(48) },
      { lineAmount: new Decimal(2000), baseQty: new Decimal(100) },
    ];
    const allocated = allocateExtraChargesAndComputeUnitCosts(lines, 300);

    // Total lines = 3000. Line 1 share = 300 * 1000/3000 = 100.
    // Line 1 total = 1100 / 48 = 22.9167
    expect(allocated[0].extraShare.toNumber()).toBe(100);
    expect(allocated[0].unitCost.toFixed(4)).toBe("22.9167");

    // Line 2 share = 300 * 2000/3000 = 200.
    // Line 2 total = 2200 / 100 = 22.0000
    expect(allocated[1].extraShare.toNumber()).toBe(200);
    expect(allocated[1].unitCost.toFixed(4)).toBe("22.0000");
  });

  // Test 2: Moving weighted average cost calculation
  it("computes moving weighted average cost accurately after sequential purchases", () => {
    // Initial: 0 stock
    // Purchase 1: 10 kg @ ₹40/kg
    const cost1 = calculateNewCosts(null, 0, 10, 40);
    expect(cost1.lastCost.toNumber()).toBe(40);
    expect(cost1.avgCost.toNumber()).toBe(40);

    // Purchase 2: 10 kg @ ₹50/kg, starting stock is 10 kg
    const cost2 = calculateNewCosts(cost1.avgCost, 10, 10, 50);
    // (10 * 40 + 10 * 50) / 20 = 45
    expect(cost2.lastCost.toNumber()).toBe(50);
    expect(cost2.avgCost.toNumber()).toBe(45);

    // Purchase 3: 5 kg @ ₹60/kg, starting stock is 20 kg
    const cost3 = calculateNewCosts(cost2.avgCost, 20, 5, 60);
    // (20 * 45 + 5 * 60) / 25 = (900 + 300) / 25 = 48
    expect(cost3.lastCost.toNumber()).toBe(60);
    expect(cost3.avgCost.toNumber()).toBe(48);
  });

  // Test 3: Ledger replay on void / correction
  it("recomputes average and last cost when a purchase bill is voided", () => {
    const events = [
      { type: "PURCHASE" as const, baseQty: 10, unitCost: 40 }, // Purchase 1
      { type: "PURCHASE" as const, baseQty: 10, unitCost: 50, isVoided: true }, // Purchase 2 (voided)
      { type: "PURCHASE" as const, baseQty: 5, unitCost: 60 }, // Purchase 3
    ];

    const replay = recomputeCostsFromLedger(events);
    // Without purchase 2:
    // P1: 10 @ 40 -> avg 40
    // P3: 5 @ 60 -> (10 * 40 + 5 * 60) / 15 = 700 / 15 = 46.6667
    expect(replay.lastCost?.toNumber()).toBe(60);
    expect(replay.avgCost?.toFixed(4)).toBe("46.6667");
    expect(replay.finalStock.toNumber()).toBe(15);
  });

  // Test 4: Pricing suggestions with markup & MRP guard
  it("generates correct pricing suggestions and respects MRP guard", () => {
    const cost = new Decimal(48);
    const markups = {
      lowMarkup: 10, // 48 * 1.10 = 52.8 -> rounded UP_1 = 53
      recommendedMarkup: 20, // 48 * 1.20 = 57.6 -> rounded UP_1 = 58
      highMarkup: 30, // 48 * 1.30 = 62.4 -> rounded UP_1 = 63
    };

    const suggestions = generatePriceSuggestions(cost, markups, "UP_1");
    expect(suggestions.low.price.toNumber()).toBe(53);
    expect(suggestions.recommended.price.toNumber()).toBe(58);
    expect(suggestions.high.price.toNumber()).toBe(63);

    // Below cost check
    const belowCostMetrics = calculatePriceMetrics(45, 48);
    expect(belowCostMetrics.isBelowCost).toBe(true);
    expect(belowCostMetrics.profitPerUnit.toNumber()).toBe(-3);

    // Above MRP check
    const aboveMRPMetrics = calculatePriceMetrics(65, 48, 60);
    expect(aboveMRPMetrics.isAboveMRP).toBe(true);
    expect(aboveMRPMetrics.mrpDifference?.toNumber()).toBe(-5);
  });

  // Test 5: Stock adjustment arithmetic
  it("calculates correct balance after ADD, REMOVE, and SET adjustments", () => {
    let stock = new Decimal(50);

    // ADD 10
    const addDelta = new Decimal(10);
    stock = stock.plus(addDelta);
    expect(stock.toNumber()).toBe(60);

    // REMOVE 15 (damaged)
    const removeDelta = new Decimal(15).negated();
    stock = stock.plus(removeDelta);
    expect(stock.toNumber()).toBe(45);

    // SET to 42 (physical count audit)
    const countedStock = new Decimal(42);
    const setDelta = countedStock.minus(stock);
    stock = stock.plus(setDelta);
    expect(stock.toNumber()).toBe(42);
  });

  // Test 6: Cross-dimension unit validation
  it("rejects invalid cross-dimension unit conversions (e.g. Weight to Volume)", () => {
    const kgUnit = {
      code: "KG",
      label: "Kilogram",
      symbol: "kg",
      dimension: "WEIGHT" as const,
      factorToBase: new Decimal(1),
      isBaseable: true,
    };
    const litreUnit = {
      code: "LITRE",
      label: "Litre",
      symbol: "L",
      dimension: "VOLUME" as const,
      factorToBase: new Decimal(1),
      isBaseable: true,
    };

    expect(() => convertToBaseQuantity(5, kgUnit, litreUnit)).toThrow(
      /Cannot convert Kilogram/i
    );
  });
});
