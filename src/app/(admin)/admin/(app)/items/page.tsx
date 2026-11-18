import React from "react";
import { getProducts } from "@/server/admin/products";
import { ItemsList } from "./ItemsList";

export const dynamic = "force-dynamic";

interface ItemsPageProps {
  searchParams: Promise<{
    q?: string;
    filter?: string;
  }>;
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const resolvedParams = await searchParams;
  const products = await getProducts();

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-heading">
          Items
        </h1>
        <p className="text-xs text-muted">
          Check stock levels, update selling prices, and view item details.
        </p>
      </div>

      <ItemsList
        initialItems={products}
        initialFilter={resolvedParams.filter}
        initialQuery={resolvedParams.q}
      />
    </div>
  );
}

