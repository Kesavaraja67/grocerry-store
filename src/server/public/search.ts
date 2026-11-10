import { prisma } from "@/server/db";

export interface SearchSuggestionItem {
  id: string;
  slug: string;
  name: string;
  nameTamil: string | null;
  brand: string | null;
  sizeLabel: string | null;
  sellingPrice: number;
  categoryName: string;
  imageUrl: string | null;
}

export interface SearchSuggestionsResult {
  products: SearchSuggestionItem[];
  matchingCategories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

/**
 * Searches published products by English name, Tamil name, brand, or category.
 * Used by the global search bar and live suggestion dropdown.
 */
export async function getSearchSuggestions(query: string): Promise<SearchSuggestionsResult> {
  const q = query.trim();
  if (q.length < 2) {
    return { products: [], matchingCategories: [] };
  }

  const [products, matchingCategories] = await Promise.all([
    prisma.product.findMany({
      where: {
        isArchived: false,
        isPublished: true,
        sellingPrice: { not: null },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { nameTamil: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { category: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        nameTamil: true,
        brand: true,
        sizeLabel: true,
        sellingPrice: true,
        category: {
          select: { name: true },
        },
        images: {
          select: { url: true },
          take: 1,
          orderBy: { sortOrder: "asc" },
        },
      },
      take: 8,
    }),
    prisma.category.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      take: 3,
    }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameTamil: p.nameTamil,
      brand: p.brand,
      sizeLabel: p.sizeLabel,
      sellingPrice: p.sellingPrice ? p.sellingPrice.toNumber() : 0,
      categoryName: p.category.name,
      imageUrl: p.images[0]?.url || null,
    })),
    matchingCategories,
  };
}

