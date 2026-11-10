"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface CategorySortSelectProps {
  currentSort: string;
}

export function CategorySortSelect({ currentSort }: CategorySortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (newSort === "featured") {
      params.delete("sort");
    } else {
      params.set("sort", newSort);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-muted font-medium">Sort by:</span>
      <select
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-leaf"
      >
        <option value="featured">Featured First</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="name">Name: A to Z</option>
      </select>
    </div>
  );
}
