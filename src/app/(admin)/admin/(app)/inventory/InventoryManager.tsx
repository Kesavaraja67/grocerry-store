"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  WarningCircle,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  SlidersHorizontal,
  ClockCounterClockwise,
  DownloadSimple,
  PencilSimple,
  Plus,
  Minus,
  Equals,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR } from "@/lib/format";
import { adjustStock, getStockMovements, exportInventoryCsv } from "@/server/admin/inventory";

interface InventoryItem {
  id: string;
  name: string;
  nameTamil: string | null;
  brand: string | null;
  sizeLabel: string | null;
  category: {
    id: string;
    name: string;
    tint: string | null;
  };
  baseUnit: {
    id: string;
    symbol: string;
    label: string;
  };
  stockQty: number;
  lowStockAt: number;
  status: "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK";
  unitCost: number | null;
  costBasis: "LATEST" | "AVERAGE";
  totalValuation: number;
  sellingPrice: number | null;
  isPublished: boolean;
}

interface SummaryData {
  totalItemsCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValuation: number;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  summary: SummaryData;
  items: InventoryItem[];
  categories: CategoryOption[];
  pagination: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  currentFilters: {
    search?: string;
    categoryId?: string;
    stockFilter?: "ALL" | "LOW" | "OUT";
  };
}

interface MovementRow {
  id: string;
  type: string;
  quantityChange: number;
  stockAfter: number;
  reason: string | null;
  note: string | null;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

export function InventoryManager({
  summary,
  items,
  categories,
  pagination,
  currentFilters,
}: Props) {
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState(currentFilters.search || "");
  const [categoryId, setCategoryId] = useState(currentFilters.categoryId || "");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW" | "OUT">(
    currentFilters.stockFilter || "ALL"
  );

