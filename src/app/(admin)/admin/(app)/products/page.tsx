import React from "react";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { getProducts } from "@/server/admin/products";
import { getCategories } from "@/server/admin/categories";
import { Button } from "@/components/ui/button";
import { ProductListTable } from "./ProductListTable";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; stock?: "ALL" | "LOW" | "OUT" }>;
}) {
  const { q, categoryId, stock } = await searchParams;

  const [products, categories] = await Promise.all([
    getProducts({
      search: q,
      categoryId,
      stockFilter: stock,
    }),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Products & Inventory
          </h1>
          <p className="text-xs text-muted">
            Manage your grocery catalog, stock levels, selling prices, and storefront visibility.
          </p>
        </div>

        <Link href="/admin/products/new">
          <Button variant="turmeric" className="gap-1.5 font-semibold">
            <Plus size={18} weight="bold" />
            <span>Add product</span>
          </Button>
        </Link>
      </div>

      <ProductListTable
        initialProducts={products}
        categories={categories}
        initialSearch={q || ""}
        initialCategory={categoryId || ""}
        initialStockFilter={stock || "ALL"}
      />
    </div>
  );
}

