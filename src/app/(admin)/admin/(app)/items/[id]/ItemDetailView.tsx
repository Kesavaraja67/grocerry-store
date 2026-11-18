"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  PencilSimple,
  CheckCircle,
  WarningCircle,
  Plus,
  Minus,
  Trash,
  Tag,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { adjustStock } from "@/server/admin/inventory";
import { addAliasToProduct, removeAliasFromProduct, updateProduct, toggleProductPublish } from "@/server/admin/products";
import { PriceSlider } from "@/components/admin/PriceSlider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { copy } from "@/lib/copy";

interface ItemDetailProps {
  product: any;
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; label: string; symbol: string }>;
}

export function ItemDetailView({ product, categories, units }: ItemDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Stock fix state
  const [stockType, setStockType] = useState<"ADD" | "REMOVE" | "SET">("ADD");
  const [stockQtyInput, setStockQtyInput] = useState<string>("");
  const [stockReason, setStockReason] = useState<"DAMAGED" | "EXPIRED" | "COUNT_CORRECTION">("COUNT_CORRECTION");
  const [stockMessage, setStockMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Nicknames (aliases) state
  const [newAlias, setNewAlias] = useState("");
  const [aliases, setAliases] = useState<string[]>(product.aliases || []);

  // Edit item dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: product.name,
    nameTamil: product.nameTamil || "",
    brand: product.brand || "",
    categoryId: product.categoryId,
    baseUnitId: product.baseUnitId,
    mrp: product.mrp ?? "",
    isPublished: product.isPublished,
  });
  const [editError, setEditError] = useState<string | null>(null);

  // Active cost for pricing
  const currentCost = product.cost?.lastCost ?? product.cost?.avgCost ?? 0;
  const lastPurchase = product.purchaseHistory?.[0] || null;

  const handleStockAdjust = () => {
    const qty = Number(stockQtyInput);
    if (!qty || qty <= 0) {
      setStockMessage({ type: "error", text: "Please enter a valid quantity." });
      return;
    }

    setStockMessage(null);
    startTransition(async () => {
      try {
        const res = await adjustStock({
          productId: product.id,
          type: stockType,
          quantity: qty,
          reason: stockReason,
          note: `Manual stock adjustment (${stockType}) via admin items page`,
        });

        if (res.success) {
          setStockMessage({ type: "success", text: `Stock updated successfully.` });
          setStockQtyInput("");
          router.refresh();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update stock.";
        setStockMessage({ type: "error", text: msg });
      }
    });
  };

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlias.trim()) return;

    startTransition(async () => {
      const res = await addAliasToProduct(product.id, newAlias);
      if (res.success && res.aliases) {
        setAliases(res.aliases);
        setNewAlias("");
      }
    });
  };

  const handleRemoveAlias = async (alias: string) => {
    startTransition(async () => {
      const res = await removeAliasFromProduct(product.id, alias);
      if (res.success && res.aliases) {
        setAliases(res.aliases);
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    startTransition(async () => {
      try {
        await updateProduct(product.id, {
          name: editForm.name,
          nameTamil: editForm.nameTamil || null,
          brand: editForm.brand || null,
          categoryId: editForm.categoryId,
          baseUnitId: editForm.baseUnitId,
          mrp: editForm.mrp !== "" ? Number(editForm.mrp) : null,
          isPublished: editForm.isPublished,
          sellStep: product.sellStep,
          minQty: product.minQty,
          maxQty: product.maxQty,
          lowStockAt: product.lowStockAt,
        });
        setEditOpen(false);
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update item.";
        setEditError(msg);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/items"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf hover:underline p-1 min-h-[44px]"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>All items</span>
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
          className="gap-1.5 text-xs font-semibold min-h-[40px]"
        >
          <PencilSimple size={15} />
          <span>Edit details</span>
        </Button>
      </div>

      {/* Summary Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-ink leading-tight font-heading">
              {product.name}
            </h1>
            {product.nameTamil && (
              <p className="text-sm font-medium text-muted font-tamil mt-0.5">
                {product.nameTamil}
              </p>
            )}
            <p className="text-xs text-muted mt-1">
              {product.category?.name} · Stock unit: {product.baseUnit?.symbol}
            </p>
          </div>

          <div
            className="w-14 h-14 rounded-2xl bg-page border border-border flex items-center justify-center shrink-0 overflow-hidden"
            style={{ backgroundColor: product.category?.tint || undefined }}
          >
            {product.images?.[0]?.url ? (
              <img
                src={product.images[0].url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package size={26} className="text-leaf" />
            )}
          </div>
        </div>

        {/* 4 Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/70 text-xs">
          <div className="p-2.5 rounded-xl bg-page border border-border">
            <p className="text-muted">Stock</p>
            <p className="text-base font-bold font-mono text-ink mt-0.5">
              {product.stockQty} {product.baseUnit?.symbol}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-page border border-border">
            <p className="text-muted">Selling price</p>
            <p className="text-base font-bold font-mono text-ink mt-0.5">
              {product.sellingPrice ? `₹${product.sellingPrice}` : "Not set"}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-page border border-border">
            <p className="text-muted">You paid</p>
            <p className="text-base font-bold font-mono text-ink mt-0.5">
              {currentCost > 0 ? `₹${currentCost}` : "—"}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-page border border-border">
            <p className="text-muted">MRP</p>
            <p className="text-base font-bold font-mono text-ink mt-0.5">
              {product.mrp ? `₹${product.mrp}` : "No MRP"}
            </p>
          </div>
        </div>

        {/* Last purchase info */}
        {lastPurchase && (
          <p className="text-xs text-muted pt-1">
            Last bought from{" "}
            <Link
              href={`/admin/shops/${lastPurchase.supplierId}`}
              className="text-leaf font-bold hover:underline"
            >
              {lastPurchase.supplierName}
            </Link>{" "}
            at ₹{lastPurchase.unitCost}/{product.baseUnit?.symbol} on{" "}
            {new Date(lastPurchase.purchaseDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            .
          </p>
        )}
      </div>

      {/* Selling Price Slider */}
      <PriceSlider
        productId={product.id}
        unitSymbol={product.baseUnit?.symbol || "unit"}
        cost={currentCost}
        mrp={product.mrp}
        currentPrice={product.sellingPrice}
        recommendedMarkupPercent={product.category?.recommendedMarkup || 10}
        onPriceSaved={() => router.refresh()}
      />

      {/* Stock Fix Section */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-base text-ink font-heading">
            {copy.admin.itemDetail.stockSection.en}
          </h3>
          <p className="text-xs text-muted">
            Add or subtract damaged, expired, or recounted stock.
          </p>
        </div>

        {/* Type Toggle: Add / Remove / Set */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "ADD", label: "+ Add", icon: Plus },
              { id: "REMOVE", label: "− Remove", icon: Minus },
              { id: "SET", label: "Set exact", icon: Package },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setStockType(t.id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold min-h-[44px] transition-all ${
                stockType === t.id
                  ? "bg-leaf text-white border-leaf shadow-xs"
                  : "bg-page text-ink border-border hover:bg-leaf-light hover:text-leaf"
              }`}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Reason Chips */}
        <div>
          <p className="text-xs text-muted mb-1.5 font-medium">Reason</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "DAMAGED", label: copy.admin.itemDetail.reasonDamaged.en },
                { id: "EXPIRED", label: copy.admin.itemDetail.reasonExpired.en },
                { id: "COUNT_CORRECTION", label: copy.admin.itemDetail.reasonCorrection.en },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setStockReason(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border min-h-[38px] transition-all ${
                  stockReason === r.id
                    ? "bg-ink text-white border-ink"
                    : "bg-page text-muted border-border hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Input & Apply */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              step="any"
              min="0"
              placeholder={`Quantity (${product.baseUnit?.symbol})`}
              value={stockQtyInput}
              onChange={(e) => setStockQtyInput(e.target.value)}
              className="h-11 font-mono text-sm"
            />
          </div>
          <Button
            type="button"
            variant="default"
            onClick={handleStockAdjust}
            disabled={isPending || !stockQtyInput}
            className="h-11 px-5 font-bold text-xs shrink-0 min-h-[44px]"
          >
            {isPending ? "Updating..." : "Update stock"}
          </Button>
        </div>

        {stockMessage && (
          <p
            className={`text-xs p-2.5 rounded-xl border ${
              stockMessage.type === "success"
                ? "bg-leaf-light text-leaf border-[#D5E3DA]"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {stockMessage.text}
          </p>
        )}
      </div>

      {/* Nicknames / Aliases (Voice Search) */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div>
          <h3 className="font-bold text-base text-ink font-heading">
            {copy.admin.itemDetail.aliases.en}
          </h3>
          <p className="text-xs text-muted">
            Other names customers or wholesale shops use. Voice search matches these words.
          </p>
        </div>

        {/* Aliases list */}
        <div className="flex flex-wrap gap-2">
          {aliases.length === 0 ? (
            <p className="text-xs text-muted italic">No nicknames added yet.</p>
          ) : (
            aliases.map((alias) => (
              <span
                key={alias}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-page border border-border text-xs font-medium text-ink"
              >
                <Tag size={13} className="text-leaf" />
                <span>{alias}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAlias(alias)}
                  className="text-muted hover:text-red p-0.5 rounded"
                  title={`Remove nickname "${alias}"`}
                  aria-label={`Remove nickname "${alias}"`}
                >
                  <Trash size={13} />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Add Alias Form */}
        <form onSubmit={handleAddAlias} className="flex items-center gap-2 pt-1">
          <Input
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            placeholder="Add nickname (e.g. thengai ennai)"
            className="h-10 text-xs flex-1"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={!newAlias.trim() || isPending}
            className="h-10 text-xs font-semibold shrink-0 min-h-[40px]"
          >
            Add
          </Button>
        </form>
      </div>

      {/* Bought Before (Past Purchases) */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <ClockCounterClockwise size={18} weight="bold" className="text-muted" />
          <h3 className="font-bold text-base text-ink font-heading">
            {copy.admin.itemDetail.boughtFrom.en}
          </h3>
        </div>

        {(!product.purchaseHistory || product.purchaseHistory.length === 0) ? (
          <p className="text-xs text-muted py-2">
            No wholesale purchase bills recorded for this item yet.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {product.purchaseHistory.map((pi: any) => (
              <div
                key={pi.id}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <Link
                    href={`/admin/shops/${pi.supplierId}`}
                    className="font-bold text-ink hover:text-leaf hover:underline"
                  >
                    {pi.supplierName}
                  </Link>
                  <p className="text-[11px] text-muted">
                    {new Date(pi.purchaseDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {pi.quantity} {pi.unitSymbol}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold font-mono text-ink">
                    ₹{pi.unitCost}/{product.baseUnit?.symbol}
                  </p>
                  <p className="text-[10px] text-muted font-mono">
                    Total: ₹{pi.lineAmount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Details Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit item details</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            {editError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {editError}
              </p>
            )}

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Item name
              </label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                className="h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Tamil name
              </label>
              <Input
                value={editForm.nameTamil}
                onChange={(e) => setEditForm({ ...editForm, nameTamil: e.target.value })}
                placeholder="e.g. பொன்னி அரிசி"
                className="h-10 font-tamil"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Category
                </label>
                <select
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-border bg-page text-xs text-ink focus:outline-none focus:ring-2 focus:ring-leaf"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Unit
                </label>
                <select
                  value={editForm.baseUnitId}
                  onChange={(e) => setEditForm({ ...editForm, baseUnitId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-border bg-page text-xs text-ink focus:outline-none focus:ring-2 focus:ring-leaf"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                MRP (Maximum Retail Price)
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Optional"
                value={editForm.mrp}
                onChange={(e) => setEditForm({ ...editForm, mrp: e.target.value })}
                className="h-10 font-mono"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={editForm.isPublished}
                onChange={(e) => setEditForm({ ...editForm, isPublished: e.target.checked })}
                className="h-4 w-4 rounded border-border text-leaf focus:ring-leaf"
              />
              <span>Visible in customer store</span>
            </label>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="h-10 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={isPending}
                className="h-10 text-xs font-bold"
              >
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

