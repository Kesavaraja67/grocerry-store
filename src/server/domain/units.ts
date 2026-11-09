import { Decimal } from "decimal.js";

export type UnitDimension = "WEIGHT" | "VOLUME" | "COUNT" | "PACK";

export interface UnitInfo {
  code: string;
  label: string;
  symbol: string;
  dimension: UnitDimension;
  factorToBase: Decimal | number | string | null;
  isBaseable: boolean;
}

export interface UnitConversionResult {
  baseQty: Decimal;
  explanation: string;
}

/**
 * Standard unit conversion function following Section 9.1 of the specification.
 * Converts entered quantity + entered unit into product base unit quantity.
 * Throws human-readable Error if conversion is illegal.
 */
export function convertToBaseQuantity(
  quantity: Decimal | number | string,
  enteredUnit: UnitInfo,
  baseUnit: UnitInfo,
  unitsPerPack?: Decimal | number | string | null
): UnitConversionResult {
  const qty = new Decimal(quantity);

  if (qty.lte(0)) {
    throw new Error("Quantity must be greater than zero.");
  }

  // Same unit: 1 to 1
  if (enteredUnit.code === baseUnit.code) {
    return {
      baseQty: qty.toDecimalPlaces(3, Decimal.ROUND_HALF_UP),
      explanation: `${qty.toString()} ${baseUnit.symbol}`,
    };
  }

  // PACK units: box, carton, bag, can, case
  if (enteredUnit.dimension === "PACK") {
    if (!unitsPerPack || new Decimal(unitsPerPack).lte(0)) {
      throw new Error(`Please specify how many ${baseUnit.label}s are in each ${enteredUnit.label}.`);
    }
    const packFactor = new Decimal(unitsPerPack);
    const baseQty = qty.times(packFactor).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
    return {
      baseQty,
      explanation: `${qty.toString()} ${enteredUnit.symbol} × ${packFactor.toString()} ${baseUnit.symbol} = ${baseQty.toString()} ${baseUnit.symbol}`,
    };
  }

  // Cross-dimension check: PACK is handled above; other units must match dimension
  if (enteredUnit.dimension !== baseUnit.dimension) {
    throw new Error(
      `Cannot convert ${enteredUnit.label} (${enteredUnit.dimension.toLowerCase()}) to ${baseUnit.label} (${baseUnit.dimension.toLowerCase()}). They are different types of measurement.`
    );
  }

  // COUNT dimension: only base unit or dozen
  if (enteredUnit.dimension === "COUNT") {
    if (enteredUnit.code === "dozen") {
      const baseQty = qty.times(12).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
      return {
        baseQty,
        explanation: `${qty.toString()} dozen × 12 = ${baseQty.toString()} ${baseUnit.symbol}`,
      };
    }
    throw new Error(
      `For countable items in ${baseUnit.label}, you can only buy in ${baseUnit.label} or dozen.`
    );
  }

  // WEIGHT and VOLUME: factor-to-base ratio
  if (!enteredUnit.factorToBase || !baseUnit.factorToBase) {
    throw new Error(
      `Missing conversion factor between ${enteredUnit.label} and ${baseUnit.label}.`
    );
  }

  const enteredFactor = new Decimal(enteredUnit.factorToBase);
  const baseFactor = new Decimal(baseUnit.factorToBase);

  // baseQty = quantity × enteredUnit.factorToBase / baseUnit.factorToBase
  const baseQty = qty.times(enteredFactor).dividedBy(baseFactor).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);

  return {
    baseQty,
    explanation: `${qty.toString()} ${enteredUnit.symbol} = ${baseQty.toString()} ${baseUnit.symbol}`,
  };
}

/**
 * Format quantity with friendly unit label.
 * Specifically:
 * - 0.5 kg -> 500 g
 * - 0.25 litre -> 250 ml
 * - Otherwise standard up to 3 decimal places without trailing zeros
 */
export function formatQuantity(
  quantity: Decimal | number | string,
  unitCode: string,
  unitSymbol: string
): string {
  const qty = new Decimal(quantity);

  // Friendly conversion: kg -> g for fractions < 1 kg
  if (unitCode === "kg") {
    if (qty.lt(1) && qty.gt(0)) {
      const grams = qty.times(1000).toDecimalPlaces(0);
      return `${grams.toString()} g`;
    }
  }

  // Friendly conversion: litre -> ml for fractions < 1 litre
  if (unitCode === "litre") {
    if (qty.lt(1) && qty.gt(0)) {
      const ml = qty.times(1000).toDecimalPlaces(0);
      return `${ml.toString()} ml`;
    }
  }

  // Standard representation without trailing zeroes
  const formattedNumber = qty.toFixed(3).replace(/\.?0+$/, "");
  return `${formattedNumber} ${unitSymbol}`;
}

