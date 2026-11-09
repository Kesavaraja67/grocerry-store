"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Trash,
  FloppyDisk,
  WarningCircle,
  CheckCircle,
  ArrowRight,
  ArrowsClockwise,
  ArrowUpRight,
  ArrowDownRight,
  Sparkle,
  Receipt,
  Storefront,
  Package,
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
import { formatINR } from "@/lib/format";
import {
  recordPurchase,
  correctPurchase,
  getProductLastPurchaseRate,
  type PriceReviewItem,
} from "@/server/admin/purchases";
import { createSupplier } from "@/server/admin/suppliers";
import { createProduct, updateProduct } from "@/server/admin/products";

export interface SupplierItem {
  id: string;
  name: string;
  area: string | null;
  phone: string | null;
}

export interface ProductItem {
  id: string;
  name: string;
  nameTamil: string | null;
  brand: string | null;
  categoryId: string;
  baseUnitId: string;
  baseUnit: {
    id: string;
    symbol: string;
    label: string;
    dimension: string;
  };
  lastCost: number | null;
  sellingPrice: number | null;
  mrp: number | null;
}

export interface UnitItem {
  id: string;
  code: string;
  label: string;
  symbol: string;
  dimension: string;
  factorToBase: number | null;
  isBaseable: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  lowMarkup: number;
  recommendedMarkup: number;
  highMarkup: number;
}

interface FormLine {
  id: string; // client uuid
  productId: string;
  productName: string;
  productNameTamil: string | null;
  quantity: string;
  unitId: string;
  unitsPerPack: string;
  ratePerUnit: string;
  lineAmount: string;
  isPack: boolean;
  baseUnitSymbol: string;
  lastCost: number | null;
  lastCostSupplier: string | null;
  lastCostDate: string | null;
}

interface Props {
  suppliers: SupplierItem[];
  products: ProductItem[];
  units: UnitItem[];
  categories: CategoryItem[];
  correctPurchaseData?: {
    id: string;
    supplierId: string;
    invoiceNo: string | null;
    purchaseDate: string;
    extraCharges: number;
    notes: string | null;
    items: {
      productId: string;
      quantity: number;
      unitId: string;
      unitsPerPack: number | null;
      lineAmount: number;
    }[];
  } | null;
}

const DRAFT_STORAGE_KEY = "pandian_purchase_draft_v1";

