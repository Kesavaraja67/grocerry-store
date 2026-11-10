import { prisma } from "@/server/db";

export interface PublicCategoryItem {
  id: string;
  name: string;
  slug: string;
  iconKey: string;
  tint: string | null;
  productCount: number;
}

/**
 * Returns all active categories with counts of published and in-stock products.
 */
export async function getPublicCategories(): Promise<PublicCategoryItem[]> {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        iconKey: true,
        tint: true,
        _count: {
          select: {
            products: {
              where: {
                isArchived: false,
                isPublished: true,
                sellingPrice: { not: null },
              },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      iconKey: c.iconKey,
      tint: c.tint,
      productCount: c._count.products,
    }));
  } catch {
    return [];
  }
}

