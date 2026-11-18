import { describe, it, expect } from "vitest";
import { priceFromSlider } from "@/server/domain/pricing";

describe("Domain: priceFromSlider", () => {
  it("case 1: bought 18, MRP 20 -> default 20, earns ₹2, 11%", () => {
    const result = priceFromSlider({
      cost: 18,
      mrp: 20,
    });

    expect(result.price).toBe(20);
    expect(result.cost).toBe(18);
    expect(result.mrp).toBe(20);
    expect(result.profitPerUnit).toBe(2);
    expect(result.markupPercent).toBe(11); // 2 / 18 * 100 = 11.11% -> 11%
    expect(result.isDisabled).toBe(false);
    expect(result.maxSlider).toBe(20);
  });

  it("case 2: no MRP, cost 100 at 12% -> 112", () => {
    const result = priceFromSlider({
      cost: 100,
      recommendedMarkupPercent: 12,
    });

    expect(result.price).toBe(112);
    expect(result.cost).toBe(100);
    expect(result.mrp).toBeNull();
    expect(result.profitPerUnit).toBe(12);
    expect(result.markupPercent).toBe(12);
    expect(result.isDisabled).toBe(false);
    expect(result.maxSlider).toBeGreaterThanOrEqual(112);
  });

  it("case 3: MRP below cost -> slider disabled", () => {
    const result = priceFromSlider({
      cost: 50,
      mrp: 45,
    });

    expect(result.isDisabled).toBe(true);
    expect(result.disabledReason).toBeDefined();
    expect(result.disabledReason).toContain("MRP is below");
  });

  it("case 4: rounding never above MRP", () => {
    // cost 95, 10% markup would be 104.5, rounding up to 105, but MRP is 104
    const result = priceFromSlider({
      cost: 95,
      mrp: 104,
      recommendedMarkupPercent: 10,
    });

    expect(result.price).toBeLessThanOrEqual(104);
    expect(result.price).toBe(104);
  });

  it("case 5: slider min/max logic", () => {
    // When cost is 100, MRP is 150
    const result = priceFromSlider({
      cost: 100,
      mrp: 150,
    });

    expect(result.minSlider).toBeLessThan(100); // allows below-cost adjustment with warning
    expect(result.maxSlider).toBe(150); // capped at MRP

    // When choosing a price below cost
    const belowCost = priceFromSlider({
      cost: 100,
      mrp: 150,
      chosenPrice: 90,
    });
    expect(belowCost.isBelowCost).toBe(true);
    expect(belowCost.profitPerUnit).toBe(-10);
  });
});

