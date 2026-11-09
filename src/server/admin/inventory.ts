import { Decimal } from "decimal.js";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { requireOwner } from "@/server/auth";
import { recordAuditLog } from "@/server/audit";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "@/server/domain/validators";

export interface InventoryFilterOptions {
  search?: string;
  categoryId?: string;
  stockFilter?: "ALL" | "LOW" | "OUT";
  page?: number;
  limit?: number;
}

/**
 * Returns inventory list with current stock levels, cost valuation, and thresholds.
 */
export async function getInventory(filters: InventoryFilterOptions = {}) {
  await requireOwner();

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
  const skip = (page - 1) * limit;

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

  // Stock status filter
  if (filters.stockFilter === "OUT") {
    whereClause.stockQty = { lte: 0 };
  }

  // Fetch all unarchived products for valuation summary
  const allProductsForSummary = await prisma.product.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      stockQty: true,
      lowStockAt: true,
      cost: {
        select: {
          lastCost: true,
          avgCost: true,
          costBasis: true,
        },
      },
    },
  });

  const totalItemsCount = allProductsForSummary.length;
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalStockValuation = new Decimal(0);

  for (const p of allProductsForSummary) {
    const stock = new Decimal(p.stockQty);
    const lowThreshold = new Decimal(p.lowStockAt);

    if (stock.lte(0)) {
      outOfStockCount++;
    } else if (stock.lte(lowThreshold)) {
      lowStockCount++;
      inStockCount++;
    } else {
      inStockCount++;
    }

    if (stock.gt(0) && p.cost) {
      const unitCost =
        p.cost.costBasis === "AVERAGE"
          ? p.cost.avgCost ?? p.cost.lastCost
          : p.cost.lastCost ?? p.cost.avgCost;

      if (unitCost) {
        totalStockValuation = totalStockValuation.plus(stock.times(unitCost));
      }
    }
  }

  // If filter is LOW, filter on lowStockIds
  const finalWhere: Prisma.ProductWhereInput = { ...whereClause };
  if (filters.stockFilter === "LOW") {
    const lowStockIds = allProductsForSummary
      .filter((p) => {
        const stock = new Decimal(p.stockQty);
        return stock.gt(0) && stock.lte(p.lowStockAt);
      })
      .map((p) => p.id);

    finalWhere.id = { in: lowStockIds };
  }

  const [totalFilteredCount, items] = await Promise.all([
    prisma.product.count({ where: finalWhere }),
    prisma.product.findMany({
      where: finalWhere,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            tint: true,
          },
        },
        baseUnit: {
          select: {
            id: true,
            symbol: true,
            label: true,
          },
        },
        cost: {
          select: {
            lastCost: true,
            avgCost: true,
            costBasis: true,
            pricedAtCost: true,
          },
        },
      },
      orderBy: [{ stockQty: "asc" }, { name: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  return {
    summary: {
      totalItemsCount,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      totalStockValuation: totalStockValuation.toNumber(),
    },
    items: items.map((p) => {
      const stock = p.stockQty.toNumber();
      const lowThreshold = p.lowStockAt.toNumber();
      const unitCost = p.cost
        ? (p.cost.costBasis === "AVERAGE"
            ? p.cost.avgCost?.toNumber() ?? p.cost.lastCost?.toNumber()
            : p.cost.lastCost?.toNumber() ?? p.cost.avgCost?.toNumber()) ?? null
        : null;

      let status: "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK" = "IN_STOCK";
      if (stock <= 0) {
        status = "OUT_OF_STOCK";
      } else if (stock <= lowThreshold) {
        status = "LOW_STOCK";
      }

      const totalValuation = unitCost !== null && stock > 0 ? Math.round(stock * unitCost * 100) / 100 : 0;

      return {
        id: p.id,
        name: p.name,
        nameTamil: p.nameTamil,
        brand: p.brand,
        sizeLabel: p.sizeLabel,
        category: p.category,
        baseUnit: p.baseUnit,
        stockQty: stock,
        lowStockAt: lowThreshold,
        status,
        unitCost,
        costBasis: p.cost?.costBasis ?? "LATEST",
        totalValuation,
        sellingPrice: p.sellingPrice ? p.sellingPrice.toNumber() : null,
        isPublished: p.isPublished,
      };
    }),
    pagination: {
      totalCount: totalFilteredCount,
      page,
      limit,
      totalPages: Math.ceil(totalFilteredCount / limit),
    },
  };
}

/**
 * Adjusts product stock (Add, Remove, or Set counted stock) with required reason and note.
 */
export async function adjustStock(data: StockAdjustmentInput) {
  await requireOwner();
  const validated = stockAdjustmentSchema.parse(data);

  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: validated.productId },
      include: { baseUnit: true },
    });

    if (!product) {
      throw new Error("Product not found.");
    }

    const currentStock = new Decimal(product.stockQty);
    const quantity = new Decimal(validated.quantity);

    let newStock: Decimal;
    let qtyDelta: Decimal;

    if (validated.type === "ADD") {
      qtyDelta = quantity;
      newStock = currentStock.plus(quantity);
    } else if (validated.type === "REMOVE") {
      qtyDelta = quantity.negated();
      newStock = currentStock.minus(quantity);
    } else {
      // SET
      newStock = quantity;
      qtyDelta = newStock.minus(currentStock);
    }

    if (newStock.lt(0)) {
      throw new Error(
        `Stock cannot become negative. Current stock is ${currentStock.toString()} ${product.baseUnit.symbol}.`
      );
    }

    await tx.product.update({
      where: { id: product.id },
      data: { stockQty: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId: product.id,
        type: "ADJUSTMENT",
        quantityChange: qtyDelta,
        stockAfter: newStock,
        reason: validated.reason,
        note: validated.note || null,
        refType: "adjustment",
      },
    });

    await recordAuditLog(
      {
        action: "STOCK_ADJUSTMENT",
        entity: "Product",
        entityId: product.id,
        data: {
          productName: product.name,
          type: validated.type,
          qtyDelta: qtyDelta.toNumber(),
          newStock: newStock.toNumber(),
          reason: validated.reason,
          note: validated.note,
        },
      },
      tx
    );

    return {
      success: true,
      newStock: newStock.toNumber(),
      movementId: movement.id,
    };
  });
}

