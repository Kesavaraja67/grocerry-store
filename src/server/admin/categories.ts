"use server";

import "server-only";
import { requireOwner } from "@/server/auth";
import { prisma } from "@/server/db";
import { categorySchema } from "@/server/domain/validators";
import { recordAuditLog } from "@/server/audit";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  await requireOwner();

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: {
          products: {
            where: { isArchived: false },
          },
        },
      },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    iconKey: c.iconKey,
    tint: c.tint,
    sortOrder: c.sortOrder,
    lowMarkup: Number(c.lowMarkup),
    recommendedMarkup: Number(c.recommendedMarkup),
    highMarkup: Number(c.highMarkup),
    isActive: c.isActive,
    activeProductCount: c._count.products,
  }));
}

export async function createCategory(data: unknown) {
  const user = await requireOwner();
  const validated = categorySchema.parse(data);

  // Generate unique slug
  const baseSlug = validated.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let slug = baseSlug;
  let counter = 1;
  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const highest = await prisma.category.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (highest?.sortOrder ?? 0) + 1;

  const category = await prisma.category.create({
    data: {
      name: validated.name,
      slug,
      iconKey: validated.iconKey,
      tint: validated.tint || "#EBF2ED",
      sortOrder,
      lowMarkup: validated.lowMarkup,
      recommendedMarkup: validated.recommendedMarkup,
      highMarkup: validated.highMarkup,
      isActive: true,
    },
  });

  await recordAuditLog({
    action: "CREATE_CATEGORY",
    entity: "Category",
    entityId: category.id,
    data: { name: category.name, createdBy: user.email },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");

  return { success: true, category };
}

export async function updateCategory(id: string, data: unknown) {
  const user = await requireOwner();
  const validated = categorySchema.parse(data);

  const updated = await prisma.category.update({
    where: { id },
    data: {
      name: validated.name,
      iconKey: validated.iconKey,
      tint: validated.tint || "#EBF2ED",
      lowMarkup: validated.lowMarkup,
      recommendedMarkup: validated.recommendedMarkup,
      highMarkup: validated.highMarkup,
    },
  });

  await recordAuditLog({
    action: "UPDATE_CATEGORY",
    entity: "Category",
    entityId: id,
    data: { changes: validated, updatedBy: user.email },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");

  return { success: true, category: updated };
}

export async function toggleCategoryStatus(id: string) {
  const user = await requireOwner();

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: { where: { isArchived: false } },
        },
      },
    },
  });

  if (!category) {
    throw new Error("Category not found.");
  }

  // Guard per Section 10: Cannot archive a category that still has active products
  if (category.isActive && category._count.products > 0) {
    throw new Error(
      `Cannot deactivate "${category.name}" because it still has ${category._count.products} active ${
        category._count.products === 1 ? "product" : "products"
      }. Move or archive them first.`
    );
  }

  const updated = await prisma.category.update({
    where: { id },
    data: { isActive: !category.isActive },
  });

  await recordAuditLog({
    action: updated.isActive ? "ACTIVATE_CATEGORY" : "DEACTIVATE_CATEGORY",
    entity: "Category",
    entityId: id,
    data: { updatedBy: user.email },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");

  return { success: true, isActive: updated.isActive };
}

export async function reorderCategory(id: string, direction: "up" | "down") {
  await requireOwner();

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) throw new Error("Category not found.");

  const all = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const currentIndex = all.findIndex((c) => c.id === id);
  if (currentIndex === -1) return { success: false };

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= all.length) {
    return { success: false }; // Already at edge
  }

  const other = all[targetIndex];

  // Swap sortOrder
  await prisma.$transaction([
    prisma.category.update({
      where: { id: current.id },
      data: { sortOrder: other.sortOrder },
    }),
    prisma.category.update({
      where: { id: other.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");

  return { success: true };
}

