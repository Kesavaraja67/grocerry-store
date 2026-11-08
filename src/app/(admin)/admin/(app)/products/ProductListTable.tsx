"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Tag,
  PencilSimple,
  Archive,
  ArrowRight,
} from "@phosphor-icons/react";
import { toggleProductPublish, archiveProduct } from "@/server/admin/products";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/format";

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  nameTamil: string | null;
  brand: string | null;
  sizeLabel: string | null;
  category: { id: string; name: string; tint: string | null };
  baseUnit: { id: string; symbol: string; label: string };
  stockQty: number;
  lowStockAt: number;
  sellingPrice: number | null;
  mrp: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  thumbnailUrl: string | null;
  costForPricing: number | null;
  marginPercent: number | null;
  markupPercent: number | null;
  profitPerUnit: number | null;
  needsReview: boolean;
  isBelowCost: boolean;
  isAboveMRP: boolean;
}

interface ProductListTableProps {
  initialProducts: ProductRow[];
  categories: Array<{ id: string; name: string }>;
  initialSearch: string;
  initialCategory: string;
  initialStockFilter: "ALL" | "LOW" | "OUT";
}

export function ProductListTable({
  initialProducts,
  categories,
  initialSearch,
  initialCategory,
  initialStockFilter,
}: ProductListTableProps) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [stockFilter, setStockFilter] = useState(initialStockFilter);

  const applyFilters = (newCat: string, newStock: string) => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (newCat && newCat !== "ALL") params.set("categoryId", newCat);
    if (newStock && newStock !== "ALL") params.set("stock", newStock);
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(selectedCategory, stockFilter);
  };

  const handleTogglePublish = async (p: ProductRow) => {
    try {
      const res = await toggleProductPublish(p.id);
      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, isPublished: res.isPublished } : item
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle publish status.");
    }
  };

  const handleArchive = async (p: ProductRow) => {
    if (!confirm(`Are you sure you want to archive "${p.name}"? It will be removed from storefront and catalogs.`)) return;

    try {
      await archiveProduct(p.id);
      setProducts((prev) => prev.filter((item) => item.id !== p.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to archive product.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-surface p-3.5 sm:p-4 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, Tamil name, or brand..."
            className="pl-9 h-10 text-xs sm:text-sm"
          />
          <MagnifyingGlass size={16} className="absolute left-3 top-3 text-muted pointer-events-none" />
        </form>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Category Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={selectedCategory || "ALL"}
              onValueChange={(val) => {
                setSelectedCategory(val);
                applyFilters(val, stockFilter);
              }}
            >
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock Filter */}
          <div className="w-full sm:w-36">
            <Select
              value={stockFilter}
              onValueChange={(val: "ALL" | "LOW" | "OUT") => {
                setStockFilter(val);
                applyFilters(selectedCategory, val);
              }}
            >
              <SelectTrigger className="h-10 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All stock</SelectItem>
                <SelectItem value="LOW">Low stock (≤ 5)</SelectItem>
                <SelectItem value="OUT">Out of stock (0)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products Table (Desktop) / Cards (Mobile) */}
      {products.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold text-ink">No products found</p>
          <p className="text-xs text-muted mt-1">
            Try adjusting your search or filters, or add a new product.
          </p>
          <Link href="/admin/products/new">
            <Button variant="turmeric" className="mt-4">
              Add new product
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="border-b border-border bg-page">
                <tr className="text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  <th className="p-3.5 pl-4">Product</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-right">Stock</th>
                  <th className="p-3.5 text-right">Selling price</th>
                  <th className="p-3.5 text-right">Margin</th>
                  <th className="p-3.5 text-center">Store</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => {
                  const stock = p.stockQty;
                  const isLow = stock > 0 && stock <= p.lowStockAt;
                  const isOut = stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-page/50 transition-colors">
                      {/* Product Name & Thumbnail */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-md shrink-0 border border-border flex items-center justify-center overflow-hidden"
                            style={{ backgroundColor: p.category.tint || "#EBF2ED" }}
                          >
                            {p.thumbnailUrl ? (
                              <Image
                                src={p.thumbnailUrl}
                                alt={p.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <CategoryIcon iconKey={p.category.name.toLowerCase()} size={20} className="text-leaf" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/admin/products/${p.id}`}
                                className="font-bold text-sm text-ink hover:text-leaf hover:underline truncate"
                              >
                                {p.name}
                              </Link>
                              {p.needsReview && (
                                <Badge variant="turmeric" className="gap-1 text-[10px] px-1.5 py-0 h-4">
                                  <Tag size={10} weight="fill" />
                                  <span>Review</span>
                                </Badge>
                              )}
                            </div>
                            {p.nameTamil && (
                              <p className="text-xs text-muted font-tamil truncate">
                                {p.nameTamil}
                              </p>
                            )}
                            {p.sizeLabel && (
                              <p className="text-[11px] text-muted truncate">{p.sizeLabel}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 text-xs text-muted font-medium">
                        {p.category.name}
                      </td>

                      {/* Stock */}
                      <td className="p-3.5 text-right tabular-nums">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isOut
                              ? "bg-red-light text-red"
                              : isLow
                              ? "bg-amber-100 text-amber-800"
                              : "bg-leaf-light text-leaf"
                          }`}
                        >
                          {stock} {p.baseUnit.symbol}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="p-3.5 text-right tabular-nums font-bold text-base text-ink">
                        {p.sellingPrice ? (
                          <>
                            {formatINR(p.sellingPrice)}
                            <span className="text-xs font-normal text-muted ml-0.5">
                              /{p.baseUnit.symbol}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted font-normal italic">Not set</span>
                        )}
                      </td>

                      {/* Margin % (Privacy-maskable) */}
                      <td className="p-3.5 text-right tabular-nums privacy-figure">
                        {p.marginPercent !== null ? (
                          <span
                            className={`font-semibold text-xs ${
                              p.isBelowCost ? "text-red" : "text-emerald-700"
                            }`}
                          >
                            {p.marginPercent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>

                      {/* Published Toggle */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={p.isPublished}
                            onCheckedChange={() => handleTogglePublish(p)}
                            title={p.isPublished ? "Published on storefront" : "Draft / Hidden"}
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/products/${p.id}/edit`}>
                            <Button variant="ghost" size="iconSm" title="Edit product">
                              <PencilSimple size={16} />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            onClick={() => handleArchive(p)}
                            title="Archive product"
                            className="text-muted hover:text-red"
                          >
                            <Archive size={16} />
                          </Button>
                          <Link href={`/admin/products/${p.id}`}>
                            <Button variant="ghost" size="iconSm" title="View details">
                              <ArrowRight size={16} />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (Section 10 responsive rule) */}
          <div className="lg:hidden divide-y divide-border">
            {products.map((p) => {
              const stock = p.stockQty;
              const isLow = stock > 0 && stock <= p.lowStockAt;
              const isOut = stock <= 0;

              return (
                <div key={p.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-md shrink-0 border border-border flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: p.category.tint || "#EBF2ED" }}
                      >
                        {p.thumbnailUrl ? (
                          <Image
                            src={p.thumbnailUrl}
                            alt={p.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <CategoryIcon iconKey={p.category.name.toLowerCase()} size={20} className="text-leaf" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-bold text-sm text-ink hover:text-leaf hover:underline line-clamp-1"
                        >
                          {p.name}
                        </Link>
                        {p.nameTamil && (
                          <p className="text-xs text-muted font-tamil truncate">{p.nameTamil}</p>
                        )}
                        <p className="text-[11px] text-muted">
                          {p.category.name} {p.sizeLabel && `· ${p.sizeLabel}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-ink tabular-nums">
                        {p.sellingPrice ? formatINR(p.sellingPrice) : "Not priced"}
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${
                          isOut
                            ? "bg-red-light text-red"
                            : isLow
                            ? "bg-amber-100 text-amber-800"
                            : "bg-leaf-light text-leaf"
                        }`}
                      >
                        {stock} {p.baseUnit.symbol}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-muted cursor-pointer">
                        <Checkbox
                          checked={p.isPublished}
                          onCheckedChange={() => handleTogglePublish(p)}
                        />
                        <span className="text-[11px]">Storefront</span>
                      </label>
                      {p.needsReview && (
                        <Badge variant="turmeric" className="text-[10px]">
                          Price review
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Link href={`/admin/products/${p.id}/edit`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs px-2.5">
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/admin/products/${p.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs px-2 text-leaf font-semibold">
                          History
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
