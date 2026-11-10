import { Decimal } from "decimal.js";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { requireOwner } from "@/server/auth";
import { recordAuditLog } from "@/server/audit";
import {
  calculatePriceMetrics,
  calculatePriceFromMarkup,
  generatePriceSuggestions,
} from "@/server/domain/pricing";

export interface PricingFilterOptions {
  search?: string;
  categoryId?: string;
  status?: "ALL" | "REVIEW" | "LOSS" | "NO_PRICE";
}

export interface PricingProductRow {
  id: string;
  name: string;
  nameTamil: string | null;
  brand: string | null;
  categoryId: string;
  categoryName: string;
  categoryLowMarkup: number;
  categoryRecommendedMarkup: number;
  categoryHighMarkup: number;
  baseUnitSymbol: string;
  baseUnitLabel: string;
  costBasis: "LATEST" | "AVERAGE";
  lastCost: number | null;
  avgCost: number | null;
  currentCost: number | null;
  pricedAtCost: number | null;
  sellingPrice: number | null;
  mrp: number | null;
  markupPercent: number | null;
  marginPercent: number | null;
  profitPerUnit: number | null;
  isBelowCost: boolean;
  isAboveMRP: boolean;
  needsReview: boolean;
  suggestedLowPrice: number | null;
  suggestedRecommendedPrice: number | null;
  suggestedHighPrice: number | null;
  isPublished: boolean;
}

/**
 * Returns products with complete pricing, markup, margin and review calculations.
 */
export async function getPricingProducts(filters: PricingFilterOptions = {}) {
  await requireOwner();

  const whereClause: Prisma.ProductWhereInput = {
    isArchived: false,
  };

  if (filters.categoryId) {
    whereClause.categoryId = filters.categoryId;
  }

  if (filters.search) {
    const s = filters.search.trim();
    whereClause.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { nameTamil: { contains: s, mode: "insensitive" } },
      { brand: { contains: s, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    include: {
      category: true,
      baseUnit: true,
      cost: true,
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const formattedRows: PricingProductRow[] = [];

  for (const p of products) {
    const cost = p.cost;
    const costBasis = cost?.costBasis ?? "LATEST";
    const lastCost = cost?.lastCost ? cost.lastCost.toNumber() : null;
    const avgCost = cost?.avgCost ? cost.avgCost.toNumber() : null;

    const currentCostVal =
      costBasis === "AVERAGE" ? avgCost ?? lastCost : lastCost ?? avgCost;

    const pricedAtCost = cost?.pricedAtCost ? cost.pricedAtCost.toNumber() : null;
    const sellingPrice = p.sellingPrice ? p.sellingPrice.toNumber() : null;
    const mrp = p.mrp ? p.mrp.toNumber() : null;

    let markupPercent: number | null = null;
    let marginPercent: number | null = null;
    let profitPerUnit: number | null = null;
    let isBelowCost = false;
    let isAboveMRP = false;

    if (sellingPrice !== null && currentCostVal !== null && currentCostVal > 0) {
      const metrics = calculatePriceMetrics(sellingPrice, currentCostVal, mrp);
      markupPercent = metrics.markupPercent.toNumber();
      marginPercent = metrics.marginPercent.toNumber();
      profitPerUnit = metrics.profitPerUnit.toNumber();
      isBelowCost = metrics.isBelowCost;
      isAboveMRP = metrics.isAboveMRP;
    }

    // Price review flag criteria per Section 9.5:
    // 1. Selling price is null, OR
    // 2. Selling at a loss (currentCost >= sellingPrice), OR
    // 3. pricedAtCost is null (never formally priced against cost), OR
    // 4. Current cost differs by > 5% from pricedAtCost
    let needsReview = false;
    if (sellingPrice === null) {
      needsReview = true;
    } else if (currentCostVal !== null) {
      if (currentCostVal >= sellingPrice) {
        needsReview = true;
      } else if (pricedAtCost === null) {
        needsReview = true;
      } else {
        const diff = Math.abs(currentCostVal - pricedAtCost) / pricedAtCost;
        if (diff > 0.05) {
          needsReview = true;
        }
      }
    }

    // Suggestions
    let suggestedLowPrice: number | null = null;
    let suggestedRecommendedPrice: number | null = null;
    let suggestedHighPrice: number | null = null;

    if (currentCostVal !== null && currentCostVal > 0) {
      const suggestions = generatePriceSuggestions(
        currentCostVal,
        {
          lowMarkup: p.category.lowMarkup,
          recommendedMarkup: p.category.recommendedMarkup,
          highMarkup: p.category.highMarkup,
        }
      );
      suggestedLowPrice = suggestions.low.price.toNumber();
      suggestedRecommendedPrice = suggestions.recommended.price.toNumber();
      suggestedHighPrice = suggestions.high.price.toNumber();
    }

    // Apply status filter
    if (filters.status === "REVIEW" && !needsReview) continue;
    if (filters.status === "LOSS" && !isBelowCost) continue;
    if (filters.status === "NO_PRICE" && sellingPrice !== null) continue;

    formattedRows.push({
      id: p.id,
      name: p.name,
      nameTamil: p.nameTamil,
      brand: p.brand,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      categoryLowMarkup: p.category.lowMarkup.toNumber(),
      categoryRecommendedMarkup: p.category.recommendedMarkup.toNumber(),
      categoryHighMarkup: p.category.highMarkup.toNumber(),
      baseUnitSymbol: p.baseUnit.symbol,
      baseUnitLabel: p.baseUnit.label,
      costBasis,
      lastCost,
      avgCost,
      currentCost: currentCostVal,
      pricedAtCost,
      sellingPrice,
      mrp,
      markupPercent,
      marginPercent,
      profitPerUnit,
      isBelowCost,
      isAboveMRP,
      needsReview,
      suggestedLowPrice,
      suggestedRecommendedPrice,
      suggestedHighPrice,
      isPublished: p.isPublished,
    });
  }

  return formattedRows;
}

/**
 * Updates a product's selling price, syncs pricedAtCost, and logs price history.
 */
export async function updateProductSellingPrice(
  productId: string,
  newPrice: number,
  markupPercent?: number
) {
  const user = await requireOwner();

  if (isNaN(newPrice) || newPrice <= 0) {
    throw new Error("Selling price must be a valid positive number.");
  }

  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { cost: true },
    });

    if (!product) {
      throw new Error("Product not found.");
    }

    // Check MRP guard
    if (product.mrp && new Decimal(newPrice).gt(product.mrp)) {
      throw new Error(
        `Selling price (₹${newPrice}) cannot exceed MRP (₹${product.mrp.toNumber()}).`
      );
    }

    const oldPrice = product.sellingPrice ? product.sellingPrice.toNumber() : null;
    const currentCost = product.cost
      ? product.cost.costBasis === "AVERAGE"
        ? product.cost.avgCost ?? product.cost.lastCost
        : product.cost.lastCost ?? product.cost.avgCost
      : null;

    // Update Product
    await tx.product.update({
      where: { id: productId },
      data: {
        sellingPrice: new Decimal(newPrice),
      },
    });

    // Update ProductCost: set pricedAtCost = currentCost
    await tx.productCost.upsert({
      where: { productId },
      create: {
        productId,
        costBasis: "LATEST",
        pricedAtCost: currentCost,
        markupPercent: markupPercent !== undefined ? new Decimal(markupPercent) : null,
      },
      update: {
        pricedAtCost: currentCost,
        ...(markupPercent !== undefined
          ? { markupPercent: new Decimal(markupPercent) }
          : {}),
      },
    });

    // Record PriceHistory
    await tx.priceHistory.create({
      data: {
        productId,
        oldPrice: oldPrice !== null ? new Decimal(oldPrice) : null,
        newPrice: new Decimal(newPrice),
        markupPercent: markupPercent !== undefined ? new Decimal(markupPercent) : null,
        costUsed: currentCost,
      },
    });

    // Audit log
    await recordAuditLog(
      {
        action: "PRICE_UPDATE",
        entity: "Product",
        entityId: productId,
        data: {
          productName: product.name,
          oldPrice,
          newPrice,
          costUsed: currentCost ? currentCost.toNumber() : null,
        },
      },
      tx
    );

    return { success: true, newPrice };
  });
}

