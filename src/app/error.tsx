"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { WarningCircle, ArrowClockwise, House } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-page text-ink text-center">
      <div className="w-16 h-16 rounded-full bg-red-light border border-red/30 flex items-center justify-center text-red mb-4 shadow-xs">
        <WarningCircle size={32} weight="bold" />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-muted">
        Temporary Problem
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mt-1">
        Something went wrong
      </h1>
      <p className="text-sm font-tamil text-muted mt-0.5">
        மன்னிக்கவும், ஒரு பிழை ஏற்பட்டுள்ளது
      </p>

      <p className="text-sm text-muted mt-3 max-w-md leading-relaxed">
        We encountered an unexpected error while loading this page. Please try again, or head back to the storefront.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <Button
          type="button"
          variant="default"
          size="default"
          onClick={() => reset()}
          className="gap-2"
        >
          <ArrowClockwise size={18} weight="bold" />
          Try Again
        </Button>
        <Button asChild variant="outline" size="default">
          <Link href="/">
            <House size={18} />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}

