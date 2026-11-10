import { Decimal } from "decimal.js";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { requireOwner } from "@/server/auth";
import { recordAuditLog } from "@/server/audit";
import { convertToBaseQuantity } from "@/server/domain/units";
import {
  allocateExtraChargesAndComputeUnitCosts,
  calculateNewCosts,
} from "@/server/domain/costing";
import { generatePriceSuggestions } from "@/server/domain/pricing";
import { purchaseSchema, type PurchaseFormInput } from "@/server/domain/validators";

export interface PurchaseFilterOptions {
  supplierId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  status?: "ACTIVE" | "VOIDED";
  page?: number;
  limit?: number;
}

export interface PriceReviewItem {
  productId: string;
  productName: string;
  productNameTamil: string | null;
  baseUnitSymbol: string;
  oldCost: number | null;
  newCost: number;
  currentSellingPrice: number | null;
  mrp: number | null;
  lowPrice: number;
  recommendedPrice: number;
  highPrice: number;
  categoryDefaultMarkup: number;
}

/**
 * Lists purchases with filtering, pagination and supplier information.
 */
export async function getPurchases(filters: PurchaseFilterOptions = {}) {
  await requireOwner();

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const whereClause: Prisma.PurchaseWhereInput = {};

  if (filters.supplierId) {
    whereClause.supplierId = filters.supplierId;
  }

  if (filters.status) {
    whereClause.status = filters.status;
  }

  if (filters.search) {
    const s = filters.search.trim();
    whereClause.OR = [
      { invoiceNo: { contains: s, mode: "insensitive" } },
      { notes: { contains: s, mode: "insensitive" } },
      { supplier: { name: { contains: s, mode: "insensitive" } } },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    whereClause.purchaseDate = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }

  if (filters.productId) {
    whereClause.items = {
      some: {
        productId: filters.productId,
      },
    };
  }

  const [totalCount, purchases] = await Promise.all([
    prisma.purchase.count({ where: whereClause }),
    prisma.purchase.findMany({
      where: whereClause,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
            area: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                nameTamil: true,
              },
            },
            unit: {
              select: {
                id: true,
                symbol: true,
                label: true,
              },
            },
          },
        },
        replaces: {
          select: {
            id: true,
            invoiceNo: true,
            purchaseDate: true,
          },
        },
        replacedBy: {
          select: {
            id: true,
            invoiceNo: true,
            purchaseDate: true,
          },
        },
      },
      orderBy: { purchaseDate: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    purchases: purchases.map((p) => ({
      id: p.id,
      purchaseDate: p.purchaseDate.toISOString().split("T")[0],
      invoiceNo: p.invoiceNo,
      supplierId: p.supplierId,
      supplierName: p.supplier.name,
      supplierPhone: p.supplier.phone,
      supplierArea: p.supplier.area,
      subtotal: p.subtotal.toNumber(),
      extraCharges: p.extraCharges.toNumber(),
      total: p.total.toNumber(),
      status: p.status,
      notes: p.notes,
      voidedAt: p.voidedAt ? p.voidedAt.toISOString() : null,
      voidReason: p.voidReason,
      replacesId: p.replacesId,
      itemCount: p.items.length,
      items: p.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        productNameTamil: i.product.nameTamil,
        quantity: i.quantity.toNumber(),
        unitSymbol: i.unit.symbol,
        baseQty: i.baseQty.toNumber(),
        lineAmount: i.lineAmount.toNumber(),
        unitCost: i.unitCost.toNumber(),
      })),
    })),
    pagination: {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Returns complete details of a single purchase bill, with previous cost comparisons for each item.
 */
export async function getPurchaseById(id: string) {
  await requireOwner();

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: {
          product: {
            include: {
              baseUnit: true,
              category: true,
              cost: true,
            },
          },
          unit: true,
        },
      },
      replaces: {
        select: {
          id: true,
          invoiceNo: true,
          purchaseDate: true,
          total: true,
        },
      },
      replacedBy: {
        select: {
          id: true,
          invoiceNo: true,
          purchaseDate: true,
          total: true,
        },
      },
    },
  });

  if (!purchase) {
    return null;
  }

  // Look up previous purchase rate for each item to show comparison
  const itemsWithComparison = await Promise.all(
    purchase.items.map(async (item) => {
      const prevPurchaseItem = await prisma.purchaseItem.findFirst({
        where: {
          productId: item.productId,
          purchase: {
            status: "ACTIVE",
            purchaseDate: {
              lt: purchase.purchaseDate,
            },
            id: { not: purchase.id },
          },
        },
        include: {
          purchase: {
            select: {
              purchaseDate: true,
              supplier: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          purchase: {
            purchaseDate: "desc",
          },
        },
      });

      const prevRate = prevPurchaseItem ? prevPurchaseItem.unitCost.toNumber() : null;
      const currentRate = item.unitCost.toNumber();
      let diffPercent: number | null = null;

      if (prevRate !== null && prevRate > 0) {
        diffPercent = Math.round(((currentRate - prevRate) / prevRate) * 100 * 10) / 10;
      }

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productNameTamil: item.product.nameTamil,
        baseUnitSymbol: item.product.baseUnit.symbol,
        quantity: item.quantity.toNumber(),
        unitId: item.unitId,
        unitLabel: item.unit.label,
        unitSymbol: item.unit.symbol,
        unitsPerPack: item.unitsPerPack ? item.unitsPerPack.toNumber() : null,
        baseQty: item.baseQty.toNumber(),
        lineAmount: item.lineAmount.toNumber(),
        extraShare: item.extraShare.toNumber(),
        unitCost: currentRate,
        previousRate: prevRate,
        previousDate: prevPurchaseItem
          ? prevPurchaseItem.purchase.purchaseDate.toISOString().split("T")[0]
          : null,
        previousSupplierName: prevPurchaseItem
          ? prevPurchaseItem.purchase.supplier.name
          : null,
        diffPercent,
        sellingPrice: item.product.sellingPrice ? item.product.sellingPrice.toNumber() : null,
      };
    })
  );

  return {
    id: purchase.id,
    purchaseDate: purchase.purchaseDate.toISOString().split("T")[0],
    invoiceNo: purchase.invoiceNo,
    supplierId: purchase.supplierId,
    supplier: {
      id: purchase.supplier.id,
      name: purchase.supplier.name,
      phone: purchase.supplier.phone,
      area: purchase.supplier.area,
      address: purchase.supplier.address,
    },
    subtotal: purchase.subtotal.toNumber(),
    extraCharges: purchase.extraCharges.toNumber(),
    total: purchase.total.toNumber(),
    notes: purchase.notes,
    status: purchase.status,
    voidedAt: purchase.voidedAt ? purchase.voidedAt.toISOString() : null,
    voidReason: purchase.voidReason,
    replaces: purchase.replaces
      ? {
        id: purchase.replaces.id,
        invoiceNo: purchase.replaces.invoiceNo,
        purchaseDate: purchase.replaces.purchaseDate.toISOString().split("T")[0],
        total: purchase.replaces.total.toNumber(),
      }
      : null,
    replacedBy: purchase.replacedBy
      ? {
        id: purchase.replacedBy.id,
        invoiceNo: purchase.replacedBy.invoiceNo,
        purchaseDate: purchase.replacedBy.purchaseDate.toISOString().split("T")[0],
        total: purchase.replacedBy.total.toNumber(),
      }
      : null,
    createdAt: purchase.createdAt.toISOString(),
    items: itemsWithComparison,
  };
}

