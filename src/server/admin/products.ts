"use server";

import "server-only";
import { requireOwner } from "@/server/auth";
import { prisma } from "@/server/db";
import { productSchema } from "@/server/domain/validators";
import { validateSellingPrice, calculatePriceMetrics, isPriceReviewNeeded } from "@/server/domain/pricing";
import { recordAuditLog } from "@/server/audit";
import { Decimal } from "decimal.js";
import { revalidatePath } from "next/cache";

export async function getProducts(options?: {
  categoryId?: string;
  stockFilter?: "ALL" | "LOW" | "OUT";
  search?: string;
  page?: number;
  limit?: number;
}) {
  await requireOwner();

  const whereClause: Record<string, unknown> = {
    isArchived: false,
  };

  if (options?.categoryId) {
    whereClause.categoryId = options.categoryId;
  }

  if (options?.stockFilter === "LOW") {
    whereClause.stockQty = { gt: 0, lte: 5 };
  } else if (options?.stockFilter === "OUT") {
    whereClause.stockQty = { lte: 0 };
  }

  if (options?.search && options.search.trim()) {
    const q = options.search.trim();
    whereClause.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { nameTamil: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    include: {
      category: { select: { id: true, name: true, tint: true } },
      baseUnit: { select: { id: true, symbol: true, label: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
      cost: true,
    },
  });

  return products.map((p) => {
    const sellingPrice = p.sellingPrice ? Number(p.sellingPrice) : null;
    const costForPricing = p.cost
      ? p.cost.costBasis === "AVERAGE" && p.cost.avgCost
        ? Number(p.cost.avgCost)
        : p.cost.lastCost
        ? Number(p.cost.lastCost)
        : null
      : null;

    let metrics = null;
    if (sellingPrice && costForPricing) {
      metrics = calculatePriceMetrics(sellingPrice, costForPricing, p.mrp ? Number(p.mrp) : null);
    }

    const needsReview = p.cost
      ? isPriceReviewNeeded(costForPricing, p.cost.pricedAtCost ? Number(p.cost.pricedAtCost) : null)
      : false;

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameTamil: p.nameTamil,
      brand: p.brand,
      sizeLabel: p.sizeLabel,
      category: p.category,
      baseUnit: p.baseUnit,
      stockQty: Number(p.stockQty),
      lowStockAt: Number(p.lowStockAt),
      sellingPrice,
      mrp: p.mrp ? Number(p.mrp) : null,
      isPublished: p.isPublished,
      isFeatured: p.isFeatured,
      thumbnailUrl: p.images[0]?.url || null,
      costForPricing,
      marginPercent: metrics ? Number(metrics.marginPercent) : null,
      markupPercent: metrics ? Number(metrics.markupPercent) : null,
      profitPerUnit: metrics ? Number(metrics.profitPerUnit) : null,
      needsReview,
      isBelowCost: metrics ? metrics.isBelowCost : false,
      isAboveMRP: metrics ? metrics.isAboveMRP : false,
    };
  });
}

export async function getProductById(id: string) {
  await requireOwner();

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      baseUnit: true,
      images: { orderBy: { sortOrder: "asc" } },
      cost: true,
      purchaseItems: {
        where: { purchase: { status: "ACTIVE" } },
        orderBy: { purchase: { purchaseDate: "desc" } },
        include: {
          purchase: {
            include: { supplier: { select: { id: true, name: true, phone: true } } },
          },
          unit: { select: { symbol: true, label: true } },
        },
      },
      movements: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      priceHistory: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  // Find cheapest supplier for this product
  let cheapestSupplier: { supplierId: string; supplierName: string; lowestUnitCost: number } | null = null;
  const supplierCosts = new Map<string, { name: string; lowestCost: number }>();

  for (const item of product.purchaseItems) {
    const sId = item.purchase.supplier.id;
    const sName = item.purchase.supplier.name;
    const uCost = Number(item.unitCost);

    const existing = supplierCosts.get(sId);
    if (!existing || uCost < existing.lowestCost) {
      supplierCosts.set(sId, { name: sName, lowestCost: uCost });
    }
  }

  let minCost = Infinity;
  for (const [sId, data] of supplierCosts.entries()) {
    if (data.lowestCost < minCost) {
      minCost = data.lowestCost;
      cheapestSupplier = {
        supplierId: sId,
        supplierName: data.name,
        lowestUnitCost: data.lowestCost,
      };
    }
  }

  // Price trend data points (chronological order)
  const priceTrend = product.purchaseItems
    .map((pi) => ({
      date: pi.purchase.purchaseDate.toISOString().split("T")[0],
      unitCost: Number(pi.unitCost),
      supplierName: pi.purchase.supplier.name,
    }))
    .reverse();

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    nameTamil: product.nameTamil,
    brand: product.brand,
    description: product.description,
    sizeLabel: product.sizeLabel,
    categoryId: product.categoryId,
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
      iconKey: product.category.iconKey,
      tint: product.category.tint,
      lowMarkup: Number(product.category.lowMarkup),
      recommendedMarkup: Number(product.category.recommendedMarkup),
      highMarkup: Number(product.category.highMarkup),
    },
    baseUnitId: product.baseUnitId,
    baseUnit: {
      id: product.baseUnit.id,
      code: product.baseUnit.code,
      label: product.baseUnit.label,
      symbol: product.baseUnit.symbol,
      dimension: product.baseUnit.dimension,
      factorToBase: product.baseUnit.factorToBase
        ? Number(product.baseUnit.factorToBase)
        : null,
      isBaseable: product.baseUnit.isBaseable,
    },
    sellStep: Number(product.sellStep),
    minQty: Number(product.minQty),
    maxQty: Number(product.maxQty),
    sellingPrice: product.sellingPrice ? Number(product.sellingPrice) : null,
    mrp: product.mrp ? Number(product.mrp) : null,
    stockQty: Number(product.stockQty),
    lowStockAt: Number(product.lowStockAt),
    isPublished: product.isPublished,
    isFeatured: product.isFeatured,
    isArchived: product.isArchived,
    images: product.images,
    cost: product.cost
      ? {
          lastCost: product.cost.lastCost ? Number(product.cost.lastCost) : null,
          avgCost: product.cost.avgCost ? Number(product.cost.avgCost) : null,
          costBasis: product.cost.costBasis,
          pricedAtCost: product.cost.pricedAtCost ? Number(product.cost.pricedAtCost) : null,
          lastCostAt: product.cost.lastCostAt,
        }
      : null,
    cheapestSupplier,
    priceTrend,
    purchaseHistory: product.purchaseItems.map((pi) => ({
      id: pi.id,
      purchaseId: pi.purchaseId,
      purchaseDate: pi.purchase.purchaseDate,
      supplierName: pi.purchase.supplier.name,
      supplierId: pi.purchase.supplier.id,
      quantity: Number(pi.quantity),
      unitSymbol: pi.unit.symbol,
      baseQty: Number(pi.baseQty),
      lineAmount: Number(pi.lineAmount),
      extraShare: Number(pi.extraShare),
      unitCost: Number(pi.unitCost),
    })),
    stockMovements: product.movements.map((m) => ({
      id: m.id,
      type: m.type,
      quantityChange: Number(m.quantityChange),
      stockAfter: Number(m.stockAfter),
      reason: m.reason,
      note: m.note,
      createdAt: m.createdAt,
    })),
    priceHistory: product.priceHistory.map((ph) => ({
      id: ph.id,
      oldPrice: ph.oldPrice ? Number(ph.oldPrice) : null,
      newPrice: Number(ph.newPrice),
      costUsed: ph.costUsed ? Number(ph.costUsed) : null,
      markupPercent: ph.markupPercent ? Number(ph.markupPercent) : null,
      createdAt: ph.createdAt,
    })),
  };
}

