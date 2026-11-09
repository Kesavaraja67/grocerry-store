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
  ArrowRight,
  Info,
  SlidersHorizontal,
  Eye,
  EyeSlash,
  Sparkle,
  FloppyDisk,
  Check,
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

  // Privacy masking state (Section 6, 12, 14)
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);

  // Explainer accordion toggle
  const [showExplainer, setShowExplainer] = useState(false);

  // Row edit states: maps productId -> edited price string
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [saveSuccessMap, setSaveSuccessMap] = useState<Record<string, boolean>>({});

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
      alert("Please enter a valid positive selling price.");
      return;
    }

    if (p.mrp && num > p.mrp) {
      alert(`Selling price (₹${num}) cannot be greater than MRP (₹${p.mrp}).`);
      return;
    }

    try {
      setSavingProductId(p.id);
      await updateProductSellingPrice(p.id, num);
      setSaveSuccessMap((prev) => ({ ...prev, [p.id]: true }));
      setTimeout(() => {
        setSaveSuccessMap((prev) => ({ ...prev, [p.id]: false }));
      }, 2000);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update price.");
    } finally {
      setSavingProductId(null);
    }
  };

  const handleToggleCostBasis = async (
    p: PricingProductRow,
    newBasis: "LATEST" | "AVERAGE"
  ) => {
    try {
      await updateProductCostBasis(p.id, newBasis);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to change cost basis.");
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
      setIsBulkApplying(true);
      const res = await bulkApplyRecommendedPricing(selectedIds);
      setSelectedIds([]);
      alert(`Successfully updated selling prices for ${res.updatedCount} products.`);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Bulk price update failed.");
    } finally {
      setIsBulkApplying(false);
    }
  };

  const reviewCount = products.filter((p) => p.needsReview).length;
  const lossCount = products.filter((p) => p.isBelowCost).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink font-heading">
            Selling Prices & Markup
          </h1>
          <p className="text-sm text-ink-muted">
            Manage your shop&apos;s selling prices with profit suggestions, MRP guards, and cost change alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Privacy mask toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrivacyMasked(!isPrivacyMasked)}
            className="gap-1.5 text-xs text-ink-muted hover:text-ink"
            title={isPrivacyMasked ? "Show cost and profit values" : "Mask wholesale costs from view"}
          >
            {isPrivacyMasked ? <Eye size={15} /> : <EyeSlash size={15} />}
            {isPrivacyMasked ? "Show wholesale costs" : "Privacy mask"}
          </Button>

          {/* Markup explainer toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExplainer(!showExplainer)}
            className="gap-1.5 text-xs text-leaf border-leaf/30"
          >
            <Info size={15} />
            Markup vs Margin
          </Button>
        </div>
      </div>

      {/* Markup vs Margin Explainer Banner (Section 9.4) */}
      {showExplainer && (
        <Card className="p-4 bg-turmeric/10 border-turmeric/40 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Sparkle size={18} weight="fill" className="text-leaf" />
              Understanding Markup % vs Margin % (கடை கணக்கு விளக்கம்)
            </h3>
            <button
              onClick={() => setShowExplainer(false)}
              className="text-xs text-ink-muted hover:text-ink"
            >
              ✕ Close
            </button>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            <strong>Markup</strong> is the percentage added on top of your wholesale cost:
            <br />
            If you bought sugar at ₹80/kg and add <strong>25% markup</strong>, your selling price is <strong>₹100</strong>.
          </p>
          <p className="text-xs text-ink-muted leading-relaxed">
            <strong>Margin</strong> is the percentage of your customer&apos;s rupee that stays in your pocket as profit:
            <br />
            Selling at ₹100 gives you ₹20 profit. ₹20 / ₹100 = <strong>20% margin</strong>.
            Both numbers describe the same ₹20 profit.
          </p>
        </Card>
      )}

      {/* Filters & Bulk Actions Toolbar */}
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
              placeholder="Search by product name, Tamil name, brand..."
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
          <div className="flex rounded-lg border border-border p-1 bg-page/50 shrink-0">
            <button
              type="button"
              onClick={() => {
                setStatus("ALL");
                applyFilters(search, categoryId, "ALL");
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
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
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                status === "REVIEW"
                  ? "bg-surface text-turmeric-dark shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              To Review ({reviewCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("LOSS");
                applyFilters(search, categoryId, "LOSS");
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                status === "LOSS"
                  ? "bg-surface text-red shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Selling at Loss ({lossCount})
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-leaf/10 border border-leaf/30 p-2.5 rounded-lg text-xs">
            <span className="font-semibold text-leaf">
              {selectedIds.length} {selectedIds.length === 1 ? "product" : "products"} selected
            </span>
            <Button
              variant="turmeric"
              size="sm"
              onClick={handleBulkApplyRecommended}
              disabled={isBulkApplying}
              className="h-8 gap-1.5 font-bold text-xs"
            >
              <Sparkle size={14} weight="bold" />
              {isBulkApplying
                ? "Applying..."
                : "Apply Category Recommended Markup to Selected"}
            </Button>
          </div>
        )}
      </Card>

      {/* Pricing Master Table */}
      {products.length === 0 ? (
        <Card className="p-12 text-center bg-surface border-dashed border-border/80">
          <CurrencyInr size={48} className="mx-auto text-ink-muted mb-3 opacity-60" />
          <h3 className="text-lg font-semibold text-ink">No products found</h3>
          <p className="text-sm text-ink-muted max-w-md mx-auto mt-1">
            Try adjusting your search query or filters.
          </p>
        </Card>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-x-auto shadow-xs">
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
                <TableHead className="text-right w-[100px]">Cost / Unit</TableHead>
                <TableHead className="text-right w-[90px]">Markup %</TableHead>
                <TableHead className="text-right w-[130px]">Selling Price</TableHead>
                <TableHead className="text-right w-[100px]">Profit / Unit</TableHead>
                <TableHead className="text-right w-[90px]">MRP</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="text-right w-[80px]">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
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

                // Live recalculation if user changed input
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
                        title="Cost basis used for calculating margins"
                      >
                        <option value="LATEST">Latest</option>
                        <option value="AVERAGE">Average</option>
                      </select>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-ink">
                      {isPrivacyMasked
                        ? "••••"
                        : p.currentCost !== null
                        ? formatINR(p.currentCost)
                        : "—"}
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
                      {/* Suggestion chip quick pick */}
                      {p.suggestedRecommendedPrice !== null && (
                        <button
                          type="button"
                          onClick={() =>
                            handlePriceChange(
                              p.id,
                              String(p.suggestedRecommendedPrice)
                            )
                          }
                          className="text-[10px] text-ink-muted hover:text-leaf underline block text-right mt-0.5"
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
                      {liveIsBelowCost ? (
                        <Badge variant="outline" className="text-red border-red/40 bg-red/5 text-[10px] gap-1">
                          <XCircle size={11} weight="bold" />
                          Loss
                        </Badge>
                      ) : liveIsAboveMRP ? (
                        <Badge variant="outline" className="text-red border-red/40 bg-red/5 text-[10px] gap-1">
                          <WarningCircle size={11} weight="bold" />
                          &gt; MRP
                        </Badge>
                      ) : p.needsReview ? (
                        <Badge variant="outline" className="text-turmeric-dark border-turmeric/40 bg-turmeric/10 text-[10px] gap-1">
                          <WarningCircle size={11} weight="bold" />
                          Review
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-leaf border-leaf/40 bg-leaf/5 text-[10px] gap-1">
                          <CheckCircle size={11} weight="bold" />
                          OK
                        </Badge>
                      )}
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
      )}
    </div>
  );
}
