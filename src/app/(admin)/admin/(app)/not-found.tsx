import React from "react";
import Link from "next/link";
import { MagnifyingGlass, House, ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="p-8 max-w-xl mx-auto my-12 text-center bg-surface border border-border rounded-lg shadow-xs space-y-4">
      <div className="w-14 h-14 rounded-full bg-turmeric-light border border-turmeric/30 flex items-center justify-center text-leaf mx-auto">
        <MagnifyingGlass size={28} />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-muted">
        Record Not Found
      </span>

      <h1 className="text-xl font-bold tracking-tight text-ink">
        Record or page not found
      </h1>

      <p className="text-xs font-tamil text-muted">
        இந்த பதிவு அல்லது பக்கம் கிடைக்கவில்லை
      </p>

      <p className="text-sm text-muted leading-relaxed">
        The product, purchase bill, or order you are looking for does not exist or may have been deleted.
      </p>

      <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="default" size="sm" className="text-xs">
          <Link href="/admin">
            <House size={16} weight="bold" />
            Back to Dashboard
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="text-xs">
          <Link href="/admin/orders">
            View Orders
          </Link>
        </Button>
      </div>
    </div>
  );
}

