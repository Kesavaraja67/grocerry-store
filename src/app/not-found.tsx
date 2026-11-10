import React from "react";
import Link from "next/link";
import { Storefront, ArrowLeft, House } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export default function GlobalNotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-page text-ink text-center">
      <div className="w-16 h-16 rounded-full bg-turmeric-light border border-turmeric/30 flex items-center justify-center text-leaf mb-4 shadow-xs">
        <Storefront size={32} weight="fill" />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-muted">
        404 — Page Not Found
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mt-1">
        We couldn&apos;t find this page
      </h1>
      <p className="text-sm font-tamil text-muted mt-0.5">
        இந்தப் பக்கம் கிடைக்கவில்லை
      </p>

      <p className="text-sm text-muted mt-3 max-w-md leading-relaxed">
        The link you followed may be broken or the page may have been moved. Return to the storefront to browse our groceries.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <Button asChild variant="default" size="default">
          <Link href="/">
            <House size={18} weight="bold" />
            Go to Storefront
          </Link>
        </Button>
        <Button asChild variant="outline" size="default">
          <Link href="/admin">
            Admin Portal
          </Link>
        </Button>
      </div>
    </div>
  );
}

