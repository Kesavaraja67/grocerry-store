import React from "react";
import Link from "next/link";
import {
  ClipboardText,
  ShoppingCart,
  Package,
  WarningCircle,
  CaretRight,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/server/db";
import { TakingOrdersToggle } from "@/components/admin/TakingOrdersToggle";
import { HomeSearch } from "@/components/admin/HomeSearch";
import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [newOrdersCount, settings, activeProducts] = await Promise.all([
    prisma.order.count({ where: { status: "PLACED" } }),
    prisma.shopSettings.findFirst({ where: { id: 1 } }),
    prisma.product.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        name: true,
        nameTamil: true,
        stockQty: true,
        lowStockAt: true,
        baseUnit: { select: { symbol: true, label: true } },
      },
    }),
  ]);

  const lowStockItems = activeProducts
    .filter((p) => Number(p.stockQty) <= Number(p.lowStockAt))
    .sort((a, b) => Number(a.stockQty) - Number(b.stockQty))
    .slice(0, 5);

  const acceptingOrders = settings?.acceptingOrders ?? true;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* 1. Large Search Box with Voice Mic */}
      <HomeSearch />

      {/* 2. Shop Open / Closed Toggle */}
      <TakingOrdersToggle initialAccepting={acceptingOrders} />

      {/* 3. Three Big Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Button 1: New orders */}
        <Link
          href="/admin/orders"
          className="group flex flex-col justify-between p-4 rounded-2xl border-2 border-border bg-surface hover:border-leaf hover:bg-leaf-light/30 transition-all shadow-xs min-h-[96px]"
        >
          <div className="flex items-center justify-between">
            <span className="p-2.5 rounded-xl bg-leaf-light text-leaf group-hover:bg-leaf group-hover:text-white transition-colors">
              <ClipboardText size={24} weight="bold" />
            </span>
            {newOrdersCount > 0 ? (
              <span className="px-2.5 py-1 text-xs font-bold font-mono bg-turmeric text-ink rounded-full">
                {newOrdersCount} new
              </span>
            ) : (
              <span className="text-xs text-muted font-mono">0</span>
            )}
          </div>
          <div className="mt-2">
            <p className="font-bold text-base text-ink leading-tight">
              {copy.admin.home.newOrdersBtn.en}
            </p>
            <p className="text-xs text-muted font-tamil leading-tight">
              {copy.admin.home.newOrdersBtn.ta}
            </p>
          </div>
        </Link>

        {/* Button 2: Record a purchase */}
        <Link
          href="/admin/buy"
          className="group flex flex-col justify-between p-4 rounded-2xl border-2 border-border bg-surface hover:border-turmeric hover:bg-turmeric/10 transition-all shadow-xs min-h-[96px]"
        >
          <div className="flex items-center justify-between">
            <span className="p-2.5 rounded-xl bg-turmeric/20 text-ink group-hover:bg-turmeric transition-colors">
              <ShoppingCart size={24} weight="bold" />
            </span>
          </div>
          <div className="mt-2">
            <p className="font-bold text-base text-ink leading-tight">
              {copy.admin.home.recordPurchaseBtn.en}
            </p>
            <p className="text-xs text-muted font-tamil leading-tight">
              {copy.admin.home.recordPurchaseBtn.ta}
            </p>
          </div>
        </Link>

        {/* Button 3: Check an item */}
        <Link
          href="/admin/items"
          className="group flex flex-col justify-between p-4 rounded-2xl border-2 border-border bg-surface hover:border-leaf hover:bg-leaf-light/30 transition-all shadow-xs min-h-[96px]"
        >
          <div className="flex items-center justify-between">
            <span className="p-2.5 rounded-xl bg-page text-ink group-hover:bg-leaf-light group-hover:text-leaf transition-colors">
              <Package size={24} weight="bold" />
            </span>
          </div>
          <div className="mt-2">
            <p className="font-bold text-base text-ink leading-tight">
              {copy.admin.home.checkItemBtn.en}
            </p>
            <p className="text-xs text-muted font-tamil leading-tight">
              {copy.admin.home.checkItemBtn.ta}
            </p>
          </div>
        </Link>
      </div>

      {/* 4. Needs Attention Section (Low Stock) */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <WarningCircle size={18} weight="bold" className="text-amber-500" />
            <h2 className="font-bold text-sm text-ink font-heading">
              {copy.admin.home.needsAttention.en}
            </h2>
            <span className="text-xs text-muted font-tamil">
              ({copy.admin.home.needsAttention.ta})
            </span>
          </div>
          {lowStockItems.length > 0 && (
            <Link
              href="/admin/items?filter=low"
              className="text-xs text-leaf font-semibold hover:underline"
            >
              View all
            </Link>
          )}
        </div>

        {lowStockItems.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center text-muted">
            <CheckCircle size={32} weight="duotone" className="text-emerald-500 mb-1.5" />
            <p className="text-xs font-medium text-ink">
              {copy.admin.home.noLowStock.en}
            </p>
            <p className="text-[11px] text-muted font-tamil mt-0.5">
              {copy.admin.home.noLowStock.ta}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {lowStockItems.map((item) => {
              const qty = Number(item.stockQty);
              const unit = item.baseUnit.symbol;
              const isOut = qty <= 0;
              return (
                <Link
                  key={item.id}
                  href={`/admin/items/${item.id}`}
                  className="flex items-center justify-between py-3 hover:bg-page/50 px-2 rounded-lg transition-colors group min-h-[48px]"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold text-ink truncate group-hover:text-leaf">
                      {item.name}
                    </p>
                    {item.nameTamil && (
                      <p className="text-xs text-muted font-tamil truncate">
                        {item.nameTamil}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        isOut
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {isOut ? "Out of stock" : `${qty} ${unit} left`}
                    </span>
                    <CaretRight size={14} className="text-muted group-hover:text-ink" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
