"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Storefront,
  Package,
  ShoppingCart,
  Plus,
  Trash,
  CheckCircle,
  WarningCircle,
  MagnifyingGlass,
  CaretRight,
  CaretDown,
  ArrowLeft,
  Calendar,
  Receipt,
  Truck,
} from "@phosphor-icons/react";
import { MicButton } from "@/components/admin/MicButton";
import { recordPurchase } from "@/server/admin/purchases";
import { createSupplier } from "@/server/admin/suppliers";
import { createProduct } from "@/server/admin/products";
import { PriceSlider } from "@/components/admin/PriceSlider";
import { rankMatches } from "@/server/domain/matching";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface UnitOption {
  id: string;
  code: string;
  label: string;
  symbol: string;
  dimension: string;
  factorToBase: number | null;
  isBaseable: boolean;
}

interface ProductOption {
  id: string;
  name: string;
  nameTamil: string | null;
  categoryId: string;
  baseUnitId: string;
  baseUnit: {
    id: string;
    symbol: string;
    label: string;
    dimension: string;
  };
  mrp: number | null;
  sellingPrice: number | null;
  cost?: {
    lastCost: number | null;
  } | null;
}

interface SupplierOption {
  id: string;
  name: string;
  phone: string | null;
  area: string | null;
  lastPurchaseDate: Date | null;
}

interface CategoryOption {
  id: string;
  name: string;
  tint?: string | null;
}

interface BuyFlowProps {
  initialSuppliers: SupplierOption[];
  initialProducts: ProductOption[];
  units: UnitOption[];
  categories: CategoryOption[];
  initialShopId?: string;
}

interface BillLineItem {
  productId: string;
  productName: string;
  productNameTamil?: string | null;
  baseUnitSymbol: string;
  quantity: number;
  unitId: string;
  unitSymbol: string;
  unitsPerPack?: number | null;
  lineAmount: number;
  ratePerUnit: number;
  isRateInput: boolean; // whether user entered rate vs total
}

const STORAGE_DRAFT_KEY = "pandian-buy-draft-v2";

