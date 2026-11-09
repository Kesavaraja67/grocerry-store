"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  PencilSimple,
  Tag,
  Receipt,
  Stack,
  TrendUp,
  Storefront,
  Info,
} from "@phosphor-icons/react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/format";

interface ProductDetailViewProps {
  product: {
    id: string;
    slug: string;
    name: string;
    nameTamil: string | null;
    brand: string | null;
    description: string | null;
    sizeLabel: string | null;
    categoryId: string;
    category: { id: string; name: string; tint: string | null };
    baseUnitId: string;
    baseUnit: { id: string; symbol: string; label: string };
    sellStep: number;
    minQty: number;
    maxQty: number;
    sellingPrice: number | null;
    mrp: number | null;
    stockQty: number;
    lowStockAt: number;
    isPublished: boolean;
    isFeatured: boolean;
    images: Array<{ id: string; url: string; alt: string | null }>;
    cost: {
      lastCost: number | null;
      avgCost: number | null;
      costBasis: "LATEST" | "AVERAGE";
      pricedAtCost: number | null;
      lastCostAt: Date | null;
    } | null;
    cheapestSupplier: {
      supplierId: string;
      supplierName: string;
      lowestUnitCost: number;
    } | null;
    priceTrend: Array<{
      date: string;
      unitCost: number;
      supplierName: string;
    }>;
    purchaseHistory: Array<{
      id: string;
      purchaseId: string;
      purchaseDate: Date;
      supplierName: string;
      supplierId: string;
      quantity: number;
      unitSymbol: string;
      baseQty: number;
      lineAmount: number;
      extraShare: number;
      unitCost: number;
    }>;
    stockMovements: Array<{
      id: string;
      type: string;
      quantityChange: number;
      stockAfter: number;
      reason: string | null;
      note: string | null;
      createdAt: Date;
    }>;
    priceHistory: Array<{
      id: string;
      oldPrice: number | null;
      newPrice: number;
      costUsed: number | null;
      markupPercent: number | null;
      createdAt: Date;
    }>;
  };
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>("ALL");

  const suppliers = Array.from(
    new Set(product.purchaseHistory.map((p) => p.supplierName))
  );

  const filteredPurchases = product.purchaseHistory.filter((p) => {
    if (selectedSupplierFilter === "ALL") return true;
    return p.supplierName === selectedSupplierFilter;
  });

