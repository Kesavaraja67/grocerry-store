import { Decimal } from "decimal.js";
import { RoundingMode, roundPrice } from "./money";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type CostBasis = "LATEST" | "AVERAGE";

export interface CategoryMarkups {
  lowMarkup: Decimal | number | string;
  recommendedMarkup: Decimal | number | string;
  highMarkup: Decimal | number | string;
}

export interface PriceSuggestion {
  markupPercent: Decimal;
  price: Decimal;
  profitPerUnit: Decimal;
  marginPercent: Decimal;
}

export interface SuggestedPrices {
  low: PriceSuggestion;
  recommended: PriceSuggestion;
  high: PriceSuggestion;
  costUsed: Decimal;
  explanation: string;
}

export interface PriceMetrics {
  sellingPrice: Decimal;
  cost: Decimal;
  profitPerUnit: Decimal;
  markupPercent: Decimal; // (price - cost) / cost * 100
  marginPercent: Decimal; // (price - cost) / price * 100
  isBelowCost: boolean;
  isAboveMRP: boolean;
  mrpDifference?: Decimal; // if MRP is set: mrp - price
}

/**
 * Calculates profit, markup %, and margin % from price and cost.
 * Displays both clearly per Section 9.4:
 * markup% = (price - cost) / cost
 * margin% = (price - cost) / price
 */
