import { getPricingProducts } from "@/server/admin/pricing";
import { getCategories } from "@/server/admin/categories";
import { PricingManager } from "./PricingManager";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    status?: "ALL" | "REVIEW" | "LOSS" | "NO_PRICE";
  }>;
}

export const metadata = {
  title: "Selling Prices & Markup — Pandian Store Admin",
};

export default async function PricingPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const [products, categories] = await Promise.all([
    getPricingProducts({
      search: params.search,
      categoryId: params.categoryId,
      status: params.status,
    }),
    getCategories(),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PricingManager
        products={products}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        currentFilters={{
          search: params.search,
          categoryId: params.categoryId,
          status: params.status,
        }}
      />
    </div>
  );
}