export async function createProduct(
  data: unknown,
  images?: Array<{ url: string; publicId: string; alt?: string }>
) {
  const user = await requireOwner();
  const validated = productSchema.parse(data);

  // Validate price against MRP guard (Section 5.5 and 9.4)
  if (validated.sellingPrice && validated.mrp) {
    const v = validateSellingPrice(validated.sellingPrice, null, validated.mrp);
    if (!v.isValid) {
      throw new Error(v.error);
    }
  }

  // Generate unique slug
  const baseSlug = validated.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let slug = baseSlug;
  let counter = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        slug,
        name: validated.name,
        nameTamil: validated.nameTamil,
        brand: validated.brand,
        description: validated.description,
        sizeLabel: validated.sizeLabel,
        categoryId: validated.categoryId,
        baseUnitId: validated.baseUnitId,
        sellStep: validated.sellStep,
        minQty: validated.minQty,
        maxQty: validated.maxQty,
        sellingPrice: validated.sellingPrice,
        mrp: validated.mrp,
        lowStockAt: validated.lowStockAt,
        isPublished: validated.isPublished,
        isFeatured: validated.isFeatured,
        cost: {
          create: {
            costBasis: "LATEST",
          },
        },
        images: images && images.length > 0
          ? {
              create: images.map((img, idx) => ({
                url: img.url,
                publicId: img.publicId,
                alt: img.alt || validated.name,
                sortOrder: idx,
              })),
            }
          : undefined,
      },
    });

    if (validated.sellingPrice) {
      await tx.priceHistory.create({
        data: {
          productId: p.id,
          newPrice: validated.sellingPrice,
        },
      });
    }

    return p;
  });

  await recordAuditLog({
    action: "CREATE_PRODUCT",
    entity: "Product",
    entityId: product.id,
    data: { name: product.name, createdBy: user.email },
  });

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");

  return {
    success: true,
    product: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      nameTamil: product.nameTamil,
      brand: product.brand,
      description: product.description,
      sizeLabel: product.sizeLabel,
      categoryId: product.categoryId,
      baseUnitId: product.baseUnitId,
      sellStep: Number(product.sellStep),
      minQty: Number(product.minQty),
      maxQty: Number(product.maxQty),
      sellingPrice: product.sellingPrice ? Number(product.sellingPrice) : null,
      mrp: product.mrp ? Number(product.mrp) : null,
      stockQty: Number(product.stockQty),
      lowStockAt: Number(product.lowStockAt),
      isPublished: product.isPublished,
      isFeatured: product.isFeatured,
      isArchived: product.isArchived,
    },
  };
}