export function calculatePriceMetrics(
  sellingPrice: Decimal | number | string,
  cost: Decimal | number | string,
  mrp?: Decimal | number | string | null
): PriceMetrics {
  const price = new Decimal(sellingPrice);
  const costDec = new Decimal(cost);

  const profitPerUnit = price.minus(costDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  let markupPercent = new Decimal(0);
  if (costDec.gt(0)) {
    markupPercent = profitPerUnit.dividedBy(costDec).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  let marginPercent = new Decimal(0);
  if (price.gt(0)) {
    marginPercent = profitPerUnit.dividedBy(price).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  const isBelowCost = price.lt(costDec);

  let isAboveMRP = false;
  let mrpDifference: Decimal | undefined;

  if (mrp !== null && mrp !== undefined) {
    const mrpDec = new Decimal(mrp);
    if (mrpDec.gt(0)) {
      isAboveMRP = price.gt(mrpDec);
      mrpDifference = mrpDec.minus(price).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }
  }

  return {
    sellingPrice: price.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    cost: costDec.toDecimalPlaces(4, Decimal.ROUND_HALF_UP),
    profitPerUnit,
    markupPercent,
    marginPercent,
    isBelowCost,
    isAboveMRP,
    mrpDifference,
  };
}

/**
 * Back-calculates selling price from cost and markup percentage, applying rounding rules.
 */
export function calculatePriceFromMarkup(
  cost: Decimal | number | string,
  markupPercent: Decimal | number | string,
  roundingMode: RoundingMode = "UP_1"
): Decimal {
  const c = new Decimal(cost);
  const m = new Decimal(markupPercent);
  const multiplier = new Decimal(1).plus(m.dividedBy(100));
  const rawPrice = c.times(multiplier);
  return roundPrice(rawPrice, roundingMode);
}

/**
 * Generates Low, Recommended, and High price suggestions based on category defaults.
 * Section 9.4:
 * Seed defaults are starting points only, labelled "starting points from your category settings".
 */
export function generatePriceSuggestions(
  cost: Decimal | number | string,
  markups: CategoryMarkups,
  roundingMode: RoundingMode = "UP_1"
): SuggestedPrices {
  const costDec = new Decimal(cost);

  const createSuggestion = (markup: Decimal | number | string): PriceSuggestion => {
    const markupDec = new Decimal(markup);
    const price = calculatePriceFromMarkup(costDec, markupDec, roundingMode);
    const metrics = calculatePriceMetrics(price, costDec);
    return {
      markupPercent: markupDec,
      price,
      profitPerUnit: metrics.profitPerUnit,
      marginPercent: metrics.marginPercent,
    };
  };

  return {
    low: createSuggestion(markups.lowMarkup),
    recommended: createSuggestion(markups.recommendedMarkup),
    high: createSuggestion(markups.highMarkup),
    costUsed: costDec.toDecimalPlaces(4, Decimal.ROUND_HALF_UP),
    explanation: "Starting points from your category settings (not market prices)",
  };
}

/**
 * Validates selling price against MRP guard (Section 5.5 and 9.4).
 * Enforces: sellingPrice may never exceed a product's MRP.
 */
export function validateSellingPrice(
  sellingPrice: Decimal | number | string,
  cost: Decimal | number | string | null | undefined,
  mrp?: Decimal | number | string | null
): {
  isValid: boolean;
  error?: string;
  warning?: string;
} {
  const price = new Decimal(sellingPrice);

  if (price.lte(0)) {
    return { isValid: false, error: "Selling price must be greater than zero." };
  }

  if (mrp !== null && mrp !== undefined) {
    const mrpDec = new Decimal(mrp);
    if (mrpDec.gt(0) && price.gt(mrpDec)) {
      return {
        isValid: false,
        error: `Selling price (₹${price.toFixed(2)}) cannot be higher than Maximum Retail Price MRP (₹${mrpDec.toFixed(2)}).`,
      };
    }
  }

  if (cost !== null && cost !== undefined) {
    const costDec = new Decimal(cost);
    if (price.lt(costDec)) {
      return {
        isValid: true,
        warning: `Selling price (₹${price.toFixed(2)}) is lower than what you paid (₹${costDec.toFixed(2)}). You will make a loss on this item.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Checks if a product's price needs review.
 * Section 9.4: Flagged when costForPricing !== pricedAtCost.
 */
export function isPriceReviewNeeded(
  currentCost: Decimal | number | string | null | undefined,
  pricedAtCost: Decimal | number | string | null | undefined
): boolean {
  if (currentCost === null || currentCost === undefined) {
    return false;
  }
  if (pricedAtCost === null || pricedAtCost === undefined) {
    return true; // Has cost but was never priced at this cost
  }

  const c1 = new Decimal(currentCost).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  const c2 = new Decimal(pricedAtCost).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);

  return !c1.eq(c2);
}

export interface SliderPriceResult {
  price: number;
  cost: number;
  mrp: number | null;
  profitPerUnit: number;
  markupPercent: number;
  marginPercent: number;
  minSlider: number;
  maxSlider: number;
  isBelowCost: boolean;
  isAboveMRP: boolean;
  isDisabled: boolean;
  disabledReason?: string;
  summaryText: string;
}

/**
 * Pure function that calculates selling price, margins, and slider bounds for the Price Slider.
 * Adheres to:
 * - Default to MRP when MRP is set
 * - Default to markup calculation when no MRP
 * - MRP below cost disables the slider
 * - Rounding never exceeds MRP
 * - Min slider allows below-cost adjustment with warning
 * - Max slider capped at MRP
 */
export function priceFromSlider(params: {
  cost: Decimal | number | string;
  mrp?: Decimal | number | string | null;
  currentPrice?: Decimal | number | string | null;
  chosenPrice?: Decimal | number | string | null;
  recommendedMarkupPercent?: Decimal | number | string | null;
  roundingMode?: RoundingMode;
}): SliderPriceResult {
  const c = new Decimal(params.cost || 0).toNumber();
  const m =
    params.mrp !== null && params.mrp !== undefined && Number(params.mrp) > 0
      ? Number(params.mrp)
      : null;

  // Guard: MRP below cost -> disabled
  if (m !== null && m < c) {
    return {
      price: m,
      cost: c,
      mrp: m,
      profitPerUnit: Math.round((m - c) * 100) / 100,
      markupPercent: c > 0 ? Math.round(((m - c) / c) * 100) : 0,
      marginPercent: m > 0 ? Math.round(((m - c) / m) * 100) : 0,
      minSlider: m,
      maxSlider: m,
      isBelowCost: true,
      isAboveMRP: false,
      isDisabled: true,
      disabledReason: "MRP is below cost. Selling at or below MRP would result in a loss.",
      summaryText: "MRP is below cost",
    };
  }

  // Determine active price
  let price: number;
  if (params.chosenPrice !== null && params.chosenPrice !== undefined) {
    price = Number(params.chosenPrice);
  } else if (
    params.currentPrice !== null &&
    params.currentPrice !== undefined &&
    Number(params.currentPrice) > 0
  ) {
    price = Number(params.currentPrice);
    if (m !== null && price > m) {
      price = m;
    }
  } else {
    // If MRP exists, default to MRP
    if (m !== null) {
      price = m;
    } else {
      // Calculate from markup
      const markup = Number(params.recommendedMarkupPercent || 10);
      const rounded = calculatePriceFromMarkup(c, markup, params.roundingMode || "UP_1");
      price = rounded.toNumber();
      if (m !== null && price > m) {
        price = m;
      }
    }
  }

  // Rounding never above MRP
  if (m !== null && price > m) {
    price = m;
  }

  // Slider bounds: min allows slight discount below cost with warning, max capped at MRP
  const minSlider = Math.max(1, Math.floor(c * 0.8));
  const maxSlider = m !== null ? m : Math.max(Math.ceil(c * 1.5), Math.ceil(price * 1.2), 50);

  const profitPerUnit = Math.round((price - c) * 100) / 100;
  const markupPercent = c > 0 ? Math.round(((price - c) / c) * 100) : 0;
  const marginPercent = price > 0 ? Math.round(((price - c) / price) * 100) : 0;

  const isBelowCost = price < c;
  const isAboveMRP = m !== null && price > m;

  const summaryText = isBelowCost
    ? `Loss of ₹${Math.abs(profitPerUnit)} per unit`
    : `Earns ₹${profitPerUnit} (${markupPercent}%)`;

  return {
    price,
    cost: c,
    mrp: m,
    profitPerUnit,
    markupPercent,
    marginPercent,
    minSlider,
    maxSlider,
    isBelowCost,
    isAboveMRP,
    isDisabled: false,
    summaryText,
  };
}

