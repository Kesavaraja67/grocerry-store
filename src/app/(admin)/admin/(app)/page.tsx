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
} from "@phosphor-icons/react/dist/ssr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatDate } from "@/lib/format";
import { prisma } from "@/server/db";

export default async function AdminDashboardPage() {
  // 1. Fetch dashboard metric queries
  const [
    newOrdersCount,
    lowStockCount,
    pricesToReviewCount,
    totalProductsCount,
    shopSettings,
    recentPurchases,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "PLACED" } }),
    prisma.product.count({
      where: {
        isArchived: false,
        stockQty: { lte: 5 }, // Default threshold
      },
    }),
    prisma.productCost.count({
      where: {
        AND: [
          { lastCost: { not: null } },
          {
            OR: [
              { pricedAtCost: null },
              // In raw logic: lastCost != pricedAtCost
            ],
          },
        ],
      },
    }),
    prisma.product.count({ where: { isArchived: false } }),
    prisma.shopSettings.findFirst({ where: { id: 1 } }),
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

  return (
    <div className="space-y-6">
      {/* Page Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Dashboard
          </h1>
          <p className="text-xs text-muted">
            Overview of your shop: stock, incoming orders, and wholesale purchases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/purchases/new">
            <Button variant="turmeric" size="default" className="gap-1.5 font-semibold">
              <Plus size={18} weight="bold" />
              <span>Record purchase</span>
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
              <div className="flex items-center justify-between text-muted text-xs">
                <span>New orders</span>
                <ClipboardText size={16} className="text-leaf" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold tabular-nums text-ink">
                {newOrdersCount}
              </div>
              <p className="text-[11px] text-muted mt-1">
                {newOrdersCount === 1 ? "1 order waiting" : `${newOrdersCount} orders waiting`}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 2. Low Stock */}
        <Link href="/admin/inventory?filter=low" className="block group">
          <Card className="hover:border-leaf/50 transition-colors h-full">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Low stock</span>
                <WarningCircle size={16} className="text-red" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold tabular-nums text-red">
                {lowStockCount}
              </div>
              <p className="text-[11px] text-muted mt-1">Items running low</p>
            </CardContent>
          </Card>
        </Link>

        {/* 3. Total Products */}
        <Link href="/admin/products" className="block group">
          <Card className="hover:border-leaf/50 transition-colors h-full">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Total items</span>
                <Receipt size={16} className="text-leaf" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold tabular-nums text-ink">
                {totalProductsCount}
              </div>
              <p className="text-[11px] text-muted mt-1">Products in catalog</p>
            </CardContent>
          </Card>
        </Link>

        {/* 4. Stock Value (Privacy-maskable) */}
        <Card className="h-full">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <div className="flex items-center justify-between text-muted text-xs">
              <span>Stock value</span>
              <CurrencyInr size={16} className="text-leaf" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-ink privacy-figure">
              ₹—
            </div>
            <p className="text-[11px] text-muted mt-1">Calculated inventory value</p>
          </CardContent>
        </Card>

        {/* 5. Prices to Review */}
        <Link href="/admin/pricing?filter=review" className="block group col-span-2 lg:col-span-1">
          <Card className="hover:border-leaf/50 transition-colors h-full">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Prices to review</span>
                <Tag size={16} className="text-turmeric" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold tabular-nums text-ink">
                {pricesToReviewCount}
              </div>
              <p className="text-[11px] text-muted mt-1">Cost changed recently</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Purchases & Orders Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border">
            <CardTitle className="text-base">Recent purchases</CardTitle>
            <Link
              href="/admin/purchases"
              className="text-xs text-leaf font-medium hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight size={14} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentPurchases.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                No purchases recorded yet. Tap "Record purchase" to add your wholesale bills.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentPurchases.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/purchases/${p.id}`}
                    className="flex items-center justify-between p-3.5 hover:bg-page transition-colors text-xs"
                  >
                    <div>
                      <p className="font-semibold text-ink text-sm">{p.supplier.name}</p>
                      <p className="text-muted text-[11px] mt-0.5">
                        {formatDate(p.purchaseDate)} · {p.items.length} {p.items.length === 1 ? "item" : "items"}
                        {p.invoiceNo && ` · Bill #${p.invoiceNo}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-ink tabular-nums privacy-figure">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border">
            <CardTitle className="text-base">Recent orders</CardTitle>
            <Link
              href="/admin/orders"
              className="text-xs text-leaf font-medium hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight size={14} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                No orders placed yet. Customer order requests will appear here live.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center justify-between p-3.5 hover:bg-page transition-colors text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink">{o.orderNumber}</span>
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
                        >
                          {o.status}
                        </Badge>
                      </div>
                      <p className="text-muted text-[11px] mt-0.5">
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
