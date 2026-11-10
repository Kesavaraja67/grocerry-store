"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CurrencyInr,
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  XCircle,
  Info,
  Eye,
  EyeSlash,
  Sparkle,
  FloppyDisk,
  Check,
  Receipt,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type PricingProductRow,
  updateProductSellingPrice,
  bulkApplyRecommendedPricing,
  updateProductCostBasis,
} from "@/server/admin/pricing";
import { calculatePriceMetrics } from "@/server/domain/pricing";

interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  products: PricingProductRow[];
  categories: CategoryOption[];
  currentFilters: {
    search?: string;
    categoryId?: string;
    status?: "ALL" | "REVIEW" | "LOSS" | "NO_PRICE";
  };
}

export function PricingManager({ products, categories, currentFilters }: Props) {
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState(currentFilters.search || "");
  const [categoryId, setCategoryId] = useState(currentFilters.categoryId || "");
  const [status, setStatus] = useState<"ALL" | "REVIEW" | "LOSS" | "NO_PRICE">(
    currentFilters.status || "ALL"
  );

  // Privacy masking state
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);

  // Explainer accordion toggle
  const [showExplainer, setShowExplainer] = useState(false);

  // Row edit states
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [saveSuccessMap, setSaveSuccessMap] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  const applyFilters = (
    newSearch = search,
    newCat = categoryId,
    newStat = status
  ) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set("search", newSearch.trim());
    if (newCat) params.set("categoryId", newCat);
    if (newStat !== "ALL") params.set("status", newStat);
    router.push(`/admin/pricing?${params.toString()}`);
  };

  const handlePriceChange = (productId: string, val: string) => {
    setEditedPrices((prev) => ({ ...prev, [productId]: val }));
  };

  const handleSavePrice = async (p: PricingProductRow) => {
    const rawVal = editedPrices[p.id];
    if (rawVal === undefined) return;

    const num = parseFloat(rawVal);
    if (isNaN(num) || num <= 0) {
      setFeedback({ type: "error", text: `Enter a valid positive price for ${p.name}.` });
      return;
    }

    if (p.mrp && num > p.mrp) {
      setFeedback({
        type: "error",
        text: `Selling price (₹${num}) for ${p.name} cannot exceed MRP (₹${p.mrp}).`,
      });
      return;
    }

    try {
      setFeedback(null);
      setSavingProductId(p.id);
      await updateProductSellingPrice(p.id, num);
      setSaveSuccessMap((prev) => ({ ...prev, [p.id]: true }));
      setTimeout(() => {
        setSaveSuccessMap((prev) => ({ ...prev, [p.id]: false }));
      }, 2000);
      router.refresh();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update price.",
      });
    } finally {
      setSavingProductId(null);
    }
  };

  const handleToggleCostBasis = async (
    p: PricingProductRow,
    newBasis: "LATEST" | "AVERAGE"
  ) => {
    try {
      setFeedback(null);
      await updateProductCostBasis(p.id, newBasis);
      router.refresh();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to change cost basis.",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(products.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkApplyRecommended = async () => {
    if (selectedIds.length === 0) return;
    try {
      setFeedback(null);
      setIsBulkApplying(true);
      const res = await bulkApplyRecommendedPricing(selectedIds);
      setSelectedIds([]);
      setFeedback({
        type: "success",
        text: `Updated selling prices for ${res.updatedCount} ${
          res.updatedCount === 1 ? "product" : "products"
        }.`,
      });
      router.refresh();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Bulk price update failed.",
      });
    } finally {
      setIsBulkApplying(false);
    }
  };

  const reviewCount = products.filter((p) => p.needsReview).length;
  const lossCount = products.filter((p) => p.isBelowCost).length;

  const computeRowState = (p: PricingProductRow) => {
    const currentEnteredPrice =
      editedPrices[p.id] !== undefined
        ? editedPrices[p.id]
        : p.sellingPrice !== null
        ? String(p.sellingPrice)
        : "";

    const parsedPrice = parseFloat(currentEnteredPrice);
    const isEdited =
      editedPrices[p.id] !== undefined &&
      parseFloat(editedPrices[p.id]) !== p.sellingPrice;

    let liveProfit = p.profitPerUnit;
    let liveMarkup = p.markupPercent;
    let liveIsBelowCost = p.isBelowCost;
    let liveIsAboveMRP = p.isAboveMRP;

    if (!isNaN(parsedPrice) && p.currentCost !== null && p.currentCost > 0) {
      const m = calculatePriceMetrics(parsedPrice, p.currentCost, p.mrp);
      liveProfit = m.profitPerUnit.toNumber();
      liveMarkup = m.markupPercent.toNumber();
      liveIsBelowCost = m.isBelowCost;
      liveIsAboveMRP = m.isAboveMRP;
    }

    return {
      currentEnteredPrice,
      isEdited,
      liveProfit,
      liveMarkup,
      liveIsBelowCost,
      liveIsAboveMRP,
    };
  };

  const renderStatusBadge = (
    liveIsBelowCost: boolean,
    liveIsAboveMRP: boolean,
    needsReview: boolean
  ) => {
    if (liveIsBelowCost) {
      return (
        <Badge variant="outline" className="text-red border-red/40 bg-red/5 text-[10px] gap-1 shrink-0">
          <XCircle size={11} weight="bold" />
          Loss
        </Badge>
      );
    }
    if (liveIsAboveMRP) {
      return (
        <Badge variant="outline" className="text-red border-red/40 bg-red/5 text-[10px] gap-1 shrink-0">
          <WarningCircle size={11} weight="bold" />
          &gt; MRP
        </Badge>
      );
    }
    if (needsReview) {
      return (
        <Badge variant="outline" className="text-turmeric-dark border-turmeric/40 bg-turmeric/10 text-[10px] gap-1 shrink-0">
          <WarningCircle size={11} weight="bold" />
          Review
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-leaf border-leaf/40 bg-leaf/5 text-[10px] gap-1 shrink-0">
        <CheckCircle size={11} weight="bold" />
        OK
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-heading">
            Selling Prices &amp; Markup
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted">
            Manage your shop&apos;s selling prices with profit suggestions, MRP guards, and cost change alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrivacyMasked(!isPrivacyMasked)}
            className="gap-1.5 text-xs text-ink-muted hover:text-ink"
          >
            {isPrivacyMasked ? <Eye size={15} /> : <EyeSlash size={15} />}
            {isPrivacyMasked ? "Show costs" : "Privacy mask"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExplainer(!showExplainer)}
            className="gap-1.5 text-xs text-leaf border-leaf/30"
          >
            <Info size={15} />
            How prices &amp; costs work
          </Button>
        </div>
      </div>

      {/* Quick Guide Banner (Always shows crisp 2-line instructions or expanded explainer) */}
      <Card className="p-3.5 bg-leaf-light/50 border border-leaf/25 text-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-ink">
          <div className="space-y-1">
            <div>
              <strong className="text-leaf">To change Selling Price:</strong> Type a new amount in any product&apos;s <strong>Sell Price (₹)</strong> box (or tap <strong>Rec</strong>) and click <strong>Save</strong>.
            </div>
            <div>
              <strong className="text-leaf">To change Price Bought (Wholesale Cost):</strong> Open{" "}
              <Link href="/admin/purchases" className="font-semibold text-leaf underline">
                Wholesale Purchases
              </Link>
              , select the bill, and click <strong>Correct / Replace Bill</strong> so stock and average cost stay accurate.
            </div>
          </div>
        </div>

        {showExplainer && (
          <div className="pt-2 border-t border-leaf/20 space-y-1.5 text-ink-muted leading-relaxed">
            <p>
              <strong>Markup %</strong> is added on top of wholesale cost: bought at ₹80 + 25% markup = <strong>₹100</strong> selling price.
            </p>
            <p>
              <strong>Margin %</strong> is your profit out of the selling price: ₹20 profit / ₹100 selling price = <strong>20% margin</strong>.
            </p>
          </div>
        )}
      </Card>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 ${
            feedback.type === "error"
              ? "bg-red-light border-red/30 text-red"
              : "bg-leaf-light border-leaf/30 text-leaf"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters & Bulk Actions Toolbar */}
      <Card className="p-3.5 sm:p-4 bg-surface border-border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <Input
              type="text"
              placeholder="Search product, Tamil name, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              className="pl-9 h-10"
            />
          </div>

          {/* Category filter */}
          <div className="w-full sm:w-52">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                applyFilters(search, e.target.value, status);
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

          {/* Status filter tabs */}
          <div className="grid grid-cols-3 sm:flex rounded-lg border border-border p-1 bg-page/50 shrink-0 gap-1">
            <button
              type="button"
              onClick={() => {
                setStatus("ALL");
                applyFilters(search, categoryId, "ALL");
              }}
              className={`px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors truncate ${
                status === "ALL"
                  ? "bg-surface text-ink shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              All Items
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("REVIEW");
                applyFilters(search, categoryId, "REVIEW");
              }}
              className={`px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors truncate ${
                status === "REVIEW"
                  ? "bg-surface text-turmeric-dark shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Review ({reviewCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("LOSS");
                applyFilters(search, categoryId, "LOSS");
              }}
              className={`px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors truncate ${
                status === "LOSS"
                  ? "bg-surface text-red shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Loss ({lossCount})
            </button>
          </div>
        </div>

        {/* Bulk Action Bar — wraps cleanly on narrow mobile viewports */}
        {selectedIds.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-leaf/10 border border-leaf/30 p-3 rounded-lg text-xs">
            <span className="font-semibold text-leaf">
              {selectedIds.length} {selectedIds.length === 1 ? "product" : "products"} selected
            </span>
            <Button
              variant="turmeric"
              size="sm"
              onClick={handleBulkApplyRecommended}
              disabled={isBulkApplying}
              className="w-full sm:w-auto h-auto min-h-[38px] py-2 px-3 gap-1.5 font-bold text-xs whitespace-normal text-center leading-snug"
            >
              <Sparkle size={14} weight="bold" className="shrink-0" />
              <span>
                {isBulkApplying
                  ? "Applying..."
                  : "Apply Recommended Markup to Selected"}
              </span>
            </Button>
          </div>
        )}
      </Card>

      {/* Pricing Content */}
      {products.length === 0 ? (
        <Card className="p-12 text-center bg-surface border-dashed border-border/80">
          <CurrencyInr size={48} className="mx-auto text-ink-muted mb-3 opacity-60" />
          <h3 className="text-lg font-semibold text-ink">No products found</h3>
          <p className="text-sm text-ink-muted max-w-md mx-auto mt-1">
            Try adjusting your search query or filters.
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile Cards View (< md): zero horizontal clipping, full inline edit */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-ink-muted">
              <label className="inline-flex items-center gap-2 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={products.length > 0 && selectedIds.length === products.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-leaf focus:ring-leaf"
                />
                <span>Select all ({products.length})</span>
              </label>
              <span>Tap any box to edit</span>
            </div>

            {products.map((p) => {
              const {
                currentEnteredPrice,
                isEdited,
                liveProfit,
                liveMarkup,
                liveIsBelowCost,
                liveIsAboveMRP,
              } = computeRowState(p);

              return (
                <Card
                  key={p.id}
                  className={`p-3.5 space-y-3 border transition-colors ${
                    liveIsBelowCost
                      ? "bg-red/5 border-red/30"
                      : p.needsReview
                      ? "bg-turmeric/5 border-turmeric/40"
                      : "bg-surface border-border"
                  }`}
                >
                  {/* Card Top: Checkbox + Name + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => handleToggleSelect(p.id)}
                        className="mt-1 h-4 w-4 rounded border-border text-leaf focus:ring-leaf shrink-0"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-semibold text-sm text-ink hover:text-leaf block truncate"
                        >
                          {p.name}
                        </Link>
                        {p.nameTamil && (
                          <div className="text-xs text-ink-muted font-tamil truncate">
                            {p.nameTamil}
                          </div>
                        )}
                        <div className="text-[11px] text-ink-muted">{p.categoryName}</div>
                      </div>
                    </div>
                    {renderStatusBadge(liveIsBelowCost, liveIsAboveMRP, p.needsReview)}
                  </div>

                  {/* Cost & Profit Strip */}
                  <div className="grid grid-cols-3 gap-2 rounded-md bg-page/70 p-2.5 text-xs border border-border/60">
                    <div>
                      <div className="text-[10px] text-ink-muted">Bought Cost</div>
                      <div className="font-mono font-bold text-ink">
                        {isPrivacyMasked
                          ? "••••"
                          : p.currentCost !== null
                          ? formatINR(p.currentCost)
                          : "—"}
                      </div>
                      <select
                        value={p.costBasis}
                        onChange={(e) =>
                          handleToggleCostBasis(p, e.target.value as "LATEST" | "AVERAGE")
                        }
                        className="mt-1 h-6 text-[10px] rounded border border-border bg-surface px-1 text-ink w-full"
                      >
                        <option value="LATEST">Latest</option>
                        <option value="AVERAGE">Average</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-[10px] text-ink-muted">Profit / Unit</div>
                      <div
                        className={`font-mono font-bold ${
                          liveProfit !== null && liveProfit < 0 ? "text-red" : "text-leaf"
                        }`}
                      >
                        {isPrivacyMasked
                          ? "••••"
                          : liveProfit !== null
                          ? formatINR(liveProfit)
                          : "—"}
                      </div>
                      <div className="text-[10px] text-ink-muted font-mono mt-0.5">
                        {liveMarkup !== null ? `+${liveMarkup}%` : ""}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-ink-muted">MRP</div>
                      <div className="font-mono font-semibold text-ink">
                        {p.mrp !== null ? formatINR(p.mrp) : "—"}
                      </div>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="text-[10px] text-leaf underline inline-flex items-center gap-0.5 mt-1"
                      >
                        <Receipt size={10} />
                        Bills
                      </Link>
                    </div>
                  </div>

                  {/* Selling Price Input + Suggestion + Save */}
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-ink">Sell Price (₹)</span>
                        {p.suggestedRecommendedPrice !== null && (
                          <button
                            type="button"
                            onClick={() =>
                              handlePriceChange(p.id, String(p.suggestedRecommendedPrice))
                            }
                            className="text-leaf font-semibold underline"
                          >
                            Use Rec: ₹{p.suggestedRecommendedPrice}
                          </button>
                        )}
                      </div>
                      <Input
                        type="number"
                        step="any"
                        value={currentEnteredPrice}
                        onChange={(e) => handlePriceChange(p.id, e.target.value)}
                        placeholder="Enter ₹ price"
                        className={`h-10 font-mono text-sm font-bold ${
                          isEdited ? "border-turmeric bg-turmeric/10" : ""
                        }`}
                      />
                    </div>

                    {saveSuccessMap[p.id] ? (
                      <div className="h-10 px-3 rounded-md bg-leaf-light text-leaf flex items-center gap-1 text-xs font-bold shrink-0">
                        <Check size={14} weight="bold" /> Saved
                      </div>
                    ) : (
                      <Button
                        variant={isEdited ? "turmeric" : "outline"}
                        size="sm"
                        disabled={!isEdited || savingProductId === p.id}
                        onClick={() => handleSavePrice(p)}
                        className="h-10 px-3.5 font-semibold text-xs gap-1.5 shrink-0"
                      >
                        <FloppyDisk size={15} />
                        <span>{savingProductId === p.id ? "..." : "Save"}</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block rounded-lg border border-border bg-surface overflow-x-auto shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-page/60 hover:bg-page/60">
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={
                        products.length > 0 && selectedIds.length === products.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-border text-leaf focus:ring-leaf"
                    />
                  </TableHead>
                  <TableHead className="min-w-[180px]">Product</TableHead>
                  <TableHead className="w-[120px]">Category</TableHead>
                  <TableHead className="w-[110px]">Cost Basis</TableHead>
                  <TableHead className="text-right w-[100px]">Bought Cost</TableHead>
                  <TableHead className="text-right w-[90px]">Markup %</TableHead>
                  <TableHead className="text-right w-[130px]">Selling Price</TableHead>
                  <TableHead className="text-right w-[100px]">Profit / Unit</TableHead>
                  <TableHead className="text-right w-[90px]">MRP</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[80px]">Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const {
                    currentEnteredPrice,
                    isEdited,
                    liveProfit,
                    liveMarkup,
                    liveIsBelowCost,
                    liveIsAboveMRP,
                  } = computeRowState(p);

                  return (
                    <TableRow
                      key={p.id}
                      className={`hover:bg-page/40 transition-colors ${
                        liveIsBelowCost
                          ? "bg-red/5"
                          : p.needsReview
                          ? "bg-turmeric/5"
                          : ""
                      }`}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => handleToggleSelect(p.id)}
                          className="rounded border-border text-leaf focus:ring-leaf"
                        />
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-semibold text-sm text-ink hover:text-leaf underline-offset-2 hover:underline transition-colors"
                        >
                          {p.name}
                        </Link>
                        {p.nameTamil && (
                          <div className="text-xs text-ink-muted font-tamil">
                            {p.nameTamil}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-ink-muted">
                        {p.categoryName}
                      </TableCell>

                      <TableCell>
                        <select
                          value={p.costBasis}
                          onChange={(e) =>
                            handleToggleCostBasis(
                              p,
                              e.target.value as "LATEST" | "AVERAGE"
                            )
                          }
                          className="h-7 text-[11px] rounded border border-border bg-surface px-1.5 text-ink focus:outline-none focus:ring-1 focus:ring-leaf font-medium"
                        >
                          <option value="LATEST">Latest</option>
                          <option value="AVERAGE">Average</option>
                        </select>
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs text-ink">
                        <div>
                          {isPrivacyMasked
                            ? "••••"
                            : p.currentCost !== null
                            ? formatINR(p.currentCost)
                            : "—"}
                        </div>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="text-[10px] text-leaf hover:underline font-sans"
                        >
                          View bills
                        </Link>
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs">
                        {liveMarkup !== null ? (
                          <span
                            className={`font-semibold ${
                              liveIsBelowCost ? "text-red" : "text-ink"
                            }`}
                          >
                            {liveMarkup}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-ink-muted">₹</span>
                          <Input
                            type="number"
                            step="any"
                            value={currentEnteredPrice}
                            onChange={(e) => handlePriceChange(p.id, e.target.value)}
                            placeholder="Set price"
                            className={`h-8 w-24 text-right font-mono text-xs font-bold ${
                              isEdited
                                ? "border-turmeric focus:ring-turmeric bg-turmeric/10"
                                : ""
                            }`}
                          />
                        </div>
                        {p.suggestedRecommendedPrice !== null && (
                          <button
                            type="button"
                            onClick={() =>
                              handlePriceChange(
                                p.id,
                                String(p.suggestedRecommendedPrice)
                              )
                            }
                            className="text-[10px] text-ink-muted hover:text-leaf underline block text-right mt-0.5 ml-auto"
                            title="Click to apply recommended markup"
                          >
                            Rec: ₹{p.suggestedRecommendedPrice}
                          </button>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs">
                        {isPrivacyMasked ? (
                          "••••"
                        ) : liveProfit !== null ? (
                          <span
                            className={`font-semibold ${
                              liveProfit < 0 ? "text-red" : "text-leaf"
                            }`}
                          >
                            {formatINR(liveProfit)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs text-ink-muted">
                        {p.mrp !== null ? formatINR(p.mrp) : "—"}
                      </TableCell>

                      <TableCell>
                        {renderStatusBadge(liveIsBelowCost, liveIsAboveMRP, p.needsReview)}
                      </TableCell>

                      <TableCell className="text-right">
                        {saveSuccessMap[p.id] ? (
                          <span className="text-leaf inline-flex items-center gap-0.5 text-xs font-bold">
                            <Check size={14} weight="bold" /> Saved
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!isEdited || savingProductId === p.id}
                            onClick={() => handleSavePrice(p)}
                            className="h-8 px-2 text-xs"
                            title="Save price change"
                          >
                            <FloppyDisk size={15} />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