  // Privacy mask toggle (Section 6, 12, 14)
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);

  // Adjust stock modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<"ADD" | "REMOVE" | "SET">("ADD");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState<
    "DAMAGED" | "EXPIRED" | "COUNT_CORRECTION" | "OPENING_STOCK" | "RETURNED" | "OTHER"
  >("COUNT_CORRECTION");
  const [adjustNote, setAdjustNote] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Movements history modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Export CSV state
  const [isExporting, setIsExporting] = useState(false);

  const applyFilters = (
    newSearch = search,
    newCat = categoryId,
    newFilter = stockFilter
  ) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set("search", newSearch.trim());
    if (newCat) params.set("categoryId", newCat);
    if (newFilter !== "ALL") params.set("stockFilter", newFilter);
    router.push(`/admin/inventory?${params.toString()}`);
  };

  const handleOpenAdjust = (product: InventoryItem) => {
    setSelectedProduct(product);
    setAdjustType("ADD");
    setAdjustQuantity("");
    setAdjustReason("COUNT_CORRECTION");
    setAdjustNote("");
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setAdjustError(null);

    const qty = parseFloat(adjustQuantity);
    if (isNaN(qty) || qty <= 0) {
      setAdjustError("Please enter a valid quantity greater than zero.");
      return;
    }

    if (adjustReason === "OTHER" && !adjustNote.trim()) {
      setAdjustError("A note is required when reason is 'Other'.");
      return;
    }

    try {
      setIsAdjusting(true);
      await adjustStock({
        productId: selectedProduct.id,
        type: adjustType,
        quantity: qty,
        reason: adjustReason,
        note: adjustNote.trim() || undefined,
      });

      setIsAdjustModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setAdjustError(err instanceof Error ? err.message : "Failed to adjust stock.");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleOpenHistory = async (product: InventoryItem) => {
    setHistoryProduct(product);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const data = await getStockMovements(product.id, 50);
      setMovements(data);
    } catch {
      setMovements([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const csvContent = await exportInventoryCsv();
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `pandian-store-inventory-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to export inventory CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  // Preview computed stock in adjust modal
  let previewStock = selectedProduct ? selectedProduct.stockQty : 0;
  const parsedQty = parseFloat(adjustQuantity);
  if (!isNaN(parsedQty) && parsedQty > 0 && selectedProduct) {
    if (adjustType === "ADD") previewStock = selectedProduct.stockQty + parsedQty;
    else if (adjustType === "REMOVE") previewStock = selectedProduct.stockQty - parsedQty;
    else previewStock = parsedQty;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink font-heading">
            Stock & Inventory
          </h1>
          <p className="text-sm text-ink-muted">
            Track real-time stock levels, record damage/expiry adjustments, and check stock valuation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Privacy mask button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrivacyMasked(!isPrivacyMasked)}
            className="gap-1.5 text-xs text-ink-muted hover:text-ink"
            title={isPrivacyMasked ? "Show costs and valuation" : "Mask costs for customer privacy"}
          >
            {isPrivacyMasked ? <Eye size={15} /> : <EyeSlash size={15} />}
            {isPrivacyMasked ? "Show cost values" : "Privacy mask"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="gap-1.5 text-xs"
          >
            <DownloadSimple size={15} />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>

          <Link href="/admin/purchases/new">
            <Button variant="turmeric" size="sm" className="gap-1.5 font-semibold text-xs shadow-xs">
              <Plus size={16} weight="bold" />
              Wholesale Purchase
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-4 bg-surface border-border shadow-xs">
          <div className="text-xs text-ink-muted font-medium">Total Products</div>
          <div className="text-2xl font-bold font-mono text-ink mt-1">
            {summary.totalItemsCount}
          </div>
        </Card>

        <Card className="p-4 bg-surface border-border shadow-xs">
          <div className="text-xs text-leaf font-medium flex items-center gap-1">
            <CheckCircle size={14} weight="bold" />
            In Stock
          </div>
          <div className="text-2xl font-bold font-mono text-leaf mt-1">
            {summary.inStockCount}
          </div>
        </Card>

        <Card className="p-4 bg-surface border-border shadow-xs">
          <div className="text-xs text-turmeric-dark font-medium flex items-center gap-1">
            <WarningCircle size={14} weight="bold" />
            Low Stock
          </div>
          <div className="text-2xl font-bold font-mono text-turmeric-dark mt-1">
            {summary.lowStockCount}
          </div>
        </Card>

        <Card className="p-4 bg-surface border-border shadow-xs">
          <div className="text-xs text-red font-medium flex items-center gap-1">
            <XCircle size={14} weight="bold" />
            Out of Stock
          </div>
          <div className="text-2xl font-bold font-mono text-red mt-1">
            {summary.outOfStockCount}
          </div>
        </Card>

        <Card className="p-4 bg-surface border-border shadow-xs col-span-2 lg:col-span-1">
          <div className="text-xs text-ink-muted font-medium">Total Stock Value</div>
          <div className="text-2xl font-bold font-mono text-ink mt-1">
            {isPrivacyMasked ? "••••••" : formatINR(summary.totalStockValuation)}
          </div>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <Card className="p-4 bg-surface border-border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <Input
              type="text"
              placeholder="Search product name, Tamil name, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              className="pl-9 h-10"
            />
          </div>

          {/* Category filter */}
          <div className="w-full sm:w-56">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                applyFilters(search, e.target.value, stockFilter);
              }}
              className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-leaf font-medium"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock status tabs */}
          <div className="flex rounded-lg border border-border p-1 bg-page/50 shrink-0">
            <button
              type="button"
              onClick={() => {
                setStockFilter("ALL");
                applyFilters(search, categoryId, "ALL");
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                stockFilter === "ALL"
                  ? "bg-surface text-ink shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              All Items
            </button>
            <button
              type="button"
              onClick={() => {
                setStockFilter("LOW");
                applyFilters(search, categoryId, "LOW");
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                stockFilter === "LOW"
                  ? "bg-surface text-turmeric-dark shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Low Stock ({summary.lowStockCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStockFilter("OUT");
                applyFilters(search, categoryId, "OUT");
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                stockFilter === "OUT"
                  ? "bg-surface text-red shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Out of Stock ({summary.outOfStockCount})
            </button>
          </div>
        </div>
      </Card>

      {/* Inventory Table */}
      {items.length === 0 ? (
        <Card className="p-12 text-center bg-surface border-dashed border-border/80">
          <Package size={48} className="mx-auto text-ink-muted mb-3 opacity-60" />
          <h3 className="text-lg font-semibold text-ink">No products found</h3>
          <p className="text-sm text-ink-muted max-w-md mx-auto mt-1 mb-5">
            {search || categoryId || stockFilter !== "ALL"
              ? "Try adjusting your search query or filters to find items."
              : "Add your first product or record a wholesale purchase to start tracking inventory."}
          </p>
          <Link href="/admin/products/new">
            <Button variant="turmeric" className="gap-2 font-medium">
              <Plus size={18} weight="bold" />
              Add new product
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-page/60 hover:bg-page/60">
                  <TableHead>Product</TableHead>
                  <TableHead className="w-[140px]">Category</TableHead>
                  <TableHead className="text-right w-[130px]">Stock Level</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="text-right w-[110px]">Cost / Unit</TableHead>
                  <TableHead className="text-right w-[120px]">Stock Value</TableHead>
                  <TableHead className="text-right w-[110px]">Selling Price</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isOut = item.status === "OUT_OF_STOCK";
                  const isLow = item.status === "LOW_STOCK";

                  return (
                    <TableRow key={item.id} className="hover:bg-page/40 transition-colors">
                      <TableCell>
                        <Link
                          href={`/admin/products/${item.id}`}
                          className="font-semibold text-sm text-ink hover:text-leaf underline-offset-2 hover:underline transition-colors"
                        >
                          {item.name}
                        </Link>
                        {item.nameTamil && (
                          <div className="text-xs text-ink-muted font-tamil">
                            {item.nameTamil}
                          </div>
                        )}
                        {item.brand && (
                          <span className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">
                            {item.brand}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-ink-muted">
                        {item.category.name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span
                          className={`font-bold ${
                            isOut ? "text-red" : isLow ? "text-turmeric-dark" : "text-leaf"
                          }`}
                        >
                          {item.stockQty} {item.baseUnit.symbol}
                        </span>
                        <div className="text-[10px] text-ink-muted">
                          Alert at &le; {item.lowStockAt} {item.baseUnit.symbol}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOut ? (
                          <Badge variant="outline" className="text-red border-red/40 bg-red/5 text-[11px] gap-1">
                            <XCircle size={12} weight="bold" />
                            Out of stock
                          </Badge>
                        ) : isLow ? (
                          <Badge variant="outline" className="text-turmeric-dark border-turmeric/40 bg-turmeric/10 text-[11px] gap-1">
                            <WarningCircle size={12} weight="bold" />
                            Low stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-leaf border-leaf/40 bg-leaf/5 text-[11px] gap-1">
                            <CheckCircle size={12} weight="bold" />
                            In stock
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-ink">
                        {isPrivacyMasked
                          ? "••••"
                          : item.unitCost !== null
                          ? formatINR(item.unitCost)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-ink">
                        {isPrivacyMasked
                          ? "••••••"
                          : item.totalValuation > 0
                          ? formatINR(item.totalValuation)
                          : "₹0.00"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold text-ink">
                        {item.sellingPrice !== null ? formatINR(item.sellingPrice) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdjust(item)}
                            className="h-8 px-2 text-xs gap-1"
                            title="Adjust stock (Damage, Expiry, Correction)"
                          >
                            <SlidersHorizontal size={14} />
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenHistory(item)}
                            className="h-8 w-8 p-0 text-ink-muted hover:text-ink"
                            title="Movement history"
                          >
                            <ClockCounterClockwise size={15} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {items.map((item) => {
              const isOut = item.status === "OUT_OF_STOCK";
              const isLow = item.status === "LOW_STOCK";

              return (
                <Card
                  key={item.id}
                  className="p-4 bg-surface border-border shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <Link
                        href={`/admin/products/${item.id}`}
                        className="font-bold text-base text-ink"
                      >
                        {item.name}
                      </Link>
                      {item.nameTamil && (
                        <div className="text-xs text-ink-muted font-tamil">
                          {item.nameTamil}
                        </div>
                      )}
                      <div className="text-xs text-ink-muted mt-0.5">
                        {item.category.name}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-lg font-bold font-mono ${
                          isOut ? "text-red" : isLow ? "text-turmeric-dark" : "text-leaf"
                        }`}
                      >
                        {item.stockQty} {item.baseUnit.symbol}
                      </div>
                      <div>
                        {isOut ? (
                          <Badge variant="outline" className="text-red border-red/40 bg-red/5 text-[10px] px-1 py-0">
                            Out of stock
                          </Badge>
                        ) : isLow ? (
                          <Badge variant="outline" className="text-turmeric-dark border-turmeric/40 bg-turmeric/10 text-[10px] px-1 py-0">
                            Low stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-leaf border-leaf/40 bg-leaf/5 text-[10px] px-1 py-0">
                            In stock
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
                    <div>
                      <span className="text-ink-muted">Selling: </span>
                      <span className="font-mono font-bold text-ink">
                        {item.sellingPrice !== null ? formatINR(item.sellingPrice) : "—"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-ink-muted">Valuation: </span>
                      <span className="font-mono font-semibold text-ink">
                        {isPrivacyMasked ? "••••" : formatINR(item.totalValuation)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenHistory(item)}
                      className="h-8 px-2 text-xs gap-1 text-ink-muted"
                    >
                      <ClockCounterClockwise size={14} />
                      History
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAdjust(item)}
                      className="h-8 px-3 text-xs gap-1 font-semibold"
                    >
                      <SlidersHorizontal size={14} />
                      Adjust stock
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-ink-muted px-1">
              <div>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} products)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", String(pagination.page - 1));
                    router.push(`/admin/inventory?${params.toString()}`);
                  }}
                  className="h-8 px-3"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", String(pagination.page + 1));
                    router.push(`/admin/inventory?${params.toString()}`);
                  }}
                  className="h-8 px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Adjust Stock Modal Dialog */}
      <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAdjustSubmit}>
            <DialogHeader>
              <DialogTitle className="font-heading">Adjust Stock Quantity</DialogTitle>
              <DialogDescription className="text-xs text-ink-muted">
                {selectedProduct && (
                  <span>
                    Current stock for <strong>{selectedProduct.name}</strong> is{" "}
                    <strong className="font-mono text-ink">
                      {selectedProduct.stockQty} {selectedProduct.baseUnit.symbol}
                    </strong>
                    .
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {adjustError && (
              <div className="rounded-md border border-red/40 bg-red/5 p-3 text-xs text-red my-2">
                {adjustError}
              </div>
            )}

            <div className="space-y-4 py-3">
              {/* Type toggle: Add / Remove / Set */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Adjustment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADD")}
                    className={`py-2 px-3 rounded-md border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      adjustType === "ADD"
                        ? "bg-leaf text-white border-leaf"
                        : "bg-surface border-border text-ink hover:bg-page"
                    }`}
                  >
                    <Plus size={14} weight="bold" />
                    Add (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("REMOVE")}
                    className={`py-2 px-3 rounded-md border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      adjustType === "REMOVE"
                        ? "bg-red text-white border-red"
                        : "bg-surface border-border text-ink hover:bg-page"
                    }`}
                  >
                    <Minus size={14} weight="bold" />
                    Remove (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("SET")}
                    className={`py-2 px-3 rounded-md border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      adjustType === "SET"
                        ? "bg-turmeric text-ink border-turmeric"
                        : "bg-surface border-border text-ink hover:bg-page"
                    }`}
                  >
                    <Equals size={14} weight="bold" />
                    Set Count (=)
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  {adjustType === "SET" ? "Counted Stock" : "Quantity"}{" "}
                  {selectedProduct && `(${selectedProduct.baseUnit.symbol})`} <span className="text-red">*</span>
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder="e.g. 5"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  required
                  className="h-11 font-mono font-semibold"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Reason <span className="text-red">*</span>
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value as typeof adjustReason)}
                  required
                  className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-leaf font-medium"
                >
                  <option value="COUNT_CORRECTION">Count Correction / Physical Audit</option>
                  <option value="DAMAGED">Damaged Goods (சேதம்)</option>
                  <option value="EXPIRED">Expired Goods (காலாவதியானது)</option>
                  <option value="OPENING_STOCK">Opening Stock Entry</option>
                  <option value="RETURNED">Customer Return</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Note / Remarks {adjustReason === "OTHER" && <span className="text-red">*</span>}
                </label>
                <Input
                  placeholder="e.g. Rat damage, packet leak, recount before Diwali"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  required={adjustReason === "OTHER"}
                  className="h-10 text-xs"
                />
              </div>

              {/* Live Preview */}
              {selectedProduct && (
                <div className="p-3 rounded-lg bg-page/70 border border-border/80 flex items-center justify-between text-xs">
                  <span className="text-ink-muted">New Stock After Adjustment:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      previewStock < 0 ? "text-red" : "text-leaf"
                    }`}
                  >
                    {previewStock} {selectedProduct.baseUnit.symbol}
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdjustModalOpen(false)}
                disabled={isAdjusting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="turmeric"
                disabled={isAdjusting || previewStock < 0}
                className="font-bold"
              >
                {isAdjusting ? "Updating..." : "Confirm Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Movement History Modal Dialog */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Stock Movement History
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              {historyProduct && (
                <span>
                  Log of all purchases, sales, and manual adjustments for{" "}
                  <strong>{historyProduct.name}</strong>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoadingHistory ? (
            <div className="py-8 text-center text-xs text-ink-muted">
              Loading movements history...
            </div>
          ) : movements.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-muted">
              No recorded stock movements for this item yet.
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {movements.map((m) => {
                const isPositive = m.quantityChange > 0;
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg border border-border/70 bg-page/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-ink-muted">{m.createdAt.split("T")[0]}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                          {m.type.replace("_", " ")}
                        </Badge>
                        {m.reason && (
                          <span className="text-[11px] text-ink-muted">
                            ({m.reason.replace("_", " ")})
                          </span>
                        )}
                      </div>
                      {m.note && (
                        <div className="text-[11px] text-ink-muted mt-0.5 italic">
                          &ldquo;{m.note}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-mono font-bold text-sm ${
                          isPositive ? "text-leaf" : "text-red"
                        }`}
                      >
                        {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        Balance: {m.stockAfter}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