export async function updateProduct(
  id: string,
  data: unknown,
  images?: Array<{ url: string; publicId: string; alt?: string }>
) {
  const user = await requireOwner();
  const validated = productSchema.parse(data);

  const existing = await prisma.product.findUnique({
    where: { id },
    include: { cost: true },
  });

  if (!existing) {
    throw new Error("Product not found.");
  }

  const costForPricing = existing.cost
    ? existing.cost.costBasis === "AVERAGE" && existing.cost.avgCost
      ? Number(existing.cost.avgCost)
      : existing.cost.lastCost
      ? Number(existing.cost.lastCost)
      : null
    : null;

  // Validate price against MRP guard
  if (validated.sellingPrice && validated.mrp) {
    const v = validateSellingPrice(validated.sellingPrice, costForPricing, validated.mrp);
    if (!v.isValid) {
      throw new Error(v.error);
    }
  }

  const priceChanged =
    (existing.sellingPrice === null &&
      validated.sellingPrice !== null &&
      validated.sellingPrice !== undefined) ||
    (existing.sellingPrice !== null &&
      validated.sellingPrice !== null &&
      validated.sellingPrice !== undefined &&
      !new Decimal(existing.sellingPrice).eq(validated.sellingPrice));

  await prisma.$transaction(async (tx) => {
    // 1. Update product fields
    await tx.product.update({
      where: { id },
      data: {
        name: validated.name,
        nameTamil: validated.nameTamil,
        brand: validated.brand,
        description: validated.description,
        sizeLabel: validated.sizeLabel,
        categoryId: validated.categoryId,
        baseUnitId: validated.baseUnitId,
        sellStep: validated.sellStep,
        minQty: validated.minQty,
        maxQty: validated.maxQty,
        sellingPrice: validated.sellingPrice,
        mrp: validated.mrp,
        lowStockAt: validated.lowStockAt,
        isPublished: validated.isPublished,
        isFeatured: validated.isFeatured,
      },
    });

    // 2. If images supplied, update images
    if (images !== undefined) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((img, idx) => ({
            productId: id,
            url: img.url,
            publicId: img.publicId,
            alt: img.alt || validated.name,
            sortOrder: idx,
          })),
        });
      }
    }

    // 3. If price changed, record price history and update pricedAtCost
    if (priceChanged && validated.sellingPrice !== null && validated.sellingPrice !== undefined) {
      let markupPercent = null;
      if (costForPricing && costForPricing > 0) {
        markupPercent = ((validated.sellingPrice - costForPricing) / costForPricing) * 100;
      }

      await tx.priceHistory.create({
        data: {
          productId: id,
          oldPrice: existing.sellingPrice,
          newPrice: validated.sellingPrice,
          costUsed: costForPricing,
          markupPercent,
        },
      });

      // Saving a price marks the product reviewed at this cost (Section 9.4)
      if (costForPricing) {
        await tx.productCost.upsert({
          where: { productId: id },
          update: { pricedAtCost: costForPricing },
          create: { productId: id, pricedAtCost: costForPricing },
        });
      }
    }
  });

  await recordAuditLog({
    action: "UPDATE_PRODUCT",
    entity: "Product",
    entityId: id,
    data: { changes: validated, priceChanged, updatedBy: user.email },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath(`/admin/pricing`);
  revalidatePath("/", "layout");

  return { success: true };
}

export async function toggleProductPublish(id: string) {
  const user = await requireOwner();

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new Error("Product not found.");

  // Guard: if no price set, cannot publish
  if (!product.isPublished && !product.sellingPrice) {
    throw new Error("Cannot publish product without setting a selling price.");
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { isPublished: !product.isPublished },
  });

  await recordAuditLog({
    action: updated.isPublished ? "PUBLISH_PRODUCT" : "UNPUBLISH_PRODUCT",
    entity: "Product",
    entityId: id,
    data: { updatedBy: user.email },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/", "layout");

  return { success: true, isPublished: updated.isPublished };
}

export async function archiveProduct(id: string) {
  const user = await requireOwner();

  const updated = await prisma.product.update({
    where: { id },
    data: { isArchived: true, isPublished: false },
  });

  await recordAuditLog({
    action: "ARCHIVE_PRODUCT",
    entity: "Product",
    entityId: id,
    data: { updatedBy: user.email },
  });

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");

  return { success: true };
}
