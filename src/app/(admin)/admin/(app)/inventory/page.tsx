import { getInventory } from "@/server/admin/inventory";
import { getCategories } from "@/server/admin/categories";
import { InventoryManager } from "./InventoryManager";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    stockFilter?: "ALL" | "LOW" | "OUT";
    page?: string;
  }>;
}

export const metadata = {
  title: "Stock & Inventory — Pandian Store Admin",
};

export default async function InventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const [inventoryData, categories] = await Promise.all([
    getInventory({
      search: params.search,
      categoryId: params.categoryId,
      stockFilter: params.stockFilter,
      page,
      limit: 25,
    }),
    getCategories(),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <InventoryManager
        summary={inventoryData.summary}
        items={inventoryData.items}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        pagination={inventoryData.pagination}
        currentFilters={{
          search: params.search,
          categoryId: params.categoryId,
          stockFilter: params.stockFilter,
        }}
      />
    </div>
  );
}