export function BuyFlow({
  initialSuppliers,
  initialProducts,
  units,
  categories,
  initialShopId,
}: BuyFlowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Step state: 1 = Shop, 2 = Items, 3 = Review, 4 = Saved / Price update
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialShopId ? 2 : 1);

  // Bill state
  const [selectedShopId, setSelectedShopId] = useState<string>(initialShopId || "");
  const [billItems, setBillItems] = useState<BillLineItem[]>([]);
  const [billDate, setBillDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [extraCharges, setExtraCharges] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [showExtraDetails, setShowExtraDetails] = useState<boolean>(false);

  // Shop search
  const [shopSearch, setShopSearch] = useState("");
  const [newShopOpen, setNewShopOpen] = useState(false);
  const [newShopForm, setNewShopForm] = useState({ name: "", phone: "", area: "" });

  // Current item being added in Step 2
  const [itemSearch, setItemSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [itemQty, setItemQty] = useState<string>("1");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [unitsPerPack, setUnitsPerPack] = useState<string>("");
  const [priceMode, setPriceMode] = useState<"TOTAL" | "RATE">("TOTAL");
  const [amountInput, setAmountInput] = useState<string>("");

  // New item modal
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: "",
    nameTamil: "",
    type: "PACKET" as "PACKET" | "LOOSE",
    categoryId: categories[0]?.id || "",
    mrp: "",
  });

  // Saved state
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedPurchaseResult, setSavedPurchaseResult] = useState<{
    id: string;
    items: Array<{
      productId: string;
      name: string;
      unitSymbol: string;
      unitCost: number;
      mrp: number | null;
      currentPrice: number | null;
    }>;
  } | null>(null);

  // Load draft from localStorage
  useEffect(() => {
    try {
      const draft = localStorage.getItem(STORAGE_DRAFT_KEY);
      if (draft && !initialShopId) {
        const parsed = JSON.parse(draft);
        if (parsed.selectedShopId) setSelectedShopId(parsed.selectedShopId);
        if (parsed.billItems?.length > 0) setBillItems(parsed.billItems);
        if (parsed.invoiceNo) setInvoiceNo(parsed.invoiceNo);
        if (parsed.billItems?.length > 0 && parsed.selectedShopId) {
          setStep(2);
        }
      }
    } catch (e) {
      // ignore draft parse error
    }
  }, [initialShopId]);

  // Save draft
  useEffect(() => {
    if (step < 4) {
      try {
        localStorage.setItem(
          STORAGE_DRAFT_KEY,
          JSON.stringify({
            selectedShopId,
            billItems,
            invoiceNo,
            billDate,
          })
        );
      } catch (e) {}
    }
  }, [selectedShopId, billItems, invoiceNo, billDate, step]);

  const selectedShop = useMemo(
    () => initialSuppliers.find((s) => s.id === selectedShopId),
    [initialSuppliers, selectedShopId]
  );

  // Recent shops
  const recentShops = useMemo(() => {
    return [...initialSuppliers]
      .filter((s) => s.lastPurchaseDate)
      .sort((a, b) => new Date(b.lastPurchaseDate!).getTime() - new Date(a.lastPurchaseDate!).getTime())
      .slice(0, 4);
  }, [initialSuppliers]);

  // Filtered shops
  const filteredShops = useMemo(() => {
    if (!shopSearch.trim()) return initialSuppliers;
    const q = shopSearch.trim().toLowerCase();
    return initialSuppliers.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.area && s.area.toLowerCase().includes(q))
    );
  }, [initialSuppliers, shopSearch]);

  // Filtered products for item selection with phonetic rank matching
  const filteredProducts = useMemo(() => {
    if (!itemSearch.trim()) return initialProducts.slice(0, 8);
    return rankMatches(itemSearch, initialProducts);
  }, [initialProducts, itemSearch]);

  // When a product is selected in Step 2, update unit options
  useEffect(() => {
    if (selectedProduct) {
      setSelectedUnitId(selectedProduct.baseUnitId);
      setUnitsPerPack("");
      setAmountInput("");
      setItemQty("1");
    }
  }, [selectedProduct]);

  // Units compatible with selected product
  const compatibleUnits = useMemo(() => {
    if (!selectedProduct) return [];
    const prodDim = selectedProduct.baseUnit.dimension;
    return units.filter(
      (u) => u.dimension === prodDim || u.dimension === "PACK"
    );
  }, [selectedProduct, units]);

  const activeUnit = useMemo(
    () => units.find((u) => u.id === selectedUnitId) || selectedProduct?.baseUnit,
    [units, selectedUnitId, selectedProduct]
  );

  const isPackUnit = activeUnit?.dimension === "PACK";

  // Calculate bill total
  const billSubtotal = useMemo(() => {
    return billItems.reduce((sum, item) => sum + item.lineAmount, 0);
  }, [billItems]);

  const billTotal = billSubtotal + (Number(extraCharges) || 0);

  // Add line item to bill
  const handleAddLineItem = () => {
    if (!selectedProduct) return;
    const qty = Number(itemQty);
    const amount = Number(amountInput);

    if (!qty || qty <= 0) return;
    if (!amount || amount <= 0) return;

    let finalLineAmount = amount;
    let finalRate = amount;

    if (priceMode === "RATE") {
      finalLineAmount = Math.round(qty * amount * 100) / 100;
      finalRate = amount;
    } else {
      finalLineAmount = amount;
      finalRate = Math.round((amount / qty) * 100) / 100;
    }

    const newItem: BillLineItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productNameTamil: selectedProduct.nameTamil,
      baseUnitSymbol: selectedProduct.baseUnit.symbol,
      quantity: qty,
      unitId: selectedUnitId || selectedProduct.baseUnitId,
      unitSymbol: activeUnit?.symbol || selectedProduct.baseUnit.symbol,
      unitsPerPack: isPackUnit ? Number(unitsPerPack) || null : null,
      lineAmount: finalLineAmount,
      ratePerUnit: finalRate,
      isRateInput: priceMode === "RATE",
    };

    setBillItems((prev) => [...prev, newItem]);
    // Reset item input
    setSelectedProduct(null);
    setItemSearch("");
    setAmountInput("");
    setItemQty("1");
  };

  const handleRemoveLineItem = (index: number) => {
    setBillItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add new shop inline
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopForm.name.trim()) return;

    startTransition(async () => {
      try {
        const res = await createSupplier({
          name: newShopForm.name.trim(),
          phone: newShopForm.phone.trim() || undefined,
          area: newShopForm.area.trim() || undefined,
        });
        if (res.supplier?.id) {
          setSelectedShopId(res.supplier.id);
          setNewShopOpen(false);
          setStep(2);
        }
      } catch (e) {}
    });
  };

  // Add new product inline
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name.trim()) return;

    startTransition(async () => {
      try {
        // Choose unit based on packet vs loose
        let chosenUnit = units.find((u) =>
          newItemForm.type === "PACKET" ? u.code === "packet" || u.code === "piece" : u.code === "kg"
        );
        if (!chosenUnit) chosenUnit = units[0];

        const res = await createProduct({
          name: newItemForm.name.trim(),
          nameTamil: newItemForm.nameTamil.trim() || null,
          categoryId: newItemForm.categoryId,
          baseUnitId: chosenUnit.id,
          sellStep: newItemForm.type === "LOOSE" ? 0.25 : 1,
          minQty: 1,
          maxQty: 50,
          mrp: newItemForm.mrp !== "" ? Number(newItemForm.mrp) : null,
          isPublished: true,
        });

        if (res.product) {
          const newProd: ProductOption = {
            id: res.product.id,
            name: res.product.name,
            nameTamil: res.product.nameTamil,
            categoryId: res.product.categoryId,
            baseUnitId: res.product.baseUnitId,
            baseUnit: {
              id: chosenUnit.id,
              symbol: chosenUnit.symbol,
              label: chosenUnit.label,
              dimension: chosenUnit.dimension,
            },
            mrp: res.product.mrp ? Number(res.product.mrp) : null,
            sellingPrice: null,
          };
          setSelectedProduct(newProd);
          setNewItemOpen(false);
        }
      } catch (e) {}
    });
  };

  // Final Save Purchase
  const handleSavePurchase = () => {
    if (!selectedShopId || billItems.length === 0) return;
    setSaveError(null);

    startTransition(async () => {
      try {
        const res = await recordPurchase({
          supplierId: selectedShopId,
          purchaseDate: billDate,
          invoiceNo: invoiceNo.trim() || null,
          extraCharges: Number(extraCharges) || 0,
          notes: notes.trim() || null,
          items: billItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitId: item.unitId,
            unitsPerPack: item.unitsPerPack || null,
            lineAmount: item.lineAmount,
          })),
        });

        // Clear draft
        localStorage.removeItem(STORAGE_DRAFT_KEY);

        // Prepare items for post-save price update
        const itemsForPricing = billItems.map((b) => {
          const prod = initialProducts.find((p) => p.id === b.productId);
          return {
            productId: b.productId,
            name: b.productName,
            unitSymbol: b.baseUnitSymbol,
            unitCost: Math.round((b.lineAmount / b.quantity) * 100) / 100,
            mrp: prod?.mrp ?? null,
            currentPrice: prod?.sellingPrice ?? null,
          };
        });

        setSavedPurchaseResult({
          id: res.purchaseId,
          items: itemsForPricing,
        });
        setStep(4);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to save purchase.";
        setSaveError(msg);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Step Progress Pill */}
      {step < 4 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <span
              className={`px-2 py-0.5 rounded-full ${
                step === 1 ? "bg-leaf text-white" : "bg-page text-ink"
              }`}
            >
              1. Shop
            </span>
            <span>→</span>
            <span
              className={`px-2 py-0.5 rounded-full ${
                step === 2 ? "bg-leaf text-white" : "bg-page text-ink"
              }`}
            >
              2. Items {billItems.length > 0 ? `(${billItems.length})` : ""}
            </span>
            <span>→</span>
            <span
              className={`px-2 py-0.5 rounded-full ${
                step === 3 ? "bg-leaf text-white" : "bg-page text-ink"
              }`}
            >
              3. Review
            </span>
          </div>

          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1) as any)}
              className="text-xs text-muted hover:text-ink font-semibold"
            >
              Back
            </button>
          )}
        </div>
      )}

      {/* ========================================================
          STEP 1: WHICH SHOP?
      ======================================================== */}
      {step === 1 && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-xl font-bold text-ink font-heading">
              {copy.admin.buy.stepShop.en}
            </h2>
            <p className="text-xs text-muted">
              Choose the wholesale store where you bought these goods.
            </p>
          </div>

          {/* Search shop with mic stub */}
          <div className="relative">
            <input
              type="text"
              value={shopSearch}
              onChange={(e) => setShopSearch(e.target.value)}
              placeholder={copy.admin.buy.shopSearchPlaceholder.en}
              className="w-full h-12 pl-10 pr-10 rounded-xl bg-page border border-border text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-leaf focus:bg-surface"
            />
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-3.5 text-muted pointer-events-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <MicButton onResult={(text) => setShopSearch(text)} />
            </div>
          </div>

          {/* Recent shops chips */}
          {!shopSearch && recentShops.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted mb-2">Recent shops</p>
              <div className="flex flex-wrap gap-2">
                {recentShops.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedShopId(s.id);
                      setStep(2);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-page border border-border hover:border-leaf hover:bg-leaf-light/40 text-xs font-bold text-ink transition-all min-h-[44px]"
                  >
                    <Storefront size={16} className="text-leaf" />
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtered shops list */}
          <div className="divide-y divide-border/60 max-h-60 overflow-y-auto border-t border-b border-border/70 py-1">
            {filteredShops.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">
                No wholesale shop found matching &quot;{shopSearch}&quot;.
              </p>
            ) : (
              filteredShops.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedShopId(s.id);
                    setStep(2);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors min-h-[48px] ${
                    selectedShopId === s.id ? "bg-leaf-light text-leaf" : "hover:bg-page"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-ink">{s.name}</p>
                    {s.area && <p className="text-xs text-muted">{s.area}</p>}
                  </div>
                  <CaretRight size={16} className="text-muted" />
                </button>
              ))
            )}
          </div>

          {/* + Add New Shop Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setNewShopOpen(true)}
            className="w-full h-12 text-xs font-bold gap-1.5 min-h-[48px]"
          >
            <Plus size={16} weight="bold" />
            <span>{copy.admin.buy.addNewShop.en}</span>
          </Button>
        </div>
      )}

      {/* ========================================================
          STEP 2: WHAT DID YOU BUY?
      ======================================================== */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Selected Shop Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-border shadow-xs">
            <div className="flex items-center gap-2.5">
              <Storefront size={20} weight="bold" className="text-leaf shrink-0" />
              <div>
                <p className="text-xs text-muted">Shop</p>
                <p className="text-sm font-bold text-ink leading-tight">
                  {selectedShop?.name || "Wholesale shop"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-leaf hover:underline px-2 py-1 min-h-[36px]"
            >
              Change shop
            </button>
          </div>

          {/* Current bill items list */}
          {billItems.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-ink border-b border-border/70 pb-2">
                <span>Items on this bill ({billItems.length})</span>
                <span className="font-mono text-sm">₹{billSubtotal}</span>
              </div>

              <div className="divide-y divide-border/60">
                {billItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-ink">{item.productName}</p>
                      <p className="text-[11px] text-muted">
                        {item.quantity} {item.unitSymbol}
                        {item.unitsPerPack ? ` (${item.unitsPerPack} ${item.baseUnitSymbol}/pack)` : ""}
                        {" · "}₹{item.ratePerUnit}/{item.unitSymbol}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-ink">
                        ₹{item.lineAmount}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        className="text-muted hover:text-red p-1 rounded"
                        title="Remove item"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Item Add Card */}
          <div className="bg-surface border-2 border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-ink font-heading">
                {copy.admin.buy.stepItems.en}
              </h2>
              <p className="text-xs text-muted">
                Pick an item, enter quantity, and enter what you paid.
              </p>
            </div>

            {!selectedProduct ? (
              /* Product picker */
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder={copy.admin.buy.itemSearchPlaceholder.en}
                    className="w-full h-12 pl-10 pr-10 rounded-xl bg-page border border-border text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-leaf focus:bg-surface"
                  />
                  <MagnifyingGlass
                    size={18}
                    className="absolute left-3.5 top-3.5 text-muted pointer-events-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <MicButton onResult={(text) => setItemSearch(text)} />
                  </div>
                </div>

                {/* Items matching */}
                <div className="divide-y divide-border/60 max-h-56 overflow-y-auto border border-border rounded-xl bg-page">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-leaf-light/40 transition-colors min-h-[48px]"
                    >
                      <div>
                        <p className="text-xs font-bold text-ink">{p.name}</p>
                        {p.nameTamil && (
                          <p className="text-[11px] text-muted font-tamil">
                            {p.nameTamil}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-muted">
                        {p.baseUnit.symbol}
                      </span>
                    </button>
                  ))}
                </div>

                {/* + New item modal trigger */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewItemOpen(true)}
                  className="w-full h-11 text-xs font-bold gap-1.5 min-h-[44px]"
                >
                  <Plus size={16} weight="bold" />
                  <span>+ Add a new item not in list</span>
                </Button>
              </div>
            ) : (
              /* Selected product input form */
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between bg-page p-3 rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-bold text-ink">{selectedProduct.name}</p>
                    {selectedProduct.nameTamil && (
                      <p className="text-xs text-muted font-tamil">
                        {selectedProduct.nameTamil}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="text-xs text-leaf font-semibold hover:underline"
                  >
                    Change item
                  </button>
                </div>

                {/* 2a. How many? + Unit chips */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-ink">
                    {copy.admin.buy.howMany.en}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      placeholder="Qty"
                      className="h-12 w-28 text-base font-mono font-bold"
                    />

                    {/* Compatible unit chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1">
                      {compatibleUnits.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelectedUnitId(u.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[44px] transition-all ${
                            selectedUnitId === u.id
                              ? "bg-leaf text-white shadow-xs"
                              : "bg-page text-ink border border-border hover:bg-leaf-light"
                          }`}
                        >
                          {u.label} ({u.symbol})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2c. Pack units prompt */}
                {isPackUnit && (
                  <div className="p-3 rounded-xl bg-page border border-border space-y-1.5">
                    <label className="block text-xs font-bold text-ink">
                      How many {selectedProduct.baseUnit.symbol} inside each {activeUnit?.label}?
                    </label>
                    <Input
                      type="number"
                      step="any"
                      min="1"
                      placeholder={`e.g. 24 ${selectedProduct.baseUnit.symbol}`}
                      value={unitsPerPack}
                      onChange={(e) => setUnitsPerPack(e.target.value)}
                      className="h-11 font-mono text-sm bg-surface"
                    />
                  </div>
                )}

                {/* 2b. How much did you pay? + Switch */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">
                      {copy.admin.buy.howMuch.en}
                    </label>

                    {/* Total vs Per unit switch */}
                    <div className="flex items-center rounded-lg bg-page p-0.5 border border-border text-xs">
                      <button
                        type="button"
                        onClick={() => setPriceMode("TOTAL")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          priceMode === "TOTAL"
                            ? "bg-leaf text-white shadow-xs"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        Total bill amount
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceMode("RATE")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          priceMode === "RATE"
                            ? "bg-leaf text-white shadow-xs"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        Rate per unit
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-base text-muted font-mono">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder={priceMode === "TOTAL" ? "Total paid for this item" : `Rate per ${activeUnit?.symbol}`}
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="w-full h-12 pl-8 pr-4 rounded-xl border border-border bg-page text-base font-mono font-bold text-ink focus:outline-none focus:ring-2 focus:ring-leaf focus:bg-surface"
                    />
                  </div>
                </div>

                {/* Add to bill button */}
                <Button
                  type="button"
                  variant="default"
                  onClick={handleAddLineItem}
                  disabled={!Number(itemQty) || !Number(amountInput)}
                  className="w-full h-12 font-bold text-sm shadow-xs min-h-[48px]"
                >
                  + Add item to bill
                </Button>
              </div>
            )}
          </div>

          {/* Bottom Review Next CTA */}
          {billItems.length > 0 && (
            <Button
              type="button"
              variant="turmeric"
              onClick={() => setStep(3)}
              className="w-full h-14 font-extrabold text-base shadow-xs min-h-[52px]"
            >
              Review and save bill (₹{billSubtotal}) →
            </Button>
          )}
        </div>
      )}

      {/* ========================================================
          STEP 3: REVIEW + SAVE
      ======================================================== */}
      {step === 3 && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-5">
          <div>
            <h2 className="text-xl font-bold text-ink font-heading">
              {copy.admin.buy.stepReview.en}
            </h2>
            <p className="text-xs text-muted">
              Check everything before saving this purchase into your stock.
            </p>
          </div>

          {/* Shop */}
          <div className="p-3.5 rounded-xl bg-page border border-border flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Wholesale store</p>
              <p className="text-sm font-bold text-ink">{selectedShop?.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-leaf font-semibold hover:underline"
            >
              Change
            </button>
          </div>

          {/* Items Summary */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">
              Items ({billItems.length})
            </p>
            <div className="divide-y divide-border/60 border border-border rounded-xl bg-page overflow-hidden">
              {billItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-ink text-sm">{item.productName}</p>
                    <p className="text-muted text-[11px]">
                      {item.quantity} {item.unitSymbol} @ ₹{item.ratePerUnit}/{item.unitSymbol}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-sm text-ink">
                    ₹{item.lineAmount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total Row */}
          <div className="p-4 rounded-xl bg-leaf-light/40 border border-leaf/20 flex items-center justify-between">
            <span className="font-bold text-sm text-ink">Total purchase bill</span>
            <span className="font-mono font-extrabold text-xl text-leaf">
              ₹{billTotal}
            </span>
          </div>

          {/* Extra Details Accordion */}
          <div className="border border-border rounded-xl p-3.5 space-y-3">
            <button
              type="button"
              onClick={() => setShowExtraDetails(!showExtraDetails)}
              className="w-full flex items-center justify-between text-xs font-bold text-ink min-h-[36px]"
            >
              <span>{copy.admin.buy.extraDetails.en}</span>
              <CaretDown
                size={16}
                className={`transition-transform ${showExtraDetails ? "rotate-180" : ""}`}
              />
            </button>

            {showExtraDetails && (
              <div className="space-y-3 pt-2 border-t border-border/60 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Bill date
                  </label>
                  <Input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Bill number / Invoice # (optional)
                  </label>
                  <Input
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-1049"
                    className="h-10 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Extra charges (transport, loading) ₹
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={extraCharges}
                    onChange={(e) => setExtraCharges(e.target.value)}
                    placeholder="0"
                    className="h-10 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Notes
                  </label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any notes about this purchase"
                    className="h-10 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {saveError && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {saveError}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              className="h-12 text-xs font-bold min-h-[48px]"
            >
              ← Add more items
            </Button>

            <Button
              type="button"
              variant="turmeric"
              onClick={handleSavePurchase}
              disabled={isPending}
              className="flex-1 h-12 text-sm font-bold shadow-xs min-h-[48px]"
            >
              {isPending ? "Saving..." : copy.admin.buy.savePurchase.en}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 4: SAVED! SET SELLING PRICES
      ======================================================== */}
      {step === 4 && savedPurchaseResult && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-6">
          <div className="text-center py-3">
            <CheckCircle size={44} weight="duotone" className="text-emerald-500 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-ink font-heading">
              {copy.admin.buy.purchaseSaved.en}
            </h2>
            <p className="text-xs text-muted mt-1">
              Stock levels have been updated in your inventory.
            </p>
          </div>

          {/* Price setting prompt */}
          <div className="space-y-4 border-t border-border/70 pt-4">
            <div>
              <h3 className="font-bold text-base text-ink font-heading">
                Set selling prices
              </h3>
              <p className="text-xs text-muted">
                {copy.admin.buy.reviewPricesPrompt.en}
              </p>
            </div>

            <div className="space-y-4">
              {savedPurchaseResult.items.map((item) => (
                <PriceSlider
                  key={item.productId}
                  productId={item.productId}
                  productName={item.name}
                  unitSymbol={item.unitSymbol}
                  cost={item.unitCost}
                  mrp={item.mrp}
                  currentPrice={item.currentPrice}
                />
              ))}
            </div>
          </div>

          {/* Done CTA */}
          <div className="pt-3 border-t border-border flex gap-3">
            <Link
              href="/admin"
              className="flex-1 flex items-center justify-center h-12 rounded-xl bg-leaf text-white font-bold text-sm shadow-xs hover:bg-leaf-hover transition-colors min-h-[48px]"
            >
              Done (Back to Home)
            </Link>

            <button
              type="button"
              onClick={() => {
                setBillItems([]);
                setInvoiceNo("");
                setExtraCharges("");
                setNotes("");
                setSavedPurchaseResult(null);
                setStep(1);
              }}
              className="px-4 h-12 rounded-xl border border-border bg-page hover:bg-leaf-light text-ink text-xs font-bold transition-colors min-h-[48px]"
            >
              Record another bill
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: NEW SHOP
      ======================================================== */}
      <Dialog open={newShopOpen} onOpenChange={setNewShopOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add wholesale shop</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateShop} className="space-y-3 py-2">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Shop name
              </label>
              <Input
                value={newShopForm.name}
                onChange={(e) => setNewShopForm({ ...newShopForm, name: e.target.value })}
                placeholder="e.g. Pandian Wholesale"
                required
                className="h-11"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Phone (optional)
              </label>
              <Input
                type="tel"
                value={newShopForm.phone}
                onChange={(e) => setNewShopForm({ ...newShopForm, phone: e.target.value })}
                className="h-11 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Market / Area (optional)
              </label>
              <Input
                value={newShopForm.area}
                onChange={(e) => setNewShopForm({ ...newShopForm, area: e.target.value })}
                className="h-11"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewShopOpen(false)}
                className="h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={!newShopForm.name.trim() || isPending}
                className="h-10 font-bold"
              >
                Save and select
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: NEW ITEM (5 Fields Max)
      ======================================================== */}
      <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProduct} className="space-y-3.5 py-2">
            {/* Field 1: Name */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                1. Item name (English)
              </label>
              <Input
                value={newItemForm.name}
                onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                placeholder="e.g. Ponni Rice"
                required
                className="h-10"
              />
            </div>

            {/* Field 2: Tamil Name */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                2. Tamil name (optional)
              </label>
              <Input
                value={newItemForm.nameTamil}
                onChange={(e) => setNewItemForm({ ...newItemForm, nameTamil: e.target.value })}
                placeholder="e.g. பொன்னி அரிசி"
                className="h-10 font-tamil"
              />
            </div>

            {/* Field 3: Packet or Loose Choice */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                3. Packaged or loose goods?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewItemForm({ ...newItemForm, type: "PACKET" })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold min-h-[40px] transition-all ${
                    newItemForm.type === "PACKET"
                      ? "bg-leaf text-white border-leaf"
                      : "bg-page text-ink border-border"
                  }`}
                >
                  Packet / Box
                </button>
                <button
                  type="button"
                  onClick={() => setNewItemForm({ ...newItemForm, type: "LOOSE" })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold min-h-[40px] transition-all ${
                    newItemForm.type === "LOOSE"
                      ? "bg-leaf text-white border-leaf"
                      : "bg-page text-ink border-border"
                  }`}
                >
                  Loose (kg / litre)
                </button>
              </div>
            </div>

            {/* Field 4: Category chips */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                4. Category
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewItemForm({ ...newItemForm, categoryId: c.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      newItemForm.categoryId === c.id
                        ? "bg-ink text-white border-ink"
                        : "bg-page text-muted border-border hover:text-ink"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 5: MRP (Optional) */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                5. MRP ₹ (optional)
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Printed MRP on packet"
                value={newItemForm.mrp}
                onChange={(e) => setNewItemForm({ ...newItemForm, mrp: e.target.value })}
                className="h-10 font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewItemOpen(false)}
                className="h-10 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={!newItemForm.name.trim() || isPending}
                className="h-10 text-xs font-bold"
              >
                Save item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
