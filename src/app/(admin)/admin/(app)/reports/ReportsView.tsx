"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChartBar,
  DownloadSimple,
  Storefront,
  Package,
  CurrencyInr,
  WarningCircle,
  ClipboardText,
  Eye,
  EyeSlash,
  Calendar,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR } from "@/lib/format";
import {
  type SupplierReportRow,
  type ProductPurchaseReportRow,
  type CategoryValuationRow,
  type StockAlertRow,
  type OrdersReportSummary,
  exportReportCsv,
} from "@/server/admin/reports";

interface Props {
  data: {
    suppliers: SupplierReportRow[];
    productPurchases: ProductPurchaseReportRow[];
    categoryValuations: CategoryValuationRow[];
    lowStock: StockAlertRow[];
    ordersSummary: OrdersReportSummary;
  };
}

export function ReportsView({ data }: Props) {
  const [activeTab, setActiveTab] = useState<
    "SUPPLIERS" | "PRODUCTS" | "VALUATION" | "LOW_STOCK" | "ORDERS"
  >("SUPPLIERS");

  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: typeof activeTab) => {
    try {
      setIsExporting(true);
      const csv = await exportReportCsv(type);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `pandian-store-report-${type.toLowerCase()}-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to export report.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink font-heading">
            Store Reports & Analytics
          </h1>
          <p className="text-sm text-ink-muted">
            Summary analysis of wholesale purchases, supplier spend, stock valuation, and order sales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrivacyMasked(!isPrivacyMasked)}
            className="gap-1.5 text-xs text-ink-muted hover:text-ink"
            title={isPrivacyMasked ? "Show monetary amounts" : "Mask costs and spend"}
          >
            {isPrivacyMasked ? <Eye size={15} /> : <EyeSlash size={15} />}
            {isPrivacyMasked ? "Show numbers" : "Privacy mask"}
          </Button>

          <Button
            variant="turmeric"
            size="sm"
            onClick={() => handleExport(activeTab)}
            disabled={isExporting}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            <DownloadSimple size={15} weight="bold" />
            {isExporting ? "Downloading..." : "Export Current Table (CSV)"}
          </Button>
        </div>
      </div>

      {/* Report Category Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("SUPPLIERS")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "SUPPLIERS"
              ? "bg-leaf text-white shadow-xs"
              : "bg-surface text-ink hover:bg-page border border-border"
          }`}
        >
          <Storefront size={16} />
          Purchases by Store ({data.suppliers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PRODUCTS")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "PRODUCTS"
              ? "bg-leaf text-white shadow-xs"
              : "bg-surface text-ink hover:bg-page border border-border"
          }`}
        >
          <Package size={16} />
          Products Price Trend ({data.productPurchases.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("VALUATION")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "VALUATION"
              ? "bg-leaf text-white shadow-xs"
              : "bg-surface text-ink hover:bg-page border border-border"
          }`}
        >
          <CurrencyInr size={16} />
          Category Stock Valuation
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("LOW_STOCK")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "LOW_STOCK"
              ? "bg-leaf text-white shadow-xs"
              : "bg-surface text-ink hover:bg-page border border-border"
          }`}
        >
          <WarningCircle size={16} />
          Stock Alerts ({data.lowStock.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ORDERS")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "ORDERS"
              ? "bg-leaf text-white shadow-xs"
              : "bg-surface text-ink hover:bg-page border border-border"
          }`}
        >
          <ClipboardText size={16} />
          Orders Summary
        </button>
      </div>

      {/* 1. SUPPLIERS REPORT */}
      {activeTab === "SUPPLIERS" && (
        <div className="space-y-4">
          <div className="text-xs text-ink-muted">
            Shows total money spent and number of purchase bills per wholesale supplier.
          </div>
          <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-page/60 hover:bg-page/60">
                  <TableHead>Wholesale Store</TableHead>
                  <TableHead>Area / Market</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center w-[110px]">Bills Count</TableHead>
                  <TableHead className="text-right w-[160px]">Total Spent</TableHead>
                  <TableHead className="w-[140px]">Last Purchase Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.suppliers.map((s) => (
                  <TableRow key={s.supplierId} className="hover:bg-page/40 transition-colors">
                    <TableCell>
                      <Link
                        href={`/admin/suppliers/${s.supplierId}`}
                        className="font-semibold text-sm text-ink hover:text-leaf underline-offset-2 hover:underline"
                      >
                        {s.supplierName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-ink-muted">
                      {s.area || "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-ink-muted">
                      {s.phone || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono bg-page px-2 py-0.5 rounded text-xs">
                        {s.billCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-sm text-ink">
                      {isPrivacyMasked ? "••••••" : formatINR(s.totalSpent)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-ink-muted">
                      {s.lastPurchaseDate || "None"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 2. PRODUCT PURCHASE REPORT */}
      {activeTab === "PRODUCTS" && (
        <div className="space-y-4">
          <div className="text-xs text-ink-muted">
            Analyzes purchase volume and minimum, maximum, and average rates paid across all wholesale bills.
          </div>
          <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-page/60 hover:bg-page/60">
                  <TableHead>Product</TableHead>
                  <TableHead className="w-[130px]">Category</TableHead>
                  <TableHead className="text-right w-[120px]">Qty Bought</TableHead>
                  <TableHead className="text-right w-[130px]">Total Spent</TableHead>
                  <TableHead className="text-right w-[110px]">Lowest Rate</TableHead>
                  <TableHead className="text-right w-[110px]">Highest Rate</TableHead>
                  <TableHead className="text-right w-[110px]">Average Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.productPurchases.map((p) => (
                  <TableRow key={p.productId} className="hover:bg-page/40 transition-colors">
                    <TableCell>
                      <Link
                        href={`/admin/products/${p.productId}`}
                        className="font-semibold text-sm text-ink hover:text-leaf underline-offset-2 hover:underline"
                      >
                        {p.productName}
                      </Link>
                      {p.productNameTamil && (
                        <div className="text-xs text-ink-muted font-tamil">
                          {p.productNameTamil}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-ink-muted">
                      {p.categoryName}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {p.totalQtyBought} {p.baseUnitSymbol}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-ink">
                      {isPrivacyMasked ? "••••" : formatINR(p.totalSpent)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-leaf font-semibold">
                      {isPrivacyMasked ? "•••" : formatINR(p.lowestRate)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-red font-semibold">
                      {isPrivacyMasked ? "•••" : formatINR(p.highestRate)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-ink">
                      {isPrivacyMasked ? "•••" : formatINR(p.avgRate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 3. CATEGORY VALUATION REPORT */}
      {activeTab === "VALUATION" && (
        <div className="space-y-4">
          <div className="text-xs text-ink-muted">
            Inventory valuation broken down by category, showing wholesale investment vs projected retail revenue.
          </div>
          <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-page/60 hover:bg-page/60">
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center w-[120px]">Products Count</TableHead>
                  <TableHead className="text-right w-[160px]">Cost Valuation</TableHead>
                  <TableHead className="text-right w-[160px]">Retail Valuation</TableHead>
                  <TableHead className="text-right w-[160px]">Potential Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.categoryValuations.map((c) => (
                  <TableRow key={c.categoryId} className="hover:bg-page/40 transition-colors">
                    <TableCell className="font-bold text-sm text-ink">
                      {c.categoryName}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono bg-page px-2 py-0.5 rounded text-xs">
                        {c.productCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-ink">
                      {isPrivacyMasked ? "••••••" : formatINR(c.costValuation)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-ink">
                      {formatINR(c.retailValuation)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-sm text-leaf">
                      {isPrivacyMasked ? "••••••" : formatINR(c.potentialProfit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 4. LOW STOCK & OUT OF STOCK REPORT */}
      {activeTab === "LOW_STOCK" && (
        <div className="space-y-4">
          <div className="text-xs text-ink-muted">
            All items whose current stock level is below or equal to their low stock alert threshold.
          </div>
          <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-page/60 hover:bg-page/60">
                  <TableHead>Product</TableHead>
                  <TableHead className="w-[140px]">Category</TableHead>
                  <TableHead className="text-right w-[120px]">Stock Level</TableHead>
                  <TableHead className="text-right w-[120px]">Threshold</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="text-right w-[120px]">Selling Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lowStock.map((item) => (
                  <TableRow key={item.productId} className="hover:bg-page/40 transition-colors">
                    <TableCell>
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="font-semibold text-sm text-ink hover:text-leaf underline-offset-2 hover:underline"
                      >
                        {item.productName}
                      </Link>
                      {item.productNameTamil && (
                        <div className="text-xs text-ink-muted font-tamil">
                          {item.productNameTamil}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-ink-muted">
                      {item.categoryName}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-sm">
                      <span className={item.status === "OUT_OF_STOCK" ? "text-red" : "text-turmeric-dark"}>
                        {item.stockQty} {item.baseUnitSymbol}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-ink-muted">
                      &le; {item.lowStockAt} {item.baseUnitSymbol}
                    </TableCell>
                    <TableCell>
                      {item.status === "OUT_OF_STOCK" ? (
                        <Badge variant="outline" className="text-red border-red/40 bg-red/5 text-[10px]">
                          Out of stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-turmeric-dark border-turmeric/40 bg-turmeric/10 text-[10px]">
                          Low stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-ink">
                      {item.sellingPrice !== null ? formatINR(item.sellingPrice) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 5. ORDERS REPORT */}
      {activeTab === "ORDERS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-5 bg-surface border-border shadow-xs space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted">
              Orders Volume by Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Total Orders Placed:</span>
                <span className="font-mono font-bold text-ink">{data.ordersSummary.totalOrders}</span>
              </div>
              <div className="flex justify-between items-center text-leaf font-medium">
                <span>Completed / Delivered:</span>
                <span className="font-mono font-bold">{data.ordersSummary.completedOrders}</span>
              </div>
              <div className="flex justify-between items-center text-turmeric-dark">
                <span>New Placed (Waiting for Accept):</span>
                <span className="font-mono">{data.ordersSummary.placedOrders}</span>
              </div>
              <div className="flex justify-between items-center text-ink-muted">
                <span>Processing / Packing:</span>
                <span className="font-mono">{data.ordersSummary.processingOrders}</span>
              </div>
              <div className="flex justify-between items-center text-ink-muted">
                <span>Ready for Pickup / Out for Delivery:</span>
                <span className="font-mono">{data.ordersSummary.readyOrders}</span>
              </div>
              <div className="flex justify-between items-center text-red">
                <span>Cancelled / Rejected:</span>
                <span className="font-mono">
                  {data.ordersSummary.cancelledOrders + data.ordersSummary.rejectedOrders}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-surface border-border shadow-xs space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted">
              Sales Revenue
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center text-ink-muted">
                <span>Total Completed Revenue:</span>
                <span className="font-mono text-xl font-bold text-leaf">
                  {formatINR(data.ordersSummary.totalSales)}
                </span>
              </div>
              <div className="flex justify-between items-center text-ink-muted pt-2 border-t border-border">
                <span>Average Order Value (AOV):</span>
                <span className="font-mono text-base font-semibold text-ink">
                  {formatINR(data.ordersSummary.averageOrderValue)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
