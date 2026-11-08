import React from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getCategories } from "@/server/admin/categories";
import { getBaseUnits } from "@/server/admin/units";
import { ProductForm } from "../ProductForm";

export default async function AdminNewProductPage() {
  const [categories, baseUnits] = await Promise.all([
    getCategories(),
    getBaseUnits(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink font-medium"
        >
          <ArrowLeft size={16} />
          <span>Back to products</span>
        </Link>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
          Add new product
        </h1>
        <p className="text-xs text-muted">
          Add an item to your grocery catalog, define its units, and set selling prices.
        </p>
      </div>

      <ProductForm categories={categories} baseUnits={baseUnits} />
    </div>
  );
}