export function PurchaseForm({
  suppliers: initialSuppliers,
  products: initialProducts,
  units,
  categories,
  correctPurchaseData,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const correctId = correctPurchaseData?.id || searchParams.get("correctId");

  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers);
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);

  // Form states
  const [supplierId, setSupplierId] = useState(correctPurchaseData?.supplierId || "");
  const [purchaseDate, setPurchaseDate] = useState(
    correctPurchaseData?.purchaseDate || new Date().toISOString().split("T")[0]
  );
  const [invoiceNo, setInvoiceNo] = useState(correctPurchaseData?.invoiceNo || "");
  const [extraCharges, setExtraCharges] = useState(
    correctPurchaseData ? String(correctPurchaseData.extraCharges) : "0"
  );
  const [notes, setNotes] = useState(correctPurchaseData?.notes || "");
  const [correctionReason, setCorrectionReason] = useState("");

  // Line items state
  const [lines, setLines] = useState<FormLine[]>(() => {
    if (correctPurchaseData && correctPurchaseData.items.length > 0) {
      return correctPurchaseData.items.map((it) => {
        const prod = initialProducts.find((p) => p.id === it.productId);
        const unit = units.find((u) => u.id === it.unitId);
        const rate = it.quantity > 0 ? (it.lineAmount / it.quantity).toFixed(2) : "0";
        return {
          id: crypto.randomUUID(),
          productId: it.productId,
          productName: prod?.name || "",
          productNameTamil: prod?.nameTamil || null,
          quantity: String(it.quantity),
          unitId: it.unitId,
          unitsPerPack: it.unitsPerPack ? String(it.unitsPerPack) : "",
          ratePerUnit: rate,
          lineAmount: String(it.lineAmount),
          isPack: unit?.dimension === "PACK",
          baseUnitSymbol: prod?.baseUnit.symbol || "",
          lastCost: prod?.lastCost || null,
          lastCostSupplier: null,
          lastCostDate: null,
        };
      });
    }

    return [
      {
        id: crypto.randomUUID(),
        productId: "",
        productName: "",
        productNameTamil: null,
        quantity: "1",
        unitId: "",
        unitsPerPack: "",
        ratePerUnit: "",
        lineAmount: "",
        isPack: false,
        baseUnitSymbol: "",
        lastCost: null,
        lastCostSupplier: null,
        lastCostDate: null,
      },
    ];
  });

  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Supplier Modal
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierArea, setNewSupplierArea] = useState("");
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);

  // Quick Product Modal
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductNameTamil, setNewProductNameTamil] = useState("");
  const [newProductCategoryId, setNewProductCategoryId] = useState(categories[0]?.id || "");
  const [newProductBaseUnitId, setNewProductBaseUnitId] = useState(
    units.find((u) => u.isBaseable)?.id || ""
  );
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Post-Save Price Review Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<
    (PriceReviewItem & {
      selected: boolean;
      chosenPrice: number;
    })[]
  >([]);
  const [savedPurchaseId, setSavedPurchaseId] = useState<string | null>(null);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  // Draft auto-save to localStorage (only when not in correction mode)
  useEffect(() => {
    if (correctId) return;

    // Check if draft exists on mount
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          setSupplierId(parsed.supplierId || "");
          setPurchaseDate(parsed.purchaseDate || new Date().toISOString().split("T")[0]);
          setInvoiceNo(parsed.invoiceNo || "");
          setExtraCharges(parsed.extraCharges || "0");
          setNotes(parsed.notes || "");
          setLines(parsed.lines);
          setHasRestoredDraft(true);
        }
      } catch {
        // Invalid draft JSON, ignore
      }
    }
  }, [correctId]);

  // Debounced auto-save
  useEffect(() => {
    if (correctId) return;

    const handler = setTimeout(() => {
      // Save only if user entered something meaningful
      const hasContent = supplierId || lines.some((l) => l.productId || l.lineAmount);
      if (hasContent) {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            supplierId,
            purchaseDate,
            invoiceNo,
            extraCharges,
            notes,
            lines,
          })
        );
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [supplierId, purchaseDate, invoiceNo, extraCharges, notes, lines, correctId]);

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setSupplierId("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setInvoiceNo("");
    setExtraCharges("0");
    setNotes("");
    setLines([
      {
        id: crypto.randomUUID(),
        productId: "",
        productName: "",
        productNameTamil: null,
        quantity: "1",
        unitId: "",
        unitsPerPack: "",
        ratePerUnit: "",
        lineAmount: "",
        isPack: false,
        baseUnitSymbol: "",
        lastCost: null,
        lastCostSupplier: null,
        lastCostDate: null,
      },
    ]);
    setHasRestoredDraft(false);
  };

  // Add line
  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: "",
        productName: "",
        productNameTamil: null,
        quantity: "1",
        unitId: "",
        unitsPerPack: "",
        ratePerUnit: "",
        lineAmount: "",
        isPack: false,
        baseUnitSymbol: "",
        lastCost: null,
        lastCostSupplier: null,
        lastCostDate: null,
      },
    ]);
  };

  // Remove line
  const handleRemoveLine = (id: string) => {
    if (lines.length <= 1) {
      // Reset single line rather than remove
      setLines([
        {
          id: crypto.randomUUID(),
          productId: "",
          productName: "",
          productNameTamil: null,
          quantity: "1",
          unitId: "",
          unitsPerPack: "",
          ratePerUnit: "",
          lineAmount: "",
          isPack: false,
          baseUnitSymbol: "",
          lastCost: null,
          lastCostSupplier: null,
          lastCostDate: null,
        },
      ]);
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  // When a product is selected in a line
  const handleProductSelect = async (lineId: string, pId: string) => {
    const prod = products.find((p) => p.id === pId);
    if (!prod) return;

    // Check if unit is set; default to base unit
    const defaultUnitId = prod.baseUnitId;
    const defaultUnit = units.find((u) => u.id === defaultUnitId);

    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        return {
          ...l,
          productId: pId,
          productName: prod.name,
          productNameTamil: prod.nameTamil,
          unitId: l.unitId || defaultUnitId,
          isPack: defaultUnit?.dimension === "PACK",
          baseUnitSymbol: prod.baseUnit.symbol,
          lastCost: prod.lastCost,
        };
      })
    );

    // Fetch live last purchase rate details
    try {
      const rateInfo = await getProductLastPurchaseRate(pId);
      if (rateInfo) {
        setLines((prev) =>
          prev.map((l) => {
            if (l.id !== lineId) return l;
            return {
              ...l,
              lastCost: rateInfo.unitCost,
              lastCostSupplier: rateInfo.supplierName,
              lastCostDate: rateInfo.purchaseDate,
            };
          })
        );
      }
    } catch {
      // Ignore background fetch error
    }
  };

  // When unit is changed
  const handleUnitSelect = (lineId: string, unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    const isPack = unit?.dimension === "PACK";

    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        return {
          ...l,
          unitId,
          isPack,
        };
      })
    );
  };

  // Dual linked quantity, rate, and line total
  const handleQuantityChange = (lineId: string, qtyStr: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const qty = parseFloat(qtyStr);
        let lineAmount = l.lineAmount;
        if (!isNaN(qty) && qty > 0 && l.ratePerUnit) {
          const rate = parseFloat(l.ratePerUnit);
          if (!isNaN(rate)) {
            lineAmount = (qty * rate).toFixed(2);
          }
        }
        return { ...l, quantity: qtyStr, lineAmount };
      })
    );
  };

  const handleRateChange = (lineId: string, rateStr: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const rate = parseFloat(rateStr);
        const qty = parseFloat(l.quantity);
        let lineAmount = l.lineAmount;
        if (!isNaN(rate) && !isNaN(qty) && qty > 0) {
          lineAmount = (qty * rate).toFixed(2);
        }
        return { ...l, ratePerUnit: rateStr, lineAmount };
      })
    );
  };

  const handleLineAmountChange = (lineId: string, amtStr: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const amt = parseFloat(amtStr);
        const qty = parseFloat(l.quantity);
        let ratePerUnit = l.ratePerUnit;
        if (!isNaN(amt) && !isNaN(qty) && qty > 0) {
          ratePerUnit = (amt / qty).toFixed(2);
        }
        return { ...l, lineAmount: amtStr, ratePerUnit };
      })
    );
  };

  // Quick Supplier Creation
  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      setIsAddingSupplier(true);
      const res = await createSupplier({
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined,
        area: newSupplierArea.trim() || undefined,
      });

      const newSup: SupplierItem = {
        id: res.supplier.id,
        name: res.supplier.name,
        phone: res.supplier.phone,
        area: res.supplier.area,
      };

      setSuppliers((prev) => [newSup, ...prev]);
      setSupplierId(res.supplier.id);
      setIsAddSupplierOpen(false);
      setNewSupplierName("");
      setNewSupplierPhone("");
      setNewSupplierArea("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create wholesale store.");
    } finally {
      setIsAddingSupplier(false);
    }
  };

  // Quick Product Creation
  const handleCreateProduct = async () => {
    if (!newProductName.trim()) return;
    try {
      setIsAddingProduct(true);
      const res = await createProduct({
        name: newProductName.trim(),
        nameTamil: newProductNameTamil.trim() || undefined,
        categoryId: newProductCategoryId,
        baseUnitId: newProductBaseUnitId,
      });

      const p = res.product;
      const baseUnit = units.find((u) => u.id === p.baseUnitId);
      const newProd: ProductItem = {
        id: p.id,
        name: p.name,
        nameTamil: p.nameTamil,
        brand: p.brand,
        categoryId: p.categoryId,
        baseUnitId: p.baseUnitId,
        baseUnit: {
          id: baseUnit?.id || "",
          symbol: baseUnit?.symbol || "",
          label: baseUnit?.label || "",
          dimension: baseUnit?.dimension || "COUNT",
        },
        lastCost: null,
        sellingPrice: p.sellingPrice ? Number(p.sellingPrice) : null,
        mrp: p.mrp ? Number(p.mrp) : null,
      };

      setProducts((prev) => [newProd, ...prev]);

      // If the last line has no product, set it there
      setLines((prev) => {
        const lastLine = prev[prev.length - 1];
        if (!lastLine.productId) {
          return prev.map((l, idx) =>
            idx === prev.length - 1
              ? {
                  ...l,
                  productId: newProd.id,
                  productName: newProd.name,
                  productNameTamil: newProd.nameTamil,
                  unitId: newProd.baseUnitId,
                  baseUnitSymbol: newProd.baseUnit.symbol,
                }
              : l
          );
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            productId: newProd.id,
            productName: newProd.name,
            productNameTamil: newProd.nameTamil,
            quantity: "1",
            unitId: newProd.baseUnitId,
            unitsPerPack: "",
            ratePerUnit: "",
            lineAmount: "",
            isPack: false,
            baseUnitSymbol: newProd.baseUnit.symbol,
            lastCost: null,
            lastCostSupplier: null,
            lastCostDate: null,
          },
        ];
      });

      setIsAddProductOpen(false);
      setNewProductName("");
      setNewProductNameTamil("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create product.");
    } finally {
      setIsAddingProduct(false);
    }
  };

  // Grand total calculation
  const subtotal = lines.reduce((sum, line) => {
    const amt = parseFloat(line.lineAmount);
    return isNaN(amt) ? sum : sum + amt;
  }, 0);

  const extraChargesVal = parseFloat(extraCharges);
  const extra = isNaN(extraChargesVal) ? 0 : extraChargesVal;
  const grandTotal = subtotal + extra;

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplierId) {
      setFormError("Please select a wholesale store.");
      return;
    }

    if (!purchaseDate) {
      setFormError("Please select the bill date.");
      return;
    }

    if (correctId && !correctionReason.trim()) {
      setFormError("Please provide a reason for correcting this bill.");
      return;
    }

    // Validate lines
    const formattedItems = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.productId) {
        setFormError(`Line #${i + 1} has no product selected.`);
        return;
      }
      const qty = parseFloat(line.quantity);
      if (isNaN(qty) || qty <= 0) {
        setFormError(`Line #${i + 1} has invalid quantity.`);
        return;
      }
      if (!line.unitId) {
        setFormError(`Line #${i + 1} has no unit selected.`);
        return;
      }
      if (line.isPack) {
        const packFactor = parseFloat(line.unitsPerPack);
        if (isNaN(packFactor) || packFactor <= 0) {
          setFormError(`Line #${i + 1} is a PACK unit. Please enter items per pack.`);
          return;
        }
      }
      const amt = parseFloat(line.lineAmount);
      if (isNaN(amt) || amt <= 0) {
        setFormError(`Line #${i + 1} has invalid line amount.`);
        return;
      }

      formattedItems.push({
        productId: line.productId,
        quantity: qty,
        unitId: line.unitId,
        unitsPerPack: line.isPack ? parseFloat(line.unitsPerPack) : null,
        lineAmount: amt,
      });
    }

    if (formattedItems.length === 0) {
      setFormError("Please enter at least one product on this bill.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        supplierId,
        purchaseDate,
        invoiceNo: invoiceNo.trim() || null,
        extraCharges: extra,
        notes: notes.trim() || null,
        items: formattedItems,
      };

      let result;
      if (correctId) {
        result = await correctPurchase(correctId, correctionReason.trim(), payload);
      } else {
        result = await recordPurchase(payload);
        // Clear saved draft on success
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }

      setSavedPurchaseId(result.purchaseId);

      // Check if there are price review suggestions to present to the user
      if (result.priceReviewItems && result.priceReviewItems.length > 0) {
        setReviewItems(
          result.priceReviewItems.map((item) => ({
            ...item,
            selected: true,
            chosenPrice: item.recommendedPrice,
          }))
        );
        setIsReviewModalOpen(true);
      } else {
        router.push(`/admin/purchases/${result.purchaseId}`);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save purchase bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Apply selected selling prices from modal
  const handleApplyReviewedPrices = async () => {
    try {
      setIsUpdatingPrices(true);
      const selected = reviewItems.filter((i) => i.selected);

      for (const item of selected) {
        await updateProduct(item.productId, {
          sellingPrice: item.chosenPrice,
        });
      }

      setIsReviewModalOpen(false);
      if (savedPurchaseId) {
        router.push(`/admin/purchases/${savedPurchaseId}`);
      } else {
        router.push("/admin/purchases");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update selling prices.");
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/purchases"
            className="text-xs text-ink-muted hover:text-ink font-medium"
          >
            ← Back to wholesale bills
          </Link>
          <h1 className="text-2xl font-bold font-heading text-ink mt-1">
            {correctId ? "Correct Wholesale Bill" : "Record Wholesale Purchase"}
          </h1>
          <p className="text-xs text-ink-muted">
            {correctId
              ? "Correcting will replace the previous bill, adjust inventory, and recalculate item costs."
              : "Enter what you bought from the wholesale market. Stock and costs update automatically."}
          </p>
        </div>
      </div>

      {/* Restored draft notice */}
      {hasRestoredDraft && (
        <div className="rounded-lg border border-turmeric/50 bg-turmeric/10 p-3 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-ink">
            <ArrowsClockwise size={16} className="text-leaf" />
            <span>
              Restored an unsaved wholesale bill draft from this browser session.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={discardDraft}
            className="h-7 px-2 text-red hover:text-red hover:bg-red/10 text-xs"
          >
            Discard draft
          </Button>
        </div>
      )}

      {/* Error alert */}
      {formError && (
        <div className="rounded-lg border border-red/40 bg-red/5 p-4 flex items-start gap-3 text-sm text-red">
          <WarningCircle size={20} weight="bold" className="shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Unable to save purchase bill</div>
            <div className="text-xs mt-0.5">{formError}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Correction reason field (if in correction mode) */}
        {correctId && (
          <Card className="p-4 bg-turmeric/5 border-turmeric/40 shadow-xs space-y-2">
            <label className="text-xs font-bold text-ink">
              Reason for Correction <span className="text-red">*</span>
            </label>
            <Input
              placeholder="e.g. Rate mistake on bill, entered 5 bags instead of 4"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              required
              className="h-10 text-sm"
            />
          </Card>
        )}

        {/* Step 1: Wholesale Store & Bill Info */}
        <Card className="p-5 bg-surface border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted flex items-center gap-2">
              <Storefront size={18} className="text-leaf" />
              1. Wholesale Store & Bill Info
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Wholesale Store combobox with quick add */}
            <div className="space-y-1.5 sm:col-span-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-ink">
                  Wholesale Store <span className="text-red">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(true)}
                  className="text-[11px] text-leaf hover:underline font-medium inline-flex items-center gap-0.5"
                >
                  <Plus size={12} weight="bold" />
                  New store
                </button>
              </div>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full h-11 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-leaf focus:border-leaf font-medium"
              >
                <option value="">Select wholesale store...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.area ? `(${s.area})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Bill Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Bill Date <span className="text-red">*</span>
              </label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {/* Invoice / Bill # */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Bill / Invoice Number
              </label>
              <Input
                placeholder="e.g. INV-8821"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="h-11 font-mono uppercase"
              />
            </div>
          </div>
        </Card>

        {/* Step 2: Line Items */}
        <Card className="p-5 bg-surface border-border shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted flex items-center gap-2">
                <Package size={18} className="text-leaf" />
                2. Items on Bill ({lines.length})
              </h2>
              <p className="text-xs text-ink-muted">
                Choose product, enter quantity and rate or line total.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddProductOpen(true)}
              className="text-xs text-leaf hover:underline font-semibold inline-flex items-center gap-1 bg-leaf/5 px-2.5 py-1.5 rounded-md"
            >
              <Plus size={14} weight="bold" />
              Add new product
            </button>
          </div>

          {/* Lines container */}
          <div className="space-y-4">
            {lines.map((line, idx) => {
              const prod = products.find((p) => p.id === line.productId);
              const lineRate = parseFloat(line.ratePerUnit);
              const lastCost = line.lastCost;
              let diffPercent: number | null = null;
              if (lastCost && !isNaN(lineRate) && lineRate > 0) {
                diffPercent = Math.round(((lineRate - lastCost) / lastCost) * 100 * 10) / 10;
              }

              return (
                <div
                  key={line.id}
                  className="p-4 rounded-lg border border-border/90 bg-page/30 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-ink-muted bg-surface px-2 py-0.5 rounded border border-border">
                      Item #{idx + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLine(line.id)}
                      className="h-7 w-7 p-0 text-ink-muted hover:text-red hover:bg-red/10"
                      title="Remove item"
                    >
                      <Trash size={15} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    {/* Product select */}
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[11px] font-semibold text-ink">
                        Product <span className="text-red">*</span>
                      </label>
                      <select
                        value={line.productId}
                        onChange={(e) => handleProductSelect(line.id, e.target.value)}
                        required
                        className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-leaf font-medium"
                      >
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.nameTamil ? `(${p.nameTamil})` : ""}{" "}
                            {p.brand ? `[${p.brand}]` : ""}
                          </option>
                        ))}
                      </select>

                      {/* Previous price chip */}
                      {line.lastCost !== null && (
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted pt-0.5">
                          <span>Last bought:</span>
                          <span className="font-mono font-semibold text-ink">
                            {formatINR(line.lastCost)}
                          </span>
                          {line.lastCostDate && (
                            <span className="text-[10px]">({line.lastCostDate})</span>
                          )}
                          {diffPercent !== null && diffPercent !== 0 && (
                            <span
                              className={`font-semibold inline-flex items-center text-[10px] px-1 rounded ${
                                diffPercent > 0
                                  ? "text-red bg-red/10"
                                  : "text-leaf bg-leaf/10"
                              }`}
                            >
                              {diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-ink">
                        Quantity <span className="text-red">*</span>
                      </label>
                      <Input
                        type="number"
                        step="any"
                        min="0.001"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => handleQuantityChange(line.id, e.target.value)}
                        required
                        className="h-10 text-center font-mono font-semibold"
                      />
                    </div>

                    {/* Unit select */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-ink">
                        Unit <span className="text-red">*</span>
                      </label>
                      <select
                        value={line.unitId}
                        onChange={(e) => handleUnitSelect(line.id, e.target.value)}
                        required
                        className="w-full h-10 rounded-md border border-border bg-surface px-2 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-leaf font-medium"
                      >
                        <option value="">Unit...</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label} ({u.symbol})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rate per unit */}
                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-[11px] font-semibold text-ink">
                        Rate (₹)
                      </label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Rate"
                        value={line.ratePerUnit}
                        onChange={(e) => handleRateChange(line.id, e.target.value)}
                        className="h-10 text-right font-mono text-xs"
                      />
                    </div>

                    {/* Line total amount */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-ink">
                        Line Total (₹) <span className="text-red">*</span>
                      </label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={line.lineAmount}
                        onChange={(e) => handleLineAmountChange(line.id, e.target.value)}
                        required
                        className="h-10 text-right font-mono font-bold text-sm text-leaf"
                      />
                    </div>
                  </div>

                  {/* Pack size helper (if PACK unit like Box, Carton, Case is selected) */}
                  {line.isPack && (
                    <div className="pt-2 border-t border-border/60 flex items-center gap-3 text-xs bg-turmeric/10 p-2 rounded">
                      <Package size={16} className="text-leaf shrink-0" />
                      <div className="flex-1">
                        <span>How many {line.baseUnitSymbol || "units"} are inside 1 pack?</span>
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          step="any"
                          placeholder="e.g. 12"
                          value={line.unitsPerPack}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.id === line.id ? { ...l, unitsPerPack: e.target.value } : l
                              )
                            )
                          }
                          required={line.isPack}
                          className="h-8 text-right font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add item button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleAddLine}
            className="w-full gap-2 border-dashed border-border py-4 font-semibold text-xs hover:bg-page"
          >
            <Plus size={16} weight="bold" />
            Add another item to bill
          </Button>
        </Card>

        {/* Step 3: Extra Charges & Notes */}
        <Card className="p-5 bg-surface border-border shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted">
            3. Extra Charges & Notes
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Transport, Auto & Loading Charges (₹)
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                value={extraCharges}
                onChange={(e) => setExtraCharges(e.target.value)}
                placeholder="0.00"
                className="h-11 font-mono"
              />
              <p className="text-[11px] text-ink-muted">
                Extra charges are automatically allocated proportionally across items to determine true cost.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Notes / Reference
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid in cash, tempo driver Ramu"
                className="h-11"
              />
            </div>
          </div>
        </Card>

        {/* Grand Total Summary Box */}
        <Card className="p-5 bg-page/70 border-border/80 shadow-xs space-y-3">
          <div className="flex justify-between items-center text-sm text-ink-muted">
            <span>Items Subtotal:</span>
            <span className="font-mono text-base font-semibold text-ink">
              {formatINR(subtotal)}
            </span>
          </div>

          {extra > 0 && (
            <div className="flex justify-between items-center text-sm text-ink-muted">
              <span>Transport & Loading:</span>
              <span className="font-mono text-sm text-ink">{formatINR(extra)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-border flex justify-between items-center text-base font-bold text-ink">
            <span>Total Wholesale Amount Paid:</span>
            <span className="font-mono text-2xl text-leaf font-extrabold">
              {formatINR(grandTotal)}
            </span>
          </div>
        </Card>

        {/* Sticky bottom save bar */}
        <div className="sticky bottom-4 z-20 bg-surface/95 backdrop-blur-md p-4 rounded-xl border border-border shadow-md flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <div className="text-xs text-ink-muted">Grand Total:</div>
            <div className="text-xl font-bold font-mono text-ink">
              {formatINR(grandTotal)}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/admin/purchases" className="w-1/3 sm:w-auto">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="turmeric"
              disabled={isSubmitting}
              className="flex-1 sm:w-auto px-8 gap-2 font-bold shadow-sm"
            >
              <FloppyDisk size={18} weight="bold" />
              {isSubmitting
                ? "Saving wholesale bill..."
                : correctId
                ? "Save corrected bill"
                : "Save wholesale bill"}
            </Button>
          </div>
        </div>
      </form>

      {/* Quick Add Supplier Modal */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Add Wholesale Store</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Add a new wholesale supplier to select for this purchase.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Wholesale Store Name <span className="text-red">*</span>
              </label>
              <Input
                placeholder="e.g. Sri Meenakshi Traders"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Phone</label>
              <Input
                placeholder="e.g. 9842100000"
                value={newSupplierPhone}
                onChange={(e) => setNewSupplierPhone(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Area / Market</label>
              <Input
                placeholder="e.g. South Masi Street"
                value={newSupplierArea}
                onChange={(e) => setNewSupplierArea(e.target.value)}
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="turmeric"
              onClick={handleCreateSupplier}
              disabled={isAddingSupplier || !newSupplierName.trim()}
            >
              {isAddingSupplier ? "Adding..." : "Add Store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Product Modal */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Quick Add Product</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Create a new item catalog entry to include on this bill.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Product Name <span className="text-red">*</span>
              </label>
              <Input
                placeholder="e.g. Toor Dal Premium"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Tamil Name (விருப்பமானது)
              </label>
              <Input
                placeholder="எ.கா. துவரம் பருப்பு"
                value={newProductNameTamil}
                onChange={(e) => setNewProductNameTamil(e.target.value)}
                className="h-10 font-tamil"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Category</label>
              <select
                value={newProductCategoryId}
                onChange={(e) => setNewProductCategoryId(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-leaf font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Stock Unit</label>
              <select
                value={newProductBaseUnitId}
                onChange={(e) => setNewProductBaseUnitId(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-leaf font-medium"
              >
                {units
                  .filter((u) => u.isBaseable)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label} ({u.symbol})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="turmeric"
              onClick={handleCreateProduct}
              disabled={isAddingProduct || !newProductName.trim()}
            >
              {isAddingProduct ? "Creating..." : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-Save Price Review Modal Dialog */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-lg text-ink">
              <Sparkle size={20} weight="fill" className="text-turmeric" />
              Review Selling Prices for Items with Cost Changes
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted leading-relaxed">
              Wholesale bill saved successfully! The purchase rates changed for these items.
              Review your selling prices now, or skip and review later under Pricing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {reviewItems.map((item, idx) => {
              const isBelowCost =
                item.currentSellingPrice !== null && item.newCost >= item.currentSellingPrice;

              return (
                <div
                  key={item.productId}
                  className={`p-3.5 rounded-lg border space-y-2.5 transition-colors ${
                    item.selected
                      ? "border-leaf/50 bg-leaf/5"
                      : "border-border/70 bg-page/30 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) =>
                          setReviewItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, selected: e.target.checked } : it
                            )
                          )
                        }
                        className="mt-1 h-4 w-4 rounded border-border text-leaf focus:ring-leaf"
                      />
                      <div>
                        <div className="font-semibold text-sm text-ink">{item.productName}</div>
                        {item.productNameTamil && (
                          <div className="text-xs text-ink-muted font-tamil">
                            {item.productNameTamil}
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Cost change */}
                    <div className="text-right text-xs">
                      <div className="text-ink-muted">
                        Cost: {item.oldCost ? formatINR(item.oldCost) : "None"} →{" "}
                        <span className="font-bold text-ink">{formatINR(item.newCost)}</span>
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        Current Selling:{" "}
                        <span className="font-mono">
                          {item.currentSellingPrice ? formatINR(item.currentSellingPrice) : "Not set"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isBelowCost && (
                    <div className="flex items-center gap-1.5 text-xs text-red font-semibold bg-red/10 px-2 py-1 rounded">
                      <WarningCircle size={14} weight="bold" />
                      Warning: Current selling price is lower than what you paid!
                    </div>
                  )}

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] text-ink-muted font-medium">Suggestions:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewItems((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? { ...it, chosenPrice: it.lowPrice, selected: true }
                              : it
                          )
                        )
                      }
                      className={`text-xs px-2.5 py-1 rounded-md border font-mono ${
                        item.chosenPrice === item.lowPrice
                          ? "bg-leaf text-white border-leaf"
                          : "bg-surface hover:bg-page border-border text-ink"
                      }`}
                    >
                      Low: {formatINR(item.lowPrice)}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewItems((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? { ...it, chosenPrice: it.recommendedPrice, selected: true }
                              : it
                          )
                        )
                      }
                      className={`text-xs px-2.5 py-1 rounded-md border font-mono ${
                        item.chosenPrice === item.recommendedPrice
                          ? "bg-turmeric text-ink border-turmeric font-bold"
                          : "bg-surface hover:bg-page border-border text-ink"
                      }`}
                    >
                      ★ Rec: {formatINR(item.recommendedPrice)}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewItems((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? { ...it, chosenPrice: it.highPrice, selected: true }
                              : it
                          )
                        )
                      }
                      className={`text-xs px-2.5 py-1 rounded-md border font-mono ${
                        item.chosenPrice === item.highPrice
                          ? "bg-leaf text-white border-leaf"
                          : "bg-surface hover:bg-page border-border text-ink"
                      }`}
                    >
                      High: {formatINR(item.highPrice)}
                    </button>

                    {/* Custom price input */}
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[11px] text-ink-muted">Set ₹:</span>
                      <Input
                        type="number"
                        step="any"
                        value={item.chosenPrice}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setReviewItems((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? { ...it, chosenPrice: isNaN(val) ? 0 : val, selected: true }
                                : it
                            )
                          )
                        }}
                        className="h-8 w-24 text-right font-mono text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsReviewModalOpen(false);
                if (savedPurchaseId) router.push(`/admin/purchases/${savedPurchaseId}`);
                else router.push("/admin/purchases");
              }}
              disabled={isUpdatingPrices}
            >
              Skip for now
            </Button>
            <Button
              variant="turmeric"
              onClick={handleApplyReviewedPrices}
              disabled={isUpdatingPrices || reviewItems.filter((i) => i.selected).length === 0}
              className="gap-1.5 font-bold"
            >
              <CheckCircle size={16} weight="bold" />
              {isUpdatingPrices ? "Updating prices..." : "Apply selected prices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