  const cost = product.cost?.costBasis === "AVERAGE"
    ? product.cost?.avgCost
    : product.cost?.lastCost;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink font-medium"
        >
          <ArrowLeft size={16} />
          <span>Back to products</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/admin/purchases/new?productId=${product.id}`}>
            <Button variant="turmeric" size="sm" className="font-semibold">
              Record purchase of this item
            </Button>
          </Link>
          <Link href={`/admin/products/${product.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <PencilSimple size={16} />
              <span>Edit product</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Product Hero Info */}
      <div className="bg-surface rounded-xl p-5 sm:p-6 border border-border shadow-xs flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg shrink-0 border border-border flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: product.category.tint || "#EBF2ED" }}
          >
            {product.images[0] ? (
              <Image
                src={product.images[0].url}
                alt={product.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            ) : (
              <CategoryIcon iconKey={product.category.name.toLowerCase()} size={36} className="text-leaf" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                {product.name}
              </h1>
              {product.isPublished ? (
                <Badge variant="secondary">Published</Badge>
              ) : (
                <Badge variant="muted">Hidden</Badge>
              )}
              {product.isFeatured && <Badge variant="turmeric">Featured</Badge>}
            </div>

            {product.nameTamil && (
              <p className="text-sm text-muted font-tamil">{product.nameTamil}</p>
            )}

            <p className="text-xs text-muted">
              {product.category.name} {product.brand && `· ${product.brand}`} {product.sizeLabel && `· ${product.sizeLabel}`}
            </p>
          </div>
        </div>

        {/* Pricing & Stock Card */}
        <div className="flex items-center gap-4 bg-page p-3.5 rounded-lg border border-border shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
          <div>
            <span className="text-[11px] text-muted block">Selling price</span>
            <span className="text-xl font-bold text-ink tabular-nums">
              {product.sellingPrice ? (
                <>
                  {formatINR(product.sellingPrice)}
                  <span className="text-xs font-normal text-muted ml-0.5">
                    /{product.baseUnit.symbol}
                  </span>
                </>
              ) : (
                "Not set"
              )}
            </span>
            {product.mrp && (
              <span className="text-[11px] text-muted block tabular-nums">
                MRP: {formatINR(product.mrp)}
              </span>
            )}
          </div>

          <div className="border-l border-border pl-4">
            <span className="text-[11px] text-muted block">In stock</span>
            <span
              className={`text-xl font-bold tabular-nums ${
                product.stockQty <= 0
                  ? "text-red"
                  : product.stockQty <= product.lowStockAt
                  ? "text-amber-700"
                  : "text-leaf"
              }`}
            >
              {product.stockQty} {product.baseUnit.symbol}
            </span>
            <span className="text-[11px] text-muted block">
              Step: {product.sellStep} {product.baseUnit.symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Cheapest Supplier Callout Banner (Section 10) */}
      {product.cheapestSupplier && (
        <div className="bg-leaf-light border border-[#D5E3DA] p-3.5 sm:p-4 rounded-lg flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Storefront size={20} className="text-leaf shrink-0" />
            <span>
              Cheapest wholesale store:{" "}
              <strong className="text-ink">{product.cheapestSupplier.supplierName}</strong> at{" "}
              <strong className="text-leaf tabular-nums privacy-figure">
                {formatINR(product.cheapestSupplier.lowestUnitCost)} / {product.baseUnit.symbol}
              </strong>
            </span>
          </div>
          <Link
            href={`/admin/suppliers/${product.cheapestSupplier.supplierId}`}
            className="text-xs font-semibold text-leaf hover:underline shrink-0 ml-2"
          >
            View store profile
          </Link>
        </div>
      )}

      {/* Tabs Layout */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history" className="gap-2">
            <Receipt size={16} />
            <span>Purchase history ({product.purchaseHistory.length})</span>
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2">
            <Stack size={16} />
            <span>Stock movements ({product.stockMovements.length})</span>
          </TabsTrigger>
          <TabsTrigger value="prices" className="gap-2">
            <TrendUp size={16} />
            <span>Price history ({product.priceHistory.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Purchase History & Price Trend Chart */}
        <TabsContent value="history" className="space-y-4">
          {/* Price Trend Chart (Recharts) */}
          {product.priceTrend.length > 1 && (
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendUp size={16} className="text-leaf" />
                  <span>Wholesale purchase price trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={product.priceTrend}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      domain={["auto", "auto"]}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      formatter={(val: number) => [`₹${val.toFixed(2)}`, "Unit cost"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="unitCost"
                      stroke="#17492F"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#F4B223" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Purchases Table */}
          <Card>
            <CardHeader className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base">Every purchase of this product</CardTitle>
              {suppliers.length > 1 && (
                <div className="w-48">
                  <select
                    value={selectedSupplierFilter}
                    onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-border text-xs bg-surface text-ink"
                  >
                    <option value="ALL">All wholesale stores</option>
                    {suppliers.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {filteredPurchases.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  No purchases recorded yet for this item.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Wholesale store</TableHead>
                      <TableHead className="text-right">Qty bought</TableHead>
                      <TableHead className="text-right">Total paid</TableHead>
                      <TableHead className="text-right font-bold text-ink">
                        Cost / {product.baseUnit.symbol}
                      </TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((pi) => {
                      const isCheapest =
                        product.cheapestSupplier &&
                        pi.supplierId === product.cheapestSupplier.supplierId &&
                        pi.unitCost === product.cheapestSupplier.lowestUnitCost;

                      return (
                        <TableRow key={pi.id} className={isCheapest ? "bg-leaf-light/30" : ""}>
                          <TableCell className="tabular-nums font-medium text-xs">
                            {formatDate(pi.purchaseDate)}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/admin/suppliers/${pi.supplierId}`}
                              className="font-semibold text-xs text-ink hover:text-leaf hover:underline"
                            >
                              {pi.supplierName}
                            </Link>
                            {isCheapest && (
                              <Badge variant="turmeric" className="ml-2 text-[9px] py-0 px-1">
                                Lowest price
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {pi.quantity} {pi.unitSymbol} ({pi.baseQty} {product.baseUnit.symbol})
                          </TableCell>
                          <TableCell className="text-right tabular-nums privacy-figure text-xs">
                            {formatINR(pi.lineAmount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-bold text-sm text-ink privacy-figure">
                            {formatINR(pi.unitCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/admin/purchases/${pi.purchaseId}`}
                              className="text-xs font-semibold text-leaf hover:underline"
                            >
                              View bill
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Stock Movements */}
        <TabsContent value="movements">
          <Card>
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-base">Stock movement log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {product.stockMovements.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  No stock movements recorded yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Stock after</TableHead>
                      <TableHead>Reason / Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.stockMovements.map((m) => {
                      const isPositive = m.quantityChange > 0;
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs text-muted tabular-nums">
                            {formatDate(m.createdAt, true)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isPositive ? "secondary" : "muted"}>
                              {m.type}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-right tabular-nums font-bold text-xs ${
                              isPositive ? "text-emerald-700" : "text-red"
                            }`}
                          >
                            {isPositive ? `+${m.quantityChange}` : m.quantityChange} {product.baseUnit.symbol}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold text-xs text-ink">
                            {m.stockAfter} {product.baseUnit.symbol}
                          </TableCell>
                          <TableCell className="text-xs text-muted">
                            {m.reason || "—"} {m.note && `· ${m.note}`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Price History */}
        <TabsContent value="prices">
          <Card>
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-base">Selling price update history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {product.priceHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  No price changes recorded yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="text-right">Old price</TableHead>
                      <TableHead className="text-right">New price</TableHead>
                      <TableHead className="text-right">Cost used</TableHead>
                      <TableHead className="text-right">Markup (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.priceHistory.map((ph) => (
                      <TableRow key={ph.id}>
                        <TableCell className="text-xs text-muted tabular-nums">
                          {formatDate(ph.createdAt, true)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted">
                          {ph.oldPrice ? formatINR(ph.oldPrice) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-sm text-leaf">
                          {formatINR(ph.newPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums privacy-figure text-xs text-muted">
                          {ph.costUsed ? formatINR(ph.costUsed) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums privacy-figure text-xs font-semibold text-ink">
                          {ph.markupPercent ? `${ph.markupPercent.toFixed(1)}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