/**
 * Bulk applies recommended category markup to all selected products.
 */
export async function bulkApplyRecommendedPricing(productIds: string[]) {
  const user = await requireOwner();

  if (!productIds || productIds.length === 0) {
    throw new Error("No products selected.");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      category: true,
      cost: true,
    },
  });

  const updatedCount = await prisma.$transaction(async (tx) => {
    let count = 0;

    for (const p of products) {
      const currentCost = p.cost
        ? p.cost.costBasis === "AVERAGE"
          ? p.cost.avgCost ?? p.cost.lastCost
          : p.cost.lastCost ?? p.cost.avgCost
        : null;

      if (!currentCost || currentCost.lte(0)) continue;

      const recommendedMarkup = p.category.recommendedMarkup;
      const calculatedPrice = calculatePriceFromMarkup(currentCost, recommendedMarkup, "UP_1");

      // MRP check
      const finalPrice =
        p.mrp && calculatedPrice.gt(p.mrp) ? new Decimal(p.mrp) : calculatedPrice;

      await tx.product.update({
        where: { id: p.id },
        data: {
          sellingPrice: finalPrice,
        },
      });

      await tx.productCost.upsert({
        where: { productId: p.id },
        create: {
          productId: p.id,
          costBasis: p.cost?.costBasis ?? "LATEST",
          pricedAtCost: currentCost,
          markupPercent: recommendedMarkup,
        },
        update: {
          pricedAtCost: currentCost,
          markupPercent: recommendedMarkup,
        },
      });

      await tx.priceHistory.create({
        data: {
          productId: p.id,
          oldPrice: p.sellingPrice,
          newPrice: finalPrice,
          markupPercent: recommendedMarkup,
          costUsed: currentCost,
        },
      });

      count++;
    }

    return count;
  });

  await recordAuditLog({
    action: "BULK_PRICE_UPDATE",
    entity: "Product",
    entityId: "bulk",
    data: { updatedCount, productIds },
  });

  return { success: true, updatedCount };
}

/**
 * Toggles a product's cost basis between LATEST purchase cost and moving AVERAGE cost.
 */
export async function updateProductCostBasis(
  productId: string,
  costBasis: "LATEST" | "AVERAGE"
) {
  await requireOwner();

  await prisma.productCost.upsert({
    where: { productId },
    create: {
      productId,
      costBasis,
    },
    update: {
      costBasis,
    },
  });

  return { success: true, costBasis };
}

