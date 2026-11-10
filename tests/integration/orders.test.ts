import { describe, it, expect } from "vitest";
import { Decimal } from "decimal.js";
import {
  canTransitionOrder,
  assertLegalTransition,
  calculateOrderTotals,
  validateItemQuantity,
  generateWhatsAppMessage,
  LEGAL_TRANSITIONS,
} from "@/server/domain/orders";

describe("Phase 6 Integration: Order State Machine & Transitions", () => {
  it("enforces legal order transitions and rejects invalid state jumps", () => {
    // Legal transitions
    expect(canTransitionOrder("PLACED", "ACCEPTED")).toBe(true);
    expect(canTransitionOrder("PLACED", "REJECTED")).toBe(true);
    expect(canTransitionOrder("PLACED", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("ACCEPTED", "PROCESSING")).toBe(true);
    expect(canTransitionOrder("ACCEPTED", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("PROCESSING", "READY")).toBe(true);
    expect(canTransitionOrder("READY", "COMPLETED")).toBe(true);

    // Illegal transitions
    expect(canTransitionOrder("PLACED", "PROCESSING")).toBe(false);
    expect(canTransitionOrder("PLACED", "READY")).toBe(false);
    expect(canTransitionOrder("PLACED", "COMPLETED")).toBe(false);
    expect(canTransitionOrder("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransitionOrder("REJECTED", "ACCEPTED")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "COMPLETED")).toBe(false);

    // assertLegalTransition throws descriptive error on invalid transition
    expect(() => assertLegalTransition("PLACED", "COMPLETED")).toThrow(
      /Cannot change order status from PLACED to COMPLETED/
    );
  });

  it("calculates order totals accurately with delivery fee thresholds", () => {
    const items = [
      { quantity: new Decimal("2"), unitPrice: new Decimal("45.50") }, // 91.00
      { quantity: new Decimal("1.5"), unitPrice: new Decimal("60.00") }, // 90.00
    ];

    // Case 1: Delivery with fee applied (< threshold)
    const resultWithFee = calculateOrderTotals(items, "DELIVERY", 30, 500);
    expect(resultWithFee.subtotal.toNumber()).toBe(181.00);
    expect(resultWithFee.deliveryFee.toNumber()).toBe(30.00);
    expect(resultWithFee.total.toNumber()).toBe(211.00);
    expect(resultWithFee.itemCount).toBe(2);

    // Case 2: Delivery with free delivery applied (>= threshold)
    const bigItems = [
      { quantity: new Decimal("10"), unitPrice: new Decimal("55.00") }, // 550.00
    ];
    const resultFree = calculateOrderTotals(bigItems, "DELIVERY", 30, 500);
    expect(resultFree.subtotal.toNumber()).toBe(550.00);
    expect(resultFree.deliveryFee.toNumber()).toBe(0.00);
    expect(resultFree.total.toNumber()).toBe(550.00);

    // Case 3: Store pickup has no delivery fee
    const resultPickup = calculateOrderTotals(items, "PICKUP", 30, 500);
    expect(resultPickup.subtotal.toNumber()).toBe(181.00);
    expect(resultPickup.deliveryFee.toNumber()).toBe(0.00);
    expect(resultPickup.total.toNumber()).toBe(181.00);
  });

  it("validates quantity step constraints and bounds", () => {
    // Valid: 0.5kg with 0.25kg step, min 0.25, max 10
    expect(validateItemQuantity("0.5", "0.25", "0.25", "10").isValid).toBe(true);

    // Invalid: 0.3kg with 0.25kg step (not a multiple)
    const stepInvalid = validateItemQuantity("0.3", "0.25", "0.25", "10");
    expect(stepInvalid.isValid).toBe(false);
    expect(stepInvalid.error).toMatch(/multiple of 0.25/);

    // Below min
    const belowMin = validateItemQuantity("0.1", "0.05", "0.5", "10");
    expect(belowMin.isValid).toBe(false);
    expect(belowMin.error).toMatch(/Minimum order quantity is 0.5/);

    // Above max
    const aboveMax = validateItemQuantity("15", "1", "1", "10");
    expect(aboveMax.isValid).toBe(false);
    expect(aboveMax.error).toMatch(/Maximum allowed quantity per order is 10/);
  });

  it("generates WhatsApp communication message for customer tracking", () => {
    const encoded = generateWhatsAppMessage(
      "PS-1001",
      "Murugan",
      "ACCEPTED",
      "250.00",
      ["Toor Dal 1kg", "Ponni Rice 2kg"]
    );

    const decoded = decodeURIComponent(encoded);
    expect(decoded).toContain("Hello Murugan!");
    expect(decoded).toContain("PS-1001");
    expect(decoded).toContain("Confirmed");
    expect(decoded).toContain("₹250.00");
    expect(decoded).toContain("Toor Dal 1kg");
    expect(decoded).toContain("Ponni Rice 2kg");
  });
});

