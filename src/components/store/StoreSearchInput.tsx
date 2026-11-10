"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, X, ArrowRight, Tag } from "@phosphor-icons/react";
import { formatINR } from "@/lib/format";

interface SuggestionProduct {
  id: string;
  slug: string;
  name: string;
  nameTamil: string | null;
  brand: string | null;
  sizeLabel: string | null;
  sellingPrice: number;
  categoryName: string;
  imageUrl: string | null;
}

interface SuggestionCategory {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  placeholder?: string;
  className?: string;
}

export function StoreSearchInput({
  placeholder = "Search groceries, dal, rice, oil...",
  className = "",
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SuggestionProduct[]>([]);
  const [categories, setCategories] = useState<SuggestionCategory[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setProducts([]);
      setCategories([]);
      setIsOpen(false);
      return;
    }

    const handler = setTimeout(async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/public/search-suggestions?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
          setCategories(data.matchingCategories || []);
          setIsOpen(true);
        }
      } catch {
        // Ignore search suggestion network errors
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside listener to dismiss suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (products.length > 0 || categories.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full h-11 pl-4 pr-20 rounded-md bg-surface text-ink placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-turmeric transition-all shadow-xs"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-11 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}

        <button
          type="submit"
          aria-label="Search"
          className="absolute right-1 top-1 h-9 w-9 bg-turmeric text-ink rounded-md flex items-center justify-center hover:bg-turmeric-hover transition-colors font-bold"
        >
          <MagnifyingGlass size={18} weight="bold" />
        </button>
      </form>

      {/* Live Suggestions Dropdown */}
      {isOpen && (products.length > 0 || categories.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface rounded-lg border border-border shadow-lg z-50 overflow-hidden divide-y divide-border">
          {/* Categories matches */}
          {categories.length > 0 && (
            <div className="p-2 bg-page/40">
              <div className="text-[10px] uppercase font-bold text-ink-muted px-2 py-1 flex items-center gap-1">
                <Tag size={12} weight="bold" />
                Categories
              </div>
              <div className="flex flex-wrap gap-1.5 px-2 py-1">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/c/${c.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface hover:bg-turmeric/20 border border-border text-xs font-medium text-ink transition-colors"
                  >
                    <span>{c.name}</span>
                    <ArrowRight size={11} className="text-leaf" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Product suggestions */}
          {products.length > 0 && (
            <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/p/${p.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between p-2.5 hover:bg-page transition-colors text-xs group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-9 h-9 rounded object-cover shrink-0 border border-border/80"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded bg-page flex items-center justify-center shrink-0 text-ink-muted text-[10px] font-bold">
                        P
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-ink truncate group-hover:text-leaf transition-colors">
                        {p.name}
                      </div>
                      {p.nameTamil && (
                        <div className="text-[11px] text-ink-muted font-tamil truncate">
                          {p.nameTamil}
                        </div>
                      )}
                      <div className="text-[10px] text-ink-muted">
                        {p.sizeLabel || p.categoryName}
                      </div>
                    </div>
                  </div>

                  <div className="font-bold font-mono text-sm text-leaf shrink-0">
                    {formatINR(p.sellingPrice)}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* View all search results link */}
          <Link
            href={`/search?q=${encodeURIComponent(query.trim())}`}
            onClick={() => setIsOpen(false)}
            className="block p-2.5 text-center text-xs font-semibold text-leaf hover:bg-page transition-colors bg-surface"
          >
            See all results for &ldquo;{query}&rdquo; →
          </Link>
        </div>
      )}
    </div>
  );
}