/**
 * Retrieves the stock movement history for a product.
 */
export async function getStockMovements(productId: string, limit = 50) {
  await requireOwner();

  const movements = await prisma.stockMovement.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return movements.map((m) => ({
    id: m.id,
    type: m.type,
    quantityChange: m.quantityChange.toNumber(),
    stockAfter: m.stockAfter.toNumber(),
    reason: m.reason,
    note: m.note,
    refType: m.refType,
    refId: m.refId,
    createdAt: m.createdAt.toISOString(),
  }));
}

/**
 * Exports entire inventory data as a CSV string formatted for download.
 */
export async function exportInventoryCsv() {
  await requireOwner();

  const products = await prisma.product.findMany({
    where: { isArchived: false },
    include: {
      category: { select: { name: true } },
      baseUnit: { select: { symbol: true } },
      cost: { select: { lastCost: true, avgCost: true, costBasis: true } },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const headers = [
    "Product Name",
    "Tamil Name",
    "Category",
    "Current Stock",
    "Unit",
    "Low Stock Threshold",
    "Cost Basis",
    "Unit Cost (INR)",
    "Total Stock Value (INR)",
    "Selling Price (INR)",
    "Status",
  ];

  const rows = products.map((p) => {
    const stock = p.stockQty.toNumber();
    const lowThreshold = p.lowStockAt.toNumber();
    const unitCost = p.cost
      ? (p.cost.costBasis === "AVERAGE"
          ? p.cost.avgCost?.toNumber() ?? p.cost.lastCost?.toNumber()
          : p.cost.lastCost?.toNumber() ?? p.cost.avgCost?.toNumber()) ?? null
      : null;

    let status = "In Stock";
    if (stock <= 0) {
      status = "Out of Stock";
    } else if (stock <= lowThreshold) {
      status = "Low Stock";
    }

    const totalValuation = unitCost !== null && stock > 0 ? (stock * unitCost).toFixed(2) : "0.00";

    return [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.nameTamil || "").replace(/"/g, '""')}"`,
      `"${p.category.name.replace(/"/g, '""')}"`,
      stock.toString(),
      p.baseUnit.symbol,
      lowThreshold.toString(),
      p.cost?.costBasis ?? "LATEST",
      unitCost !== null ? unitCost.toFixed(2) : "",
      totalValuation,
      p.sellingPrice ? p.sellingPrice.toNumber().toFixed(2) : "",
      status,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
