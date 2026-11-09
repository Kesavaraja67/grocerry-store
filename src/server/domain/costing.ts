import { Decimal } from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface PurchaseLineInput {
  lineAmount: Decimal | number | string;
  baseQty: Decimal | number | string;
}

export interface AllocatedLineCost {
  extraShare: Decimal;
  unitCost: Decimal;
}

/**
 * Allocates extra charges (transport, loading) across purchase lines proportionally by lineAmount.
 * extraShare = extraCharges × lineAmount / Σ lineAmount
 * unitCost = (lineAmount + extraShare) / baseQty (kept to 4 decimals)
 */
export function allocateExtraChargesAndComputeUnitCosts(
  lines: PurchaseLineInput[],
  extraCharges: Decimal | number | string = 0
): AllocatedLineCost[] {
  const extra = new Decimal(extraCharges);
  const totalLineAmount = lines.reduce(
    (sum, line) => sum.plus(new Decimal(line.lineAmount)),
    new Decimal(0)
  );

  return lines.map((line) => {
    const lineAmt = new Decimal(line.lineAmount);
    const baseQty = new Decimal(line.baseQty);

    if (baseQty.lte(0)) {
      throw new Error("Base quantity must be greater than zero for cost computation.");
    }

    let extraShare = new Decimal(0);
    if (extra.gt(0) && totalLineAmount.gt(0)) {
      // Allocate proportionally
      extraShare = extra.times(lineAmt).dividedBy(totalLineAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }

    const totalCostForLine = lineAmt.plus(extraShare);
    // unitCost kept to 4 decimals
    const unitCost = totalCostForLine.dividedBy(baseQty).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);

    return {
      extraShare,
      unitCost,
    };
  });
}

export interface CostUpdateResult {
  lastCost: Decimal;
  avgCost: Decimal;
}

/**
 * Updates moving weighted average cost and last cost after a new purchase.
 * Section 9.3:
 * stockBefore' = max(stockBefore, 0)
 * if stockBefore' === 0: avg = unitCost
 * else: avg = (stockBefore' × avg + baseQty × unitCost) / (stockBefore' + baseQty)
 */
export function calculateNewCosts(
  currentAvgCost: Decimal | number | string | null | undefined,
  stockBefore: Decimal | number | string,
  newBaseQty: Decimal | number | string,
  newUnitCost: Decimal | number | string
): CostUpdateResult {
  const stock = Decimal.max(new Decimal(stockBefore), 0);
  const qty = new Decimal(newBaseQty);
  const unitCost = new Decimal(newUnitCost);

  if (qty.lte(0)) {
    throw new Error("Purchased base quantity must be greater than zero.");
  }

  let avgCost: Decimal;

  if (stock.eq(0) || currentAvgCost === null || currentAvgCost === undefined) {
    avgCost = unitCost.toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  } else {
    const prevAvg = new Decimal(currentAvgCost);
    const totalPreviousValue = stock.times(prevAvg);
    const newAdditionValue = qty.times(unitCost);
    const totalNewStock = stock.plus(qty);

    avgCost = totalPreviousValue
      .plus(newAdditionValue)
      .dividedBy(totalNewStock)
      .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  }

  return {
    lastCost: unitCost.toDecimalPlaces(4, Decimal.ROUND_HALF_UP),
    avgCost,
  };
}

export interface LedgerEvent {
  type: "PURCHASE" | "SALE" | "ADJUSTMENT";
  baseQty: Decimal | number | string; // positive for purchase/restored, negative for sale/reduction
  unitCost?: Decimal | number | string | null; // only present on PURCHASE
  isVoided?: boolean;
}

/**
 * Replays ledger events in chronological order to recompute avgCost and lastCost.
 * Used after purchase void or correction per Section 9.3.
 */
export function recomputeCostsFromLedger(events: LedgerEvent[]): {
  lastCost: Decimal | null;
  avgCost: Decimal | null;
  finalStock: Decimal;
} {
  let stock = new Decimal(0);
  let avgCost: Decimal | null = null;
  let lastCost: Decimal | null = null;

  for (const event of events) {
    if (event.isVoided) {
      continue;
    }

    const qty = new Decimal(event.baseQty);

    if (event.type === "PURCHASE") {
      if (event.unitCost === undefined || event.unitCost === null) {
        throw new Error("Purchase event requires unitCost for cost replay.");
      }
      const uCost = new Decimal(event.unitCost);
      const res = calculateNewCosts(avgCost, stock, qty, uCost);
      avgCost = res.avgCost;
      lastCost = res.lastCost;
      stock = stock.plus(qty);
    } else {
      // SALE or ADJUSTMENT: alters stock quantity, does NOT alter avgCost
      stock = Decimal.max(stock.plus(qty), 0);
    }
  }

  return {
    lastCost,
    avgCost,
    finalStock: stock.toDecimalPlaces(3, Decimal.ROUND_HALF_UP),
  };
}

