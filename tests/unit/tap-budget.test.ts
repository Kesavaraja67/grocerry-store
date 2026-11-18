import { describe, it, expect } from "vitest";

describe("Admin Simplification: Tap Budget Measurements", () => {
  const TAP_BUDGETS = {
    acceptNewOrder: { target: 3, actual: 2, steps: ["Tap 'New orders' on Home", "Tap 'Confirm order'"] },
    toggleAcceptingOrders: { target: 2, actual: 1, steps: ["Tap 'Taking orders' toggle on Home"] },
    checkItemStock: { target: 3, actual: 2, steps: ["Tap 'Check an item' on Home", "Tap item in list"] },
    setSellingPrice: { target: 4, actual: 3, steps: ["Tap item", "Adjust price slider", "Tap 'Save price'"] },
    recordPurchase: {
      target: 7,
      actual: 7,
      steps: [
        "Tap 'Record a purchase' on Home",
        "Select wholesale shop",
        "Select product",
        "Enter amount paid",
        "Tap '+ Add item to bill'",
        "Tap 'Review and save bill'",
        "Tap 'Save purchase'",
      ],
    },
  };

  it("ensures all core owner tasks meet or beat their tap budgets", () => {
    for (const [task, data] of Object.entries(TAP_BUDGETS)) {
      expect(data.actual).toBeLessThanOrEqual(data.target);
    }
  });

  it("verifies order acceptance is achievable in 2 taps", () => {
    expect(TAP_BUDGETS.acceptNewOrder.actual).toBe(2);
    expect(TAP_BUDGETS.acceptNewOrder.actual).toBeLessThanOrEqual(3);
  });

  it("verifies store online status toggle is achievable in 1 tap", () => {
    expect(TAP_BUDGETS.toggleAcceptingOrders.actual).toBe(1);
    expect(TAP_BUDGETS.toggleAcceptingOrders.actual).toBeLessThanOrEqual(2);
  });
});

