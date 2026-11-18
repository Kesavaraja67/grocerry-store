"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Storefront,
  Phone,
  MapPin,
  ShoppingCart,
  Calendar,
  CaretRight,
} from "@phosphor-icons/react";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";

interface ShopDetailProps {
  profile: any;
}

export function ShopDetailView({ profile }: ShopDetailProps) {
  const { supplier, productsBought, purchases, totalSpent } = profile;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/shops"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf hover:underline p-1 min-h-[44px]"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>All shops</span>
        </Link>

        {supplier.phone && (
          <a
            href={`tel:${supplier.phone}`}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-leaf text-white font-bold text-xs shadow-xs min-h-[40px]"
          >
            <Phone size={15} weight="bold" />
            <span>Call shop</span>
          </a>
        )}
      </div>

      {/* Shop Info Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-ink leading-tight font-heading">
              {supplier.name}
            </h1>
            {supplier.area && (
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <MapPin size={13} />
                <span>
                  {supplier.area}
                  {supplier.address ? `, ${supplier.address}` : ""}
                </span>
              </p>
            )}
            {supplier.phone && (
              <p className="text-xs text-muted font-mono mt-0.5">
                Phone: {supplier.phone}
              </p>
            )}
          </div>

          <div className="w-12 h-12 rounded-2xl bg-leaf-light text-leaf flex items-center justify-center shrink-0">
            <Storefront size={24} weight="bold" />
          </div>
        </div>

        {/* Action button: Record purchase from this shop */}
        <div className="pt-2">
          <Link
            href={`/admin/buy?shopId=${supplier.id}`}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-turmeric text-ink font-bold text-sm shadow-xs hover:bg-turmeric-hover transition-colors min-h-[48px]"
          >
            <ShoppingCart size={18} weight="bold" />
            <span>Record a purchase from this shop</span>
          </Link>
        </div>

        {/* 2 Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/70 text-xs">
          <div className="p-3 rounded-xl bg-page border border-border">
            <p className="text-muted">Total bills recorded</p>
            <p className="text-base font-bold font-mono text-ink mt-0.5">
              {purchases.length}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-page border border-border">
            <p className="text-muted">Total purchased</p>
            <p className="text-base font-bold font-mono text-ink mt-0.5">
              ₹{totalSpent.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Items Bought Here */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <h2 className="font-bold text-base text-ink font-heading border-b border-border/70 pb-2.5">
          {copy.admin.shops.boughtHere.en}
        </h2>

        {productsBought.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">
            No items recorded from this shop yet.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {productsBought.map((item: any) => (
              <Link
                key={item.productId}
                href={`/admin/items/${item.productId}`}
                className="py-3 flex items-center justify-between hover:bg-page/50 px-2 rounded-lg transition-colors group min-h-[56px]"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-semibold text-ink group-hover:text-leaf truncate">
                    {item.productName}
                  </p>
                  {item.productNameTamil && (
                    <p className="text-xs text-muted font-tamil truncate">
                      {item.productNameTamil}
                    </p>
                  )}
                  <p className="text-[11px] text-muted mt-0.5">
                    Last bought{" "}
                    {new Date(item.latestDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · Bought {item.timesBought}{" "}
                    {item.timesBought === 1 ? "time" : "times"}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs text-muted">You paid</p>
                  <p className="text-sm font-bold font-mono text-ink">
                    ₹{item.latestPrice}/{item.baseUnitSymbol}
                  </p>
                  {item.currentSellingPrice && (
                    <p className="text-[11px] font-mono text-leaf font-semibold">
                      Selling: ₹{item.currentSellingPrice}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Bills */}
      {purchases.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h2 className="font-bold text-base text-ink font-heading border-b border-border/70 pb-2.5">
            Past wholesale bills
          </h2>

          <div className="divide-y divide-border/60">
            {purchases.map((p: any) => (
              <div
                key={p.id}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {new Date(p.purchaseDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {p.invoiceNo ? ` · Bill #${p.invoiceNo}` : ""}
                  </p>
                  <p className="text-[11px] text-muted">
                    {p.itemCount} {p.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>

                <div className="text-right font-mono font-bold text-sm text-ink">
                  ₹{p.total.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

