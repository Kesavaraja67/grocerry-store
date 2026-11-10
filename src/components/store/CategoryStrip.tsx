"use client";

import Link from "next/link";
import { CategoryIcon } from "@/components/shared/CategoryIcon";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  iconKey: string;
  tint: string | null;
}

interface Props {
  categories: CategoryItem[];
  activeSlug?: string;
}

export function CategoryStrip({ categories, activeSlug }: Props) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="bg-surface border-b border-border shadow-xs overflow-x-auto no-scrollbar py-2.5 px-4">
      <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3 min-w-max">
        <Link
          href="/"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            !activeSlug
              ? "bg-leaf text-white"
              : "bg-page text-ink hover:bg-page/80 border border-border/80"
          }`}
        >
          <span>All Items</span>
        </Link>

        {categories.map((c) => {
          const isActive = activeSlug === c.slug;
          return (
            <Link
              key={c.id}
              href={`/c/${c.slug}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-leaf text-white"
                  : "bg-page text-ink hover:bg-page/80 border border-border/80"
              }`}
            >
              <CategoryIcon
                iconKey={c.iconKey}
                size={15}
                className={isActive ? "text-turmeric" : "text-leaf"}
              />
              <span>{c.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

