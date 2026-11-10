"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { WarningCircle, ArrowClockwise, House, WhatsappLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Storefront runtime error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-red-light border border-red/30 flex items-center justify-center text-red mx-auto shadow-xs">
        <WarningCircle size={32} weight="bold" />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-muted">
        Temporary Store Glitch
      </span>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
        Unable to load store page
      </h1>

      <p className="text-sm font-tamil text-muted">
        பக்கத்தை ஏற்றுவதில் சிக்கல் ஏற்பட்டது
      </p>

      <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
        We had trouble loading these items. Please refresh or try again in a moment. You can also place an order directly on WhatsApp.
      </p>

      <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
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

