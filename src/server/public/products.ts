import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";

export interface PublicProductSummary {
  id: string;
  slug: string;
  name: string;
  nameTamil: string | null;
  brand: string | null;
  description: string | null;
  sizeLabel: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  baseUnitSymbol: string;
  baseUnitLabel: string;
  sellStep: number;
  minQty: number;
  maxQty: number;
  sellingPrice: number;
  mrp: number | null;
  savingsAmount: number | null;
  savingsPercent: number | null;
  inStock: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
}

export interface PublicProductDetail extends PublicProductSummary {
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
  }>;
  relatedProducts: PublicProductSummary[];
}

/**
 * Common explicit public product selector.
 * NEVER selects cost, suppliers, purchase history, or internal margins.
 */
const publicProductSelect = {
  id: true,
  slug: true,
  name: true,
  nameTamil: true,
  brand: true,
  description: true,
  sizeLabel: true,
  categoryId: true,
  sellStep: true,
  minQty: true,
  maxQty: true,
  sellingPrice: true,
  mrp: true,
  stockQty: true,
  isFeatured: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  baseUnit: {
    select: {
      id: true,
      symbol: true,
      label: true,
    },
  },
  images: {
    select: {
      id: true,
      url: true,
      alt: true,
      sortOrder: true,
    },
    orderBy: {
      sortOrder: "asc" as const,
    },
  },
};

function formatPublicSummary(
  p: Prisma.ProductGetPayload<{ select: typeof publicProductSelect }>
): PublicProductSummary | null {
  if (!p.sellingPrice) return null;

  const sellingPrice = p.sellingPrice.toNumber();
  const mrp = p.mrp ? p.mrp.toNumber() : null;
  let savingsAmount: number | null = null;
  let savingsPercent: number | null = null;

  if (mrp && mrp > sellingPrice) {
    savingsAmount = Math.round((mrp - sellingPrice) * 100) / 100;
    savingsPercent = Math.round(((mrp - sellingPrice) / mrp) * 100);
  }

  const inStock = p.stockQty.toNumber() > 0;
  const primaryImage = p.images[0] || null;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameTamil: p.nameTamil,
    brand: p.brand,
    description: p.description,
    sizeLabel: p.sizeLabel,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    baseUnitSymbol: p.baseUnit.symbol,
    baseUnitLabel: p.baseUnit.label,
    sellStep: p.sellStep.toNumber(),
    minQty: p.minQty.toNumber(),
    maxQty: p.maxQty.toNumber(),
    sellingPrice,
    mrp,
    savingsAmount,
    savingsPercent,
    inStock,
    isFeatured: p.isFeatured,
    imageUrl: primaryImage ? primaryImage.url : null,
    imageAlt: primaryImage ? primaryImage.alt : null,
  };
}

/**
 * Returns featured products for the storefront homepage.
 */
export async function getFeaturedProducts(limit = 8): Promise<PublicProductSummary[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        isArchived: false,
        isPublished: true,
        sellingPrice: { not: null },
        isFeatured: true,
      },
      select: publicProductSelect,
      take: limit,
      orderBy: { name: "asc" },
    });

    return products.map(formatPublicSummary).filter((p): p is PublicProductSummary => p !== null);
  } catch {
    return [];
  }
}

/**
 * Returns popular staple grocery products for the storefront homepage.
 */
export async function getStapleProducts(limit = 12): Promise<PublicProductSummary[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        isArchived: false,
        isPublished: true,
        sellingPrice: { not: null },
      },
      select: publicProductSelect,
      take: limit,
      orderBy: [{ stockQty: "desc" }, { name: "asc" }],
    });

    return products.map(formatPublicSummary).filter((p): p is PublicProductSummary => p !== null);
  } catch {
    return [];
  }
}

/**
 * Returns products in a category by category slug with sorting options.
 */
export async function getProductsByCategory(
  categorySlug: string,
  sortBy: "featured" | "price-asc" | "price-desc" | "name" = "featured"
): Promise<{
  category: { id: string; name: string; slug: string; tint: string | null; iconKey: string };
  products: PublicProductSummary[];
} | null> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      tint: true,
      iconKey: true,
    },
  });

  if (!category) return null;

  let orderBy: Prisma.ProductOrderByWithRelationInput = { name: "asc" };
  if (sortBy === "price-asc") orderBy = { sellingPrice: "asc" };
  else if (sortBy === "price-desc") orderBy = { sellingPrice: "desc" };
  else if (sortBy === "featured") orderBy = { isFeatured: "desc" };

  const products = await prisma.product.findMany({
    where: {
      categoryId: category.id,
      isArchived: false,
      isPublished: true,
      sellingPrice: { not: null },
    },
    select: publicProductSelect,
    orderBy,
  });

  const formatted = products
    .map(formatPublicSummary)
    .filter((p): p is PublicProductSummary => p !== null);

  return {
    category,
    products: formatted,
  };
}

/**
 * Returns single product details by slug, including full gallery images and related products.
 */
export async function getProductBySlug(slug: string): Promise<PublicProductDetail | null> {
  const product = await prisma.product.findUnique({
    where: {
      slug,
      isArchived: false,
      isPublished: true,
      sellingPrice: { not: null },
    },
    select: publicProductSelect,
  });

  if (!product) return null;

  const baseSummary = formatPublicSummary(product);
  if (!baseSummary) return null;

  // Fetch related products in the same category
  const relatedRaw = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      isArchived: false,
      isPublished: true,
      sellingPrice: { not: null },
    },
    select: publicProductSelect,
    take: 6,
  });

  const relatedProducts = relatedRaw
    .map(formatPublicSummary)
    .filter((p): p is PublicProductSummary => p !== null);

  return {
    ...baseSummary,
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
    })),
    relatedProducts,
  };
}

