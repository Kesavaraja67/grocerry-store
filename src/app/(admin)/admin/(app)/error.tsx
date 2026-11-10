"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { WarningCircle, ArrowClockwise, House } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin portal error:", error);
  }, [error]);

  return (
    <div className="p-8 max-w-xl mx-auto my-12 text-center bg-surface border border-border rounded-lg shadow-xs space-y-4">
      <div className="w-14 h-14 rounded-full bg-red-light border border-red/30 flex items-center justify-center text-red mx-auto">
        <WarningCircle size={28} weight="bold" />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-muted">
        Admin Portal Notice
      </span>

      <h1 className="text-xl font-bold tracking-tight text-ink">
        An error occurred while loading this section
      </h1>

      <p className="text-xs font-tamil text-muted">
        நிர்வாகப் பகுதியில் பிழை ஏற்பட்டது
      </p>

      <p className="text-sm text-muted leading-relaxed">
        {error.message || "Something went wrong while processing your request. Please try again."}
      </p>

      <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => reset()}
          className="gap-2 text-xs"
        >
          <ArrowClockwise size={16} weight="bold" />
          Try Again
        </Button>
        <Button asChild variant="outline" size="sm" className="text-xs">
          <Link href="/admin">
            <House size={16} />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