/**
 * Gets the last purchase rate for a product (used dynamically in purchase form when selecting products).
 */
export async function getProductLastPurchaseRate(productId: string) {
  await requireOwner();

  const item = await prisma.purchaseItem.findFirst({
    where: {
      productId,
      purchase: {
        status: "ACTIVE",
      },
    },
    include: {
      purchase: {
        select: {
          purchaseDate: true,
          supplier: {
            select: { name: true },
          },
        },
      },
      product: {
        select: {
          baseUnit: {
            select: { symbol: true },
          },
        },
      },
    },
    orderBy: {
      purchase: {
        purchaseDate: "desc",
      },
    },
  });

  if (!item) {
    return null;
  }

  return {
    unitCost: item.unitCost.toNumber(),
    baseUnitSymbol: item.product.baseUnit.symbol,
    purchaseDate: item.purchase.purchaseDate.toISOString().split("T")[0],
    supplierName: item.purchase.supplier.name,
  };
}

/**
 * Records a new purchase bill, updates stock, moving average costs, and determines if selling prices should be reviewed.
 */
export async function recordPurchase(data: PurchaseFormInput) {
  const owner = await requireOwner();
  const validated = purchaseSchema.parse(data);

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch supplier
    const supplier = await tx.supplier.findUnique({
      where: { id: validated.supplierId },
    });
    if (!supplier) {
      throw new Error("Wholesale store (supplier) not found.");
    }

    // 2. Fetch all products and units in the purchase lines
    const productIds = validated.items.map((i) => i.productId);
    const unitIds = validated.items.map((i) => i.unitId);

    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      include: {
        baseUnit: true,
        category: true,
        cost: true,
      },
    });

    const units = await tx.unit.findMany({
      where: { id: { in: unitIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const unitMap = new Map(units.map((u) => [u.id, u]));

    // 3. Convert quantities to base unit and prepare lines
    const preparedLines: {
      productId: string;
      unitId: string;
      quantity: Decimal;
      unitsPerPack: Decimal | null;
      baseQty: Decimal;
      lineAmount: Decimal;
    }[] = [];

    for (const item of validated.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found.`);
      }

      const inputUnit = unitMap.get(item.unitId);
      if (!inputUnit) {
        throw new Error(`Unit ${item.unitId} not found.`);
      }

      const baseUnit = product.baseUnit;
      const conv = convertToBaseQuantity(
        item.quantity,
        inputUnit,
        baseUnit,
        item.unitsPerPack ?? null
      );
      const baseQty = conv.baseQty;

      if (baseQty.lte(0)) {
        throw new Error(`Calculated base quantity for ${product.name} must be greater than zero.`);
      }

      preparedLines.push({
        productId: item.productId,
        unitId: item.unitId,
        quantity: new Decimal(item.quantity),
        unitsPerPack: item.unitsPerPack ? new Decimal(item.unitsPerPack) : null,
        baseQty,
        lineAmount: new Decimal(item.lineAmount),
      });
    }

    // 4. Allocate extra charges and compute unitCost per line
    const extraChargesDecimal = new Decimal(validated.extraCharges ?? 0);
    const allocatedCosts = allocateExtraChargesAndComputeUnitCosts(
      preparedLines.map((l) => ({ lineAmount: l.lineAmount, baseQty: l.baseQty })),
      extraChargesDecimal
    );

    const subtotalDecimal = preparedLines.reduce(
      (sum, line) => sum.plus(line.lineAmount),
      new Decimal(0)
    );
    const totalDecimal = subtotalDecimal.plus(extraChargesDecimal);

    // 5. Create Purchase record
    const purchase = await tx.purchase.create({
      data: {
        supplierId: validated.supplierId,
        purchaseDate: new Date(validated.purchaseDate),
        invoiceNo: validated.invoiceNo || null,
        subtotal: subtotalDecimal,
        extraCharges: extraChargesDecimal,
        total: totalDecimal,
        notes: validated.notes || null,
        status: "ACTIVE",
      },
    });

    // 6. Create PurchaseItems, update stock, log StockMovement, and update ProductCost
    const priceReviewItems: PriceReviewItem[] = [];

    for (let i = 0; i < preparedLines.length; i++) {
      const line = preparedLines[i];
      const alloc = allocatedCosts[i];
      const product = productMap.get(line.productId)!;

      // Create purchase item
      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: line.productId,
          quantity: line.quantity,
          unitId: line.unitId,
          unitsPerPack: line.unitsPerPack,
          baseQty: line.baseQty,
          lineAmount: line.lineAmount,
          extraShare: alloc.extraShare,
          unitCost: alloc.unitCost,
        },
      });

      // Update product stock
      const prevStock = new Decimal(product.stockQty);
      const newStock = prevStock.plus(line.baseQty);

      await tx.product.update({
        where: { id: line.productId },
        data: {
          stockQty: newStock,
        },
      });

      // Log StockMovement
      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          type: "PURCHASE",
          quantityChange: line.baseQty,
          stockAfter: newStock,
          refType: "purchase",
          refId: purchase.id,
        },
      });

      // Update ProductCost with moving average
      const currentCost = product.cost;
      const currentAvgCost = currentCost?.avgCost ?? null;
      const costUpdate = calculateNewCosts(
        currentAvgCost,
        prevStock,
        line.baseQty,
        alloc.unitCost
      );

      const oldCostBasis = currentCost
        ? currentCost.costBasis === "AVERAGE"
          ? currentCost.avgCost
          : currentCost.lastCost
        : null;

      const newCostBasis = currentCost?.costBasis === "AVERAGE"
        ? costUpdate.avgCost
        : costUpdate.lastCost;

      // Price to review flagging logic per Section 9.5:
      // 1. pricedAtCost is null
      // 2. new cost differs from pricedAtCost by > 5%
      // 3. new cost >= sellingPrice (loss warning)
      await tx.productCost.upsert({
        where: { productId: line.productId },
        create: {
          productId: line.productId,
          lastCost: costUpdate.lastCost,
          lastCostAt: new Date(validated.purchaseDate),
          lastSupplierId: validated.supplierId,
          avgCost: costUpdate.avgCost,
          costBasis: currentCost?.costBasis ?? "LATEST",
          markupPercent: currentCost?.markupPercent ?? product.category.recommendedMarkup,
          pricedAtCost: currentCost?.pricedAtCost ?? null,
        },
        update: {
          lastCost: costUpdate.lastCost,
          lastCostAt: new Date(validated.purchaseDate),
          lastSupplierId: validated.supplierId,
          avgCost: costUpdate.avgCost,
        },
      });

      // Compute suggestions for post-save review step
      const suggestions = generatePriceSuggestions(
        newCostBasis,
        {
          lowMarkup: product.category.lowMarkup,
          recommendedMarkup: product.category.recommendedMarkup,
          highMarkup: product.category.highMarkup,
        }
      );

      priceReviewItems.push({
        productId: product.id,
        productName: product.name,
        productNameTamil: product.nameTamil,
        baseUnitSymbol: product.baseUnit.symbol,
        oldCost: oldCostBasis ? oldCostBasis.toNumber() : null,
        newCost: newCostBasis.toNumber(),
        currentSellingPrice: product.sellingPrice ? product.sellingPrice.toNumber() : null,
        mrp: product.mrp ? product.mrp.toNumber() : null,
        lowPrice: suggestions.low.price.toNumber(),
        recommendedPrice: suggestions.recommended.price.toNumber(),
        highPrice: suggestions.high.price.toNumber(),
        categoryDefaultMarkup: product.category.recommendedMarkup.toNumber(),
      });
    }

    // 7. Audit log
    await recordAuditLog(
      {
        action: "PURCHASE_CREATE",
        entity: "Purchase",
        entityId: purchase.id,
        data: {
          supplierId: validated.supplierId,
          supplierName: supplier.name,
          total: totalDecimal.toNumber(),
          itemsCount: preparedLines.length,
        },
      },
      tx
    );

    return {
      success: true,
      purchaseId: purchase.id,
      priceReviewItems,
    };
  });
}

/**
 * Voids an existing purchase bill.
 * Reverses stock movements and recalculates product costs from ledger history.
 * Blocked if current stock is less than purchased quantity (some stock already sold).
 */
export async function voidPurchase(id: string, reason: string) {
  const owner = await requireOwner();

  if (!reason || reason.trim().length === 0) {
    throw new Error("A reason is required to void a purchase bill.");
  }

  return await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                baseUnit: true,
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      throw new Error("Purchase bill not found.");
    }

    if (purchase.status === "VOIDED") {
      throw new Error("This purchase bill is already voided.");
    }

    // Check if stock has already been sold
    for (const item of purchase.items) {
      const currentStock = new Decimal(item.product.stockQty);
      if (currentStock.lt(item.baseQty)) {
        throw new Error(
          `Cannot void bill: ${item.product.name} currently has ${currentStock.toString()} ${item.product.baseUnit.symbol} in stock, but this bill added ${item.baseQty.toString()} ${item.product.baseUnit.symbol}. Some stock has already been sold.`
        );
      }
    }

    // Reverse stock and log movements
    for (const item of purchase.items) {
      const currentStock = new Decimal(item.product.stockQty);
      const newStock = currentStock.minus(item.baseQty);

      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: newStock },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "PURCHASE_VOID",
          quantityChange: item.baseQty.negated(),
          stockAfter: newStock,
          reason: "OTHER",
          note: `Void bill ${purchase.invoiceNo || purchase.id}: ${reason}`,
          refType: "purchase",
          refId: purchase.id,
        },
      });
    }

    // Mark purchase as voided
    await tx.purchase.update({
      where: { id },
      data: {
        status: "VOIDED",
        voidedAt: new Date(),
        voidReason: reason,
      },
    });

    // Recompute costs for all affected products from remaining active purchases
    const affectedProductIds = Array.from(new Set(purchase.items.map((i) => i.productId)));

    for (const productId of affectedProductIds) {
      const activePurchases = await tx.purchaseItem.findMany({
        where: {
          productId,
          purchase: {
            status: "ACTIVE",
          },
        },
        include: {
          purchase: true,
        },
        orderBy: {
          purchase: {
            purchaseDate: "asc",
          },
        },
      });

      if (activePurchases.length === 0) {
        // No remaining purchases for this product
        await tx.productCost.updateMany({
          where: { productId },
          data: {
            lastCost: null,
            lastCostAt: null,
            lastSupplierId: null,
            avgCost: null,
          },
        });
      } else {
        // Replay costs chronologically
        let avgCost: Decimal | null = null;
        let lastCost: Decimal | null = null;
        let lastDate: Date | null = null;
        let lastSupplier: string | null = null;
        let cumulativeStock = new Decimal(0);

        for (const pItem of activePurchases) {
          const res = calculateNewCosts(
            avgCost,
            cumulativeStock,
            pItem.baseQty,
            pItem.unitCost
          );
          avgCost = res.avgCost;
          lastCost = res.lastCost;
          lastDate = pItem.purchase.purchaseDate;
          lastSupplier = pItem.purchase.supplierId;
          cumulativeStock = cumulativeStock.plus(pItem.baseQty);
        }

        await tx.productCost.updateMany({
          where: { productId },
          data: {
            lastCost,
            lastCostAt: lastDate,
            lastSupplierId: lastSupplier,
            avgCost,
          },
        });
      }
    }

    // Audit log
    await recordAuditLog(
      {
        action: "PURCHASE_VOID",
        entity: "Purchase",
        entityId: purchase.id,
        data: {
          reason,
          invoiceNo: purchase.invoiceNo,
        },
      },
      tx
    );

    return { success: true };
  });
}

/**
 * Corrects an existing purchase bill by voiding it and creating a new replacement purchase linked by replacesId.
 */
export async function correctPurchase(
  id: string,
  reason: string,
  newData: PurchaseFormInput
) {
  const owner = await requireOwner();

  if (!reason || reason.trim().length === 0) {
    throw new Error("A reason is required to correct a purchase bill.");
  }

  // 1. Void the existing purchase
  await voidPurchase(id, `Correction: ${reason}`);

  // 2. Record new purchase and link replacesId
  const result = await recordPurchase(newData);

  await prisma.purchase.update({
    where: { id: result.purchaseId },
    data: { replacesId: id },
  });

  await recordAuditLog({
    action: "PURCHASE_CORRECT",
    entity: "Purchase",
    entityId: result.purchaseId,
    data: {
      replacedPurchaseId: id,
      reason,
    },
  });

  return result;
}
