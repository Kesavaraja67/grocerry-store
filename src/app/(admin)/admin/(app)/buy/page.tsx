import React from "react";
import { getSuppliers } from "@/server/admin/suppliers";
import { getProducts } from "@/server/admin/products";
import { getUnits } from "@/server/admin/units";
import { getCategories } from "@/server/admin/categories";
import { BuyFlow } from "./BuyFlow";

export const dynamic = "force-dynamic";

interface BuyPageProps {
  searchParams: Promise<{
    shopId?: string;
  }>;
}

export default async function BuyPage({ searchParams }: BuyPageProps) {
  const resolvedParams = await searchParams;

  const [suppliers, products, units, categories] = await Promise.all([
    getSuppliers(),
    getProducts(),
    getUnits(),
    getCategories(),
  ]);

  const simpleUnits = units.map((u) => ({
    id: u.id,
    code: u.code,
    label: u.label,
    symbol: u.symbol,
    dimension: u.dimension,
    factorToBase: u.factorToBase ? Number(u.factorToBase) : null,
    isBaseable: u.isBaseable,
  }));

  const simpleProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    nameTamil: p.nameTamil,
    categoryId: p.category.id,
    baseUnitId: p.baseUnit.id,
    baseUnit: {
      id: p.baseUnit.id,
      symbol: p.baseUnit.symbol,
      label: p.baseUnit.label,
      dimension: p.baseUnit.dimension,
    },
    mrp: p.mrp,
    sellingPrice: p.sellingPrice,
    cost: p.costForPricing ? { lastCost: p.costForPricing } : null,
  }));

  const simpleCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    tint: c.tint,
  }));

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-heading">
          Record a purchase
        </h1>
        <p className="text-xs text-muted">
          Add wholesale goods bought for your shop to update stock and cost prices.
        </p>
      </div>

      <BuyFlow
        initialSuppliers={suppliers}
        initialProducts={simpleProducts}
        units={simpleUnits}
        categories={simpleCategories}
        initialShopId={resolvedParams.shopId}
      />
    </div>
  );
}

