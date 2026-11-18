"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  Package,
  CaretRight,
  Plus,
} from "@phosphor-icons/react";
import { MicButton } from "@/components/admin/MicButton";
import { rankMatches } from "@/server/domain/matching";
import { copy } from "@/lib/copy";
import { useLang } from "@/context/LanguageContext";

interface ItemData {
  id: string;
  name: string;
  nameTamil: string | null;
  brand: string | null;
  stockQty: number;
  lowStockAt: number;
  sellingPrice: number | null;
  mrp: number | null;
  thumbnailUrl: string | null;
  baseUnit: {
    symbol: string;
    label: string;
  };
  category: {
    name: string;
    tint: string | null;
  };
  needsReview?: boolean;
}

interface ItemsListProps {
  initialItems: ItemData[];
  initialFilter?: string;
  initialQuery?: string;
}

type FilterType = "ALL" | "LOW" | "OUT" | "NEEDS_PRICE";

export function ItemsList({
  initialItems,
  initialFilter = "ALL",
  initialQuery = "",
}: ItemsListProps) {
  const { mode } = useLang();
  const [search, setSearch] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<FilterType>(() => {
    if (initialFilter === "low") return "LOW";
    if (initialFilter === "out") return "OUT";
    if (initialFilter === "needs_price") return "NEEDS_PRICE";
    return "ALL";
  });

  const filteredItems = useMemo(() => {
    let list = initialItems;

    // 1. Search filter with phonetic rank matching
    if (search.trim()) {
      list = rankMatches(search, initialItems);
    }

    // 2. Chip filter
    return list.filter((item) => {
      if (activeFilter === "LOW") {
        return item.stockQty > 0 && item.stockQty <= item.lowStockAt;
      }
      if (activeFilter === "OUT") {
        return item.stockQty <= 0;
      }
      if (activeFilter === "NEEDS_PRICE") {
        return item.sellingPrice === null || item.sellingPrice <= 0 || item.needsReview;
      }
      return true;
    });
  }, [initialItems, search, activeFilter]);

  const counts = useMemo(() => {
    let low = 0;
    let out = 0;
    let needsPrice = 0;
    for (const item of initialItems) {
      if (item.stockQty > 0 && item.stockQty <= item.lowStockAt) low++;
      if (item.stockQty <= 0) out++;
      if (item.sellingPrice === null || item.sellingPrice <= 0 || item.needsReview) needsPrice++;
    }
    return { all: initialItems.length, low, out, needsPrice };
  }, [initialItems]);

  const filterChips: Array<{ id: FilterType; labelEn: string; labelTa: string; count: number }> = [
    { id: "ALL", labelEn: copy.admin.items.filterAll.en, labelTa: copy.admin.items.filterAll.ta, count: counts.all },
    { id: "LOW", labelEn: copy.admin.items.filterLow.en, labelTa: copy.admin.items.filterLow.ta, count: counts.low },
    { id: "OUT", labelEn: copy.admin.items.filterOut.en, labelTa: copy.admin.items.filterOut.ta, count: counts.out },
    { id: "NEEDS_PRICE", labelEn: copy.admin.items.filterNeedsPrice.en, labelTa: copy.admin.items.filterNeedsPrice.ta, count: counts.needsPrice },
  ];

  return (
    <div className="space-y-4">
      {/* Top search & Add Item button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.admin.items.searchPlaceholder.en}
            className="w-full h-12 pl-10 pr-10 rounded-xl bg-surface border border-border text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-leaf focus:border-leaf transition-all shadow-xs"
          />
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-3.5 text-muted pointer-events-none"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <MicButton onResult={(text) => setSearch(text)} />
          </div>
        </div>

        <Link
          href="/admin/buy"
          className="inline-flex items-center gap-1.5 h-12 px-3.5 rounded-xl bg-turmeric text-ink font-bold text-xs hover:bg-turmeric-hover shadow-xs shrink-0 min-h-[44px]"
        >
          <Plus size={16} weight="bold" />
          <span className="hidden sm:inline">Add via Buy</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveFilter(chip.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[40px] transition-all shrink-0 ${
                isActive
                  ? "bg-leaf text-white shadow-xs"
                  : "bg-surface text-ink border border-border hover:bg-leaf-light hover:text-leaf"
              }`}
            >
              <span>{mode === "ta" ? chip.labelTa : chip.labelEn}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? "bg-white/20 text-white" : "bg-page text-muted"
                }`}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items List */}
      <div className="bg-surface border border-border rounded-2xl divide-y divide-border/70 overflow-hidden shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Package size={36} weight="light" className="mx-auto text-muted mb-2" />
            <p className="text-sm font-semibold text-ink">No items found</p>
            <p className="text-xs text-muted mt-1">
              {search
                ? `No items matching "${search}". Try checking the spelling.`
                : copy.admin.items.emptyState.en}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isOut = item.stockQty <= 0;
            const isLow = !isOut && item.stockQty <= item.lowStockAt;
            const unit = item.baseUnit.symbol;

            return (
              <Link
                key={item.id}
                href={`/admin/items/${item.id}`}
                className="flex items-center justify-between p-3.5 hover:bg-page/50 transition-colors group min-h-[64px]"
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  {/* Photo or tile */}
                  <div
                    className="w-12 h-12 rounded-xl bg-page border border-border flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ backgroundColor: item.category.tint || undefined }}
                  >
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={22} className="text-leaf" />
                    )}
                  </div>

                  {/* Name and Tamil name */}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-ink truncate group-hover:text-leaf">
                      {item.name}
                    </p>
                    {item.nameTamil && (
                      <p className="text-xs text-muted font-tamil truncate leading-tight">
                        {item.nameTamil}
                      </p>
                    )}
                    {/* Stock badge */}
                    <p
                      className={`text-[11px] font-medium mt-0.5 ${
                        isOut
                          ? "text-red-600 font-bold"
                          : isLow
                          ? "text-amber-700 font-bold"
                          : "text-muted"
                      }`}
                    >
                      {isOut
                        ? "Out of stock"
                        : `${item.stockQty} ${unit} in stock`}
                    </p>
                  </div>
                </div>

                {/* Selling Price & Caret */}
                <div className="flex items-center gap-2.5 shrink-0 text-right">
                  <div>
                    {item.sellingPrice ? (
                      <p className="text-base font-bold font-mono text-ink">
                        ₹{item.sellingPrice}
                        <span className="text-xs font-normal text-muted font-sans">
                          /{unit}
                        </span>
                      </p>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Needs price
                      </span>
                    )}
                    {item.mrp && item.sellingPrice && item.mrp > item.sellingPrice && (
                      <p className="text-[10px] text-muted line-through font-mono">
                        MRP ₹{item.mrp}
                      </p>
                    )}
                  </div>
                  <CaretRight
                    size={16}
                    className="text-muted group-hover:text-ink transition-transform group-hover:translate-x-0.5"
                  />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
