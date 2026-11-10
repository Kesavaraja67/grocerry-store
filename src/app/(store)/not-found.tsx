import React from "react";
import Link from "next/link";
import { Package, MagnifyingGlass, House } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export default function StoreNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-turmeric-light border border-turmeric/30 flex items-center justify-center text-leaf mx-auto shadow-xs">
        <Package size={32} />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-muted">
        Item Not Found
      </span>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
        We couldn&apos;t find what you were looking for
      </h1>

      <p className="text-sm font-tamil text-muted">
        நீங்கள் தேடிய பொருள் அல்லது பக்கம் கிடைக்கவில்லை
      </p>

      <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
        The grocery item or category may have been updated, sold out, or moved. Try searching or browse our fresh grocery categories.
      </p>

      <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="default" size="default">
          <Link href="/">
            <House size={18} weight="bold" />
            Back to Store
          </Link>
        </Button>
        <Button asChild variant="outline" size="default">
          <Link href="/search">
            <MagnifyingGlass size={18} />
            Search Products
          </Link>
        </Button>
      </div>
    </div>
  );
}
