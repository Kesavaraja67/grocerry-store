import React from "react";
import Link from "next/link";
import {
  ClipboardText,
  WarningCircle,
  Receipt,
  CurrencyInr,
  Tag,
  ArrowRight,
  Plus,
  Package,
  ChartBar,
  SlidersHorizontal,
} from "@phosphor-icons/react/dist/ssr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatDate } from "@/lib/format";
import { prisma } from "@/server/db";
import { Decimal } from "decimal.js";

export default async function AdminDashboardPage() {
  // 1. Fetch dashboard metric queries
  const [
    newOrdersCount,
    lowStockCount,
    pricesToReviewProducts,
    totalProductsCount,
    allStockProducts,
    recentPurchases,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "PLACED" } }),
    prisma.product.count({
      where: {
        isArchived: false,
        stockQty: { lte: 5 },
      },
    }),
    prisma.product.findMany({
      where: {
        isArchived: false,
      },
      include: {
        cost: true,
      },
    }),
    prisma.product.count({ where: { isArchived: false } }),
    prisma.product.findMany({
      where: { isArchived: false, stockQty: { gt: 0 } },
      select: {
        stockQty: true,
        cost: {
          select: {
            lastCost: true,
            avgCost: true,
            costBasis: true,
          },
        },
      },
    }),
    prisma.purchase.findMany({
      where: { status: "ACTIVE" },
      orderBy: { purchaseDate: "desc" },
      take: 5,
      include: {
        supplier: { select: { name: true } },
        items: { select: { id: true } },
      },
    }),
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 5,
      include: {
        items: { select: { id: true, productName: true, quantity: true } },
      },
    }),
  ]);

  // Compute total stock valuation
  let totalStockValuation = new Decimal(0);
  for (const p of allStockProducts) {
    if (p.cost) {
      const uCost =
        p.cost.costBasis === "AVERAGE"
          ? p.cost.avgCost ?? p.cost.lastCost
          : p.cost.lastCost ?? p.cost.avgCost;
      if (uCost) {
        totalStockValuation = totalStockValuation.plus(p.stockQty.times(uCost));
      }
    }
  }

  // Compute prices to review count
  let pricesToReviewCount = 0;
  for (const p of pricesToReviewProducts) {
    const cost = p.cost;
    const currentCost = cost
      ? (cost.costBasis === "AVERAGE"
          ? cost.avgCost?.toNumber() ?? cost.lastCost?.toNumber()
          : cost.lastCost?.toNumber() ?? cost.avgCost?.toNumber()) ?? null
      : null;
    const selling = p.sellingPrice ? p.sellingPrice.toNumber() : null;
    const pricedAt = cost?.pricedAtCost ? cost.pricedAtCost.toNumber() : null;

    if (selling === null) {
      pricesToReviewCount++;
    } else if (currentCost !== null && currentCost !== undefined) {
      if (currentCost >= selling) {
        pricesToReviewCount++;
      } else if (pricedAt === null) {
        pricesToReviewCount++;
      } else if (Math.abs(currentCost - pricedAt) / pricedAt > 0.05) {
        pricesToReviewCount++;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-heading">
            Shop Overview
          </h1>
          <p className="text-xs text-ink-muted">
            Live store operations: wholesale purchases, stock levels, selling prices, and incoming orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/reports">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ChartBar size={16} />
              <span>Reports</span>
            </Button>
          </Link>
          <Link href="/admin/purchases/new">
            <Button variant="turmeric" size="sm" className="gap-1.5 font-bold shadow-xs">
              <Plus size={16} weight="bold" />
              <span>Record wholesale bill</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 5 Key Metric Cards (Section 10) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. New Orders */}
        <Link href="/admin/orders" className="block group">
          <Card className="hover:border-leaf/50 transition-colors h-full">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
                <span>New orders</span>
                <ClipboardText size={16} className="text-leaf" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-ink">
                {newOrdersCount}
              </div>
              <p className="text-[11px] text-ink-muted mt-1">
                {newOrdersCount === 1 ? "1 order waiting" : `${newOrdersCount} orders waiting`}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 2. Low Stock */}
        <Link href="/admin/inventory?stockFilter=LOW" className="block group">
          <Card className="hover:border-turmeric/50 transition-colors h-full">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
                <span>Low stock</span>
                <WarningCircle size={16} className="text-turmeric-dark" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-turmeric-dark">
                {lowStockCount}
              </div>
              <p className="text-[11px] text-ink-muted mt-1">Items running low</p>
            </CardContent>
          </Card>
        </Link>

        {/* 3. Total Products */}
        <Link href="/admin/products" className="block group">
          <Card className="hover:border-leaf/50 transition-colors h-full">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
                <span>Total items</span>
                <Receipt size={16} className="text-leaf" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-ink">
                {totalProductsCount}
              </div>
              <p className="text-[11px] text-ink-muted mt-1">Products in catalog</p>
            </CardContent>
          </Card>
        </Link>

        {/* 4. Stock Value (Privacy-maskable) */}
        <Link href="/admin/inventory" className="block group">
          <Card className="hover:border-leaf/50 transition-colors h-full">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
                <span>Stock value</span>
                <CurrencyInr size={16} className="text-leaf" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-ink">
                {formatINR(totalStockValuation.toNumber())}
              </div>
              <p className="text-[11px] text-ink-muted mt-1">Current inventory value</p>
            </CardContent>
          </Card>
        </Link>

        {/* 5. Prices to Review */}
        <Link href="/admin/pricing?status=REVIEW" className="block group col-span-2 lg:col-span-1">
          <Card className="hover:border-turmeric/50 transition-colors h-full">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
                <span>Prices to review</span>
                <Tag size={16} className="text-turmeric" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-ink">
                {pricesToReviewCount}
              </div>
              <p className="text-[11px] text-ink-muted mt-1">Cost changed recently</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/admin/purchases/new" className="block">
          <Card className="p-3 bg-surface hover:border-leaf/50 hover:bg-page/40 transition-colors flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-turmeric/20 text-ink flex items-center justify-center shrink-0">
              <Plus size={18} weight="bold" />
            </div>
            <div>
              <div className="text-xs font-bold text-ink">Wholesale Purchase</div>
              <div className="text-[10px] text-ink-muted">Record new bill</div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/pricing" className="block">
          <Card className="p-3 bg-surface hover:border-leaf/50 hover:bg-page/40 transition-colors flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-leaf/10 text-leaf flex items-center justify-center shrink-0">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-ink">Selling Prices</div>
              <div className="text-[10px] text-ink-muted">Set markup & margins</div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/inventory" className="block">
          <Card className="p-3 bg-surface hover:border-leaf/50 hover:bg-page/40 transition-colors flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-page text-ink flex items-center justify-center shrink-0">
              <Package size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-ink">Stock & Inventory</div>
              <div className="text-[10px] text-ink-muted">Adjust & track</div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/reports" className="block">
          <Card className="p-3 bg-surface hover:border-leaf/50 hover:bg-page/40 transition-colors flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-page text-ink flex items-center justify-center shrink-0">
              <ChartBar size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-ink">Reports & CSV</div>
              <div className="text-[10px] text-ink-muted">Analytics & export</div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Purchases & Orders Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <Card className="bg-surface border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border/80">
            <CardTitle className="text-base font-bold font-heading">Recent Purchases</CardTitle>
            <Link
              href="/admin/purchases"
              className="text-xs text-leaf font-semibold hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight size={14} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentPurchases.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-muted">
                No purchases recorded yet. Tap &ldquo;Record wholesale bill&rdquo; to add your first bill.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentPurchases.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/purchases/${p.id}`}
                    className="flex items-center justify-between p-3.5 hover:bg-page/50 transition-colors text-xs"
                  >
                    <div>
                      <p className="font-semibold text-ink text-sm">{p.supplier.name}</p>
                      <p className="text-ink-muted text-[11px] mt-0.5">
                        {formatDate(p.purchaseDate)} · {p.items.length} {p.items.length === 1 ? "item" : "items"}
                        {p.invoiceNo && ` · Bill #${p.invoiceNo}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-ink tabular-nums">
                        {formatINR(p.total.toString())}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="bg-surface border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border/80">
            <CardTitle className="text-base font-bold font-heading">Recent Orders</CardTitle>
            <Link
              href="/admin/orders"
              className="text-xs text-leaf font-semibold hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight size={14} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-muted">
                No customer orders received yet. Incoming orders will appear here automatically.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center justify-between p-3.5 hover:bg-page/50 transition-colors text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink font-mono">{o.orderNumber}</span>
                        <Badge
                          variant={
                            o.status === "PLACED"
                              ? "turmeric"
                              : o.status === "ACCEPTED"
                              ? "secondary"
                              : o.status === "COMPLETED"
                              ? "default"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {o.status}
                        </Badge>
                      </div>
                      <p className="text-ink-muted text-[11px] mt-0.5">
                        {o.customerName} · {o.fulfilment} · {formatDate(o.placedAt, true)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-ink tabular-nums">
                        {formatINR(o.total.toString())}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
