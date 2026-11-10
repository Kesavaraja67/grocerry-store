import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "@phosphor-icons/react/dist/ssr";
import { getProductsByCategory } from "@/server/public/products";
import { getPublicCategories } from "@/server/public/categories";
import { ProductCard } from "@/components/store/ProductCard";
import { CategoryStrip } from "@/components/store/CategoryStrip";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { CategorySortSelect } from "@/components/store/CategorySortSelect";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: "featured" | "price-asc" | "price-desc" | "name" }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const data = await getProductsByCategory(slug);
  if (!data) return { title: "Category Not Found — Pandian Store" };

  return {
    title: `${data.category.name} — Pandian Store`,
    description: `Shop fresh ${data.category.name} at Pandian Store Madurai. Quality groceries delivered to your home.`,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { sort = "featured" } = await searchParams;

  const [categoryData, allCategories] = await Promise.all([
    getProductsByCategory(slug, sort),
    getPublicCategories(),
  ]);

  if (!categoryData) {
    notFound();
  }

  const { category, products } = categoryData;

  return (
    <div className="space-y-6">
      {/* Category Strip */}
      <CategoryStrip categories={allCategories} activeSlug={category.slug} />

      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Category Header Banner */}
        <div
          className="rounded-2xl p-6 sm:p-8 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ backgroundColor: category.tint || "#F5F7F4" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center shrink-0 border border-border/60">
              <CategoryIcon iconKey={category.iconKey} size={36} className="text-leaf" />
            </div>
            <div>
              <div className="text-xs text-ink-muted uppercase tracking-wider font-semibold">
                Grocery Category
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-heading">
                {category.name}
              </h1>
              <p className="text-xs text-ink-muted mt-0.5">
                {products.length} {products.length === 1 ? "product available" : "products available"}
              </p>
            </div>
          </div>

          {/* Sort selector */}
          <CategorySortSelect currentSort={sort} />
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center bg-surface">
            <Package size={48} className="mx-auto text-ink-muted mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-ink">No items in this category yet</h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto mt-1 mb-4">
              We are currently restocking this section. Check out our other grocery categories in the meantime!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-leaf hover:underline"
            >
              <ArrowLeft size={14} />
              Return to all categories
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

