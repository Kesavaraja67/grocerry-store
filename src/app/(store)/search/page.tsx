import React from "react";
import Link from "next/link";
import { MagnifyingGlass, Package, ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/server/db";
import { ProductCard } from "@/components/store/ProductCard";
import { type PublicProductSummary } from "@/server/public/products";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps) {
  const { q } = await searchParams;
  return {
    title: q ? `Search: "${q}" — Pandian Store` : "Search Groceries — Pandian Store",
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  let products: PublicProductSummary[] = [];

  if (query.length > 0) {
    const raw = await prisma.product.findMany({
      where: {
        isArchived: false,
        isPublished: true,
        sellingPrice: { not: null },
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { nameTamil: { contains: query, mode: "insensitive" } },
          { brand: { contains: query, mode: "insensitive" } },
          { category: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        nameTamil: true,
        brand: true,
        description: true,
        sizeLabel: true,
        categoryId: true,
        sellStep: true,
        minQty: true,
        maxQty: true,
        sellingPrice: true,
        mrp: true,
        stockQty: true,
        isFeatured: true,
        category: {
          select: { name: true, slug: true },
        },
        baseUnit: {
          select: { symbol: true, label: true },
        },
        images: {
          select: { url: true, alt: true },
          take: 1,
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
      take: 40,
    });

    products = raw.map((p) => {
      const sellingPrice = p.sellingPrice!.toNumber();
      const mrp = p.mrp ? p.mrp.toNumber() : null;
      let savingsAmount: number | null = null;
      let savingsPercent: number | null = null;
      if (mrp && mrp > sellingPrice) {
        savingsAmount = Math.round((mrp - sellingPrice) * 100) / 100;
        savingsPercent = Math.round(((mrp - sellingPrice) / mrp) * 100);
      }

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        nameTamil: p.nameTamil,
        brand: p.brand,
        description: p.description,
        sizeLabel: p.sizeLabel,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        categorySlug: p.category.slug,
        baseUnitSymbol: p.baseUnit.symbol,
        baseUnitLabel: p.baseUnit.label,
        sellStep: p.sellStep.toNumber(),
        minQty: p.minQty.toNumber(),
        maxQty: p.maxQty.toNumber(),
        sellingPrice,
        mrp,
        savingsAmount,
        savingsPercent,
        inStock: p.stockQty.toNumber() > 0,
        isFeatured: p.isFeatured,
        imageUrl: p.images[0]?.url || null,
        imageAlt: p.images[0]?.alt || null,
      };
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-ink">
          {query ? `Search results for "${query}"` : "Search Groceries"}
        </h1>
        <p className="text-xs text-ink-muted mt-0.5">
          {products.length} {products.length === 1 ? "product found" : "products found"}
        </p>
      </div>

      {/* Results */}
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-surface">
          <MagnifyingGlass size={48} className="mx-auto text-ink-muted mb-3 opacity-60" />
          <h2 className="text-base font-semibold text-ink">
            No grocery items match &ldquo;{query}&rdquo;
          </h2>
          <p className="text-xs text-ink-muted max-w-sm mx-auto mt-1 mb-5">
            Check your spelling or try searching with simpler terms (like &ldquo;dal&rdquo;, &ldquo;rice&rdquo;, &ldquo;oil&rdquo;, or &ldquo;பருப்பு&rdquo;).
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-leaf hover:underline"
          >
            <ArrowLeft size={14} />
            Back to home
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
  );
}

