import { Decimal } from "decimal.js";

// Configure Decimal for financial calculations: 20 digits precision, ROUND_HALF_UP (4 in decimal.js)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type RoundingMode = "NONE" | "NEAREST_HALF" | "NEAREST_1" | "UP_1";

/**
 * Rounds a Decimal according to the specified ShopSettings RoundingMode.
 * ROUND_HALF_UP is used for all intermediate calculations.
 */
export function roundPrice(amount: Decimal | number | string, mode: RoundingMode = "UP_1"): Decimal {
  const d = new Decimal(amount);

  switch (mode) {
    case "NONE":
      // Standard 2 decimal places round half up
      return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    case "NEAREST_HALF": {
      // Multiply by 2, round to integer, divide by 2
      // e.g., 10.20 -> 20.4 -> 20 -> 10.00
      // 10.25 -> 20.5 -> 21 -> 10.50
      // 10.74 -> 21.48 -> 21 -> 10.50
      // 10.76 -> 21.52 -> 22 -> 11.00
      const doubled = d.times(2);
      const roundedInt = doubled.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
      return roundedInt.dividedBy(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }

    case "NEAREST_1":
      // Round to nearest integer (half up)
      return d.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

    case "UP_1":
      // Always round up to next whole integer if there are any decimal fractions
      return d.ceil().toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    default:
      return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
}

/**
 * Formats a number or Decimal according to Indian number grouping (en-IN).
 * e.g., 123456.50 -> ₹1,23,456.50
 */
export function formatINR(amount: Decimal | number | string | null | undefined, includeSymbol: boolean = true): string {
  if (amount === null || amount === undefined) {
    return includeSymbol ? "₹0.00" : "0.00";
  }

  const d = new Decimal(amount);
  const isNegative = d.isNegative();
  const abs = d.abs();

  // Split integer and decimal parts
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split(".");

  // Indian number formatting: last 3 digits, then pairs of 2 digits
  let result = "";
  if (intPart.length <= 3) {
    result = intPart;
  } else {
    const lastThree = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const withCommas = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    result = `${withCommas},${lastThree}`;
  }

  const formatted = `${isNegative ? "-" : ""}${result}.${decPart}`;
  return includeSymbol ? `₹${formatted}` : formatted;
}

