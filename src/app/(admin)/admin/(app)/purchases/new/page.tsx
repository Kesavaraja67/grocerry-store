import { prisma } from "@/server/db";
import { requireOwner } from "@/server/auth";
import { getSuppliers } from "@/server/admin/suppliers";
import { getUnits } from "@/server/admin/units";
import { getCategories } from "@/server/admin/categories";
import { getPurchaseById } from "@/server/admin/purchases";
import { PurchaseForm } from "../PurchaseForm";

interface PageProps {
  searchParams: Promise<{ correctId?: string }>;
}

export const metadata = {
  title: "Record Wholesale Purchase — Pandian Store Admin",
};

export default async function NewPurchasePage({ searchParams }: PageProps) {
  await requireOwner();
  const { correctId } = await searchParams;

  const [suppliers, rawProducts, units, categories, correctPurchase] = await Promise.all([
    getSuppliers(),
    prisma.product.findMany({
      where: { isArchived: false },
      include: {
        baseUnit: true,
        cost: true,
      },
      orderBy: { name: "asc" },
    }),
    getUnits(),
    getCategories(),
    correctId ? getPurchaseById(correctId) : null,
  ]);

  const products = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    nameTamil: p.nameTamil,
    brand: p.brand,
    categoryId: p.categoryId,
    baseUnitId: p.baseUnitId,
    baseUnit: {
      id: p.baseUnit.id,
      symbol: p.baseUnit.symbol,
      label: p.baseUnit.label,
      dimension: p.baseUnit.dimension,
    },
    lastCost: p.cost
      ? (p.cost.costBasis === "AVERAGE"
          ? p.cost.avgCost?.toNumber() ?? p.cost.lastCost?.toNumber()
          : p.cost.lastCost?.toNumber() ?? p.cost.avgCost?.toNumber()) ?? null
      : null,
    sellingPrice: p.sellingPrice ? p.sellingPrice.toNumber() : null,
    mrp: p.mrp ? p.mrp.toNumber() : null,
  }));

  const correctPurchaseData = correctPurchase
    ? {
        id: correctPurchase.id,
        supplierId: correctPurchase.supplierId,
        invoiceNo: correctPurchase.invoiceNo,
        purchaseDate: correctPurchase.purchaseDate,
        extraCharges: correctPurchase.extraCharges,
        notes: correctPurchase.notes,
        items: correctPurchase.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitId: i.unitId,
          unitsPerPack: i.unitsPerPack,
          lineAmount: i.lineAmount,
        })),
      }
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <PurchaseForm
        suppliers={suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          area: s.area,
          phone: s.phone,
        }))}
        products={products}
        units={units.map((u) => ({
          id: u.id,
          code: u.code,
          label: u.label,
          symbol: u.symbol,
          dimension: u.dimension,
          factorToBase: u.factorToBase,
          isBaseable: u.isBaseable,
        }))}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          lowMarkup: c.lowMarkup,
          recommendedMarkup: c.recommendedMarkup,
          highMarkup: c.highMarkup,
        }))}
        correctPurchaseData={correctPurchaseData}
      />
    </div>
  );
}
