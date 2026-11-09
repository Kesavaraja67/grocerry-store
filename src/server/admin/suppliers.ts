"use server";

import "server-only";
import { requireOwner } from "@/server/auth";
import { prisma } from "@/server/db";
import { supplierSchema } from "@/server/domain/validators";
import { recordAuditLog } from "@/server/audit";
import { revalidatePath } from "next/cache";

export async function getSuppliers(search?: string, includeArchived = false) {
  await requireOwner();

  const whereClause: Record<string, unknown> = {};
  if (!includeArchived) {
    whereClause.isArchived = false;
  }
  if (search && search.trim()) {
    whereClause.name = {
      contains: search.trim(),
      mode: "insensitive",
    };
  }

  const suppliers = await prisma.supplier.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          purchases: {
            where: { status: "ACTIVE" },
          },
        },
      },
      purchases: {
        where: { status: "ACTIVE" },
        select: {
          total: true,
          purchaseDate: true,
        },
      },
    },
  });

  return suppliers.map((s) => {
    const totalSpent = s.purchases.reduce(
      (sum, p) => sum + Number(p.total),
      0
    );
    const lastPurchaseDate =
      s.purchases.length > 0
        ? s.purchases.sort(
            (a, b) =>
              new Date(b.purchaseDate).getTime() -
              new Date(a.purchaseDate).getTime()
          )[0].purchaseDate
        : null;

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      area: s.area,
      address: s.address,
      notes: s.notes,
      isArchived: s.isArchived,
      createdAt: s.createdAt,
      purchaseCount: s._count.purchases,
      totalSpent,
      lastPurchaseDate,
    };
  });
}

export async function getSupplierProfile(supplierId: string) {
  await requireOwner();

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      purchases: {
        orderBy: { purchaseDate: "desc" },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  nameTamil: true,
                  sellingPrice: true,
                  baseUnit: { select: { symbol: true, label: true } },
                },
              },
              unit: { select: { symbol: true, label: true } },
            },
          },
        },
      },
    },
  });

  if (!supplier) {
    throw new Error("Wholesale store not found.");
  }

  // Calculate summary metrics
  const activePurchases = supplier.purchases.filter((p) => p.status === "ACTIVE");
  const totalSpent = activePurchases.reduce((sum, p) => sum + Number(p.total), 0);

  // Aggregate distinct products bought from this wholesale store
  // Required by Section 10: what, how much, when, at what price, and what he can sell it for
  const productMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      productNameTamil: string | null;
      unitSymbol: string;
      currentSellingPrice: number | null;
      timesBought: number;
      lastPrice: number;
      lowestPrice: number;
      lastDate: Date;
      lastQuantity: number;
    }
  >();

  for (const purchase of activePurchases) {
    for (const item of purchase.items) {
      const pid = item.productId;
      const unitCost = Number(item.unitCost);
      const baseQty = Number(item.baseQty);
      const sellingPrice = item.product.sellingPrice ? Number(item.product.sellingPrice) : null;

      const existing = productMap.get(pid);
      if (!existing) {
        productMap.set(pid, {
          productId: pid,
          productName: item.product.name,
          productNameTamil: item.product.nameTamil,
          unitSymbol: item.product.baseUnit.symbol,
          currentSellingPrice: sellingPrice,
          timesBought: 1,
          lastPrice: unitCost,
          lowestPrice: unitCost,
          lastDate: purchase.purchaseDate,
          lastQuantity: baseQty,
        });
      } else {
        existing.timesBought += 1;
        if (unitCost < existing.lowestPrice) {
          existing.lowestPrice = unitCost;
        }
        // Because purchases are sorted descending by purchaseDate, first occurrence is the latest
      }
    }
  }

  const productsBought = Array.from(productMap.values()).sort((a, b) =>
    a.productName.localeCompare(b.productName)
  );

  const formattedPurchases = supplier.purchases.map((p) => ({
    id: p.id,
    purchaseDate: p.purchaseDate,
    invoiceNo: p.invoiceNo,
    subtotal: Number(p.subtotal),
    extraCharges: Number(p.extraCharges),
    total: Number(p.total),
    notes: p.notes,
    status: p.status,
    voidedAt: p.voidedAt,
    itemCount: p.items.length,
    items: p.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      productNameTamil: i.product.nameTamil,
      quantity: Number(i.quantity),
      unitSymbol: i.unit.symbol,
      baseQty: Number(i.baseQty),
      baseUnitSymbol: i.product.baseUnit.symbol,
      lineAmount: Number(i.lineAmount),
      unitCost: Number(i.unitCost),
      currentSellingPrice: i.product.sellingPrice ? Number(i.product.sellingPrice) : null,
    })),
  }));

  return {
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone,
    area: supplier.area,
    address: supplier.address,
    notes: supplier.notes,
    isArchived: supplier.isArchived,
    createdAt: supplier.createdAt,
    summary: {
      purchaseCount: activePurchases.length,
      distinctProductsCount: productsBought.length,
      totalSpent,
    },
    purchases: formattedPurchases,
    productsBought,
  };
}

export async function createSupplier(data: unknown) {
  const user = await requireOwner();
  const validated = supplierSchema.parse(data);

  const supplier = await prisma.supplier.create({
    data: {
      name: validated.name,
      phone: validated.phone,
      area: validated.area,
      address: validated.address,
      notes: validated.notes,
      isArchived: false,
    },
  });

  await recordAuditLog({
    action: "CREATE_SUPPLIER",
    entity: "Supplier",
    entityId: supplier.id,
    data: { name: supplier.name, createdBy: user.email },
  });

  revalidatePath("/admin/suppliers");

  return { success: true, supplier };
}

export async function updateSupplier(id: string, data: unknown) {
  const user = await requireOwner();
  const validated = supplierSchema.parse(data);

  const updated = await prisma.supplier.update({
    where: { id },
    data: {
      name: validated.name,
      phone: validated.phone,
      area: validated.area,
      address: validated.address,
      notes: validated.notes,
    },
  });

  await recordAuditLog({
    action: "UPDATE_SUPPLIER",
    entity: "Supplier",
    entityId: id,
    data: { changes: validated, updatedBy: user.email },
  });

  revalidatePath("/admin/suppliers");
  revalidatePath(`/admin/suppliers/${id}`);

  return { success: true, supplier: updated };
}

export async function toggleArchiveSupplier(id: string) {
  const user = await requireOwner();

  const supplier = await prisma.supplier.findUnique({
    where: { id },
  });
  if (!supplier) throw new Error("Supplier not found.");

  const updated = await prisma.supplier.update({
    where: { id },
    data: { isArchived: !supplier.isArchived },
  });

  await recordAuditLog({
    action: updated.isArchived ? "ARCHIVE_SUPPLIER" : "UNARCHIVE_SUPPLIER",
    entity: "Supplier",
    entityId: id,
    data: { updatedBy: user.email },
  });

  revalidatePath("/admin/suppliers");
  revalidatePath(`/admin/suppliers/${id}`);

  return { success: true, isArchived: updated.isArchived };
}

