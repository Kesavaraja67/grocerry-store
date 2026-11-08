"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Phone,
  MapPin,
  Receipt,
  Package,
  Plus,
  MagnifyingGlass,
  ArrowLeft,
} from "@phosphor-icons/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

interface ProductBoughtItem {
  productId: string;
  productName: string;
  productNameTamil: string | null;
  unitSymbol: string;
  currentSellingPrice: number | null;
  timesBought: number;
  lastPrice: number;
  lowestPrice: number;
  lastDate: Date;
  lastQuantity: number;
}

interface PurchaseItemView {
  id: string;
  purchaseDate: Date;
  invoiceNo: string | null;
  subtotal: number;
  extraCharges: number;
  total: number;
  notes: string | null;
  status: "ACTIVE" | "VOIDED";
  itemCount: number;
  items: Array<{
    id: string;
    productName: string;
    productNameTamil: string | null;
    quantity: number;
    unitSymbol: string;
    baseQty: number;
    baseUnitSymbol: string;
    lineAmount: number;
    unitCost: number;
    currentSellingPrice: number | null;
  }>;
}

interface SupplierProfileViewProps {
  profile: {
    id: string;
    name: string;
    phone: string | null;
    area: string | null;
    address: string | null;
    notes: string | null;
    summary: {
      purchaseCount: number;
      distinctProductsCount: number;
      totalSpent: number;
    };
    purchases: PurchaseItemView[];
    productsBought: ProductBoughtItem[];
  };
}

export function SupplierProfileView({ profile }: SupplierProfileViewProps) {
  const [productSearch, setProductSearch] = useState("");

  const filteredProducts = profile.productsBought.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase().trim();
    return (
      p.productName.toLowerCase().includes(q) ||
      (p.productNameTamil && p.productNameTamil.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors font-medium"
        >
          <ArrowLeft size={16} />
          <span>Back to wholesale stores</span>
        </Link>

        <Link href={`/admin/purchases/new?supplierId=${profile.id}`}>
          <Button variant="turmeric" size="sm" className="gap-1.5 font-semibold">
            <Plus size={16} weight="bold" />
            <span>Record purchase from this store</span>
          </Button>
        </Link>
      </div>

      {/* Supplier Header & Contact Information */}
      <div className="bg-surface rounded-lg p-5 sm:p-6 border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                {profile.name}
              </h1>
            </div>
            {profile.area && (
              <p className="text-xs text-muted flex items-center gap-1.5">
                <MapPin size={14} className="text-leaf shrink-0" />
                <span>{profile.area}</span>
                {profile.address && <span>· {profile.address}</span>}
              </p>
            )}
            {profile.phone && (
              <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                <Phone size={14} className="text-leaf shrink-0" />
                <a href={`tel:${profile.phone}`} className="hover:underline">
                  {profile.phone}
                </a>
              </p>
            )}
            {profile.notes && (
              <p className="text-xs text-muted/90 italic mt-2 bg-page p-2 rounded border border-border">
                Note: {profile.notes}
              </p>
            )}
          </div>

          {/* Quick Summary Numbers */}
          <div className="grid grid-cols-3 gap-3 bg-page p-3 rounded-lg border border-border shrink-0 text-center">
            <div>
              <span className="text-[11px] text-muted block">Bills recorded</span>
              <span className="text-lg font-bold text-ink tabular-nums">
                {profile.summary.purchaseCount}
              </span>
            </div>
            <div className="border-x border-border px-3">
              <span className="text-[11px] text-muted block">Items bought</span>
              <span className="text-lg font-bold text-ink tabular-nums">
                {profile.summary.distinctProductsCount}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted block">Total spent</span>
              <span className="text-lg font-bold text-ink tabular-nums privacy-figure">
                {formatINR(profile.summary.totalSpent)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Tabs: Products Bought vs Purchases */}
      <Tabs defaultValue="products" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package size={16} />
              <span>Products bought ({profile.productsBought.length})</span>
            </TabsTrigger>
            <TabsTrigger value="purchases" className="gap-2">
              <Receipt size={16} />
              <span>Purchase bills ({profile.purchases.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* In-page search for products */}
          <div className="relative w-full sm:w-64">
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products bought here..."
              className="pl-8 h-9 text-xs"
            />
            <MagnifyingGlass size={14} className="absolute left-2.5 top-2.5 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Tab 1: Products Bought (Answers the owner's verbatim intent) */}
        <TabsContent value="products">
          <Card>
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-base">Everything bought from {profile.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  No products match your search.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Last paid</TableHead>
                      <TableHead className="text-right">Lowest paid</TableHead>
                      <TableHead className="text-right font-bold text-leaf">
                        Sell price
                      </TableHead>
                      <TableHead className="text-right">Last qty</TableHead>
                      <TableHead className="text-right">Last purchase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => (
                      <TableRow key={p.productId}>
                        <TableCell>
                          <Link
                            href={`/admin/products/${p.productId}`}
                            className="font-bold text-ink hover:text-leaf hover:underline"
                          >
                            {p.productName}
                          </Link>
                          {p.productNameTamil && (
                            <span className="block text-xs text-muted font-tamil">
                              {p.productNameTamil}
                            </span>
                          )}
                          <span className="text-[11px] text-muted">
                            Bought {p.timesBought} {p.timesBought === 1 ? "time" : "times"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums privacy-figure font-medium">
                          {formatINR(p.lastPrice)} / {p.unitSymbol}
                        </TableCell>
                        <TableCell className="text-right tabular-nums privacy-figure text-muted">
                          {formatINR(p.lowestPrice)} / {p.unitSymbol}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-leaf text-base">
                          {p.currentSellingPrice ? formatINR(p.currentSellingPrice) : "Not priced"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted text-xs">
                          {p.lastQuantity} {p.unitSymbol}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted tabular-nums">
                          {formatDate(p.lastDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Purchase Bills */}
        <TabsContent value="purchases">
          <Card>
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-base">Purchase bills recorded</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {profile.purchases.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  No purchases recorded yet for this wholesale store.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Extra</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.purchases.map((pur) => (
                      <TableRow key={pur.id}>
                        <TableCell className="font-medium tabular-nums">
                          {formatDate(pur.purchaseDate)}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {pur.invoiceNo || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted">
                          {pur.itemCount} {pur.itemCount === 1 ? "item" : "items"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums privacy-figure">
                          {formatINR(pur.subtotal)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted privacy-figure">
                          {pur.extraCharges > 0 ? formatINR(pur.extraCharges) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-ink privacy-figure">
                          {formatINR(pur.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={pur.status === "ACTIVE" ? "secondary" : "destructive"}>
                            {pur.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/admin/purchases/${pur.id}`}
                            className="text-xs font-semibold text-leaf hover:underline"
                          >
                            View details
                          </Link>
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
