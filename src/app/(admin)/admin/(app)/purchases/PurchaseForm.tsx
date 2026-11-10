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
  ArrowsClockwise,
  Sparkle,
  Storefront,
  Package,
  MagnifyingGlass,
  CaretDown,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createProduct } from "@/server/admin/products";
import { applyPurchaseReviewedPrices } from "@/server/admin/pricing";

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
  id: string;
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

/**
 * Searchable dropdown picker for bill products with 1-click "Create new" trigger.
 */
function SearchableProductSelect({
  products,
  selectedId,
  onSelect,
  onQuickCreate,
}: {
  products: ProductItem[];
  selectedId: string;
  onSelect: (productId: string) => void;
  onQuickCreate: (prefillName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = products.find((p) => p.id === selectedId);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQuery("");
    }
  }, [open]);

  const trimmed = query.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (!trimmed) return true;
    return (
      p.name.toLowerCase().includes(trimmed) ||
      (p.nameTamil && p.nameTamil.toLowerCase().includes(trimmed)) ||
      (p.brand && p.brand.toLowerCase().includes(trimmed))
    );
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full min-h-[42px] rounded-md border bg-surface px-3 py-2 text-left text-sm flex items-center justify-between gap-2 transition-colors ${
          open ? "border-leaf ring-2 ring-leaf/30" : "border-border hover:border-border-strong"
        }`}
      >
        <span className={`truncate ${selected ? "font-medium text-ink" : "text-muted"}`}>
          {selected ? (
            <>
              {selected.name}{" "}
              {selected.nameTamil && (
                <span className="text-xs text-ink-muted font-tamil">({selected.nameTamil})</span>
              )}
            </>
          ) : (
            "Search or pick product..."
          )}
        </span>
        <CaretDown size={15} className="text-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-surface shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border bg-page/60 flex items-center gap-2">
            <MagnifyingGlass size={15} className="text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type English or Tamil name..."
              className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-muted hover:text-ink p-0.5"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-border/40">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-muted text-center">
                No matching item found in catalog.
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p.id);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between gap-2 hover:bg-leaf-light transition-colors ${
                    p.id === selectedId ? "bg-leaf-light/70 font-semibold text-leaf" : "text-ink"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {p.name}
                      {p.brand ? ` [${p.brand}]` : ""}
                    </div>
                    {p.nameTamil && (
                      <div className="text-[11px] text-ink-muted font-tamil truncate">
                        {p.nameTamil}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-ink-muted">
                    {p.sellingPrice ? `Sell ${formatINR(p.sellingPrice)}/${p.baseUnit.symbol}` : `Unit: ${p.baseUnit.symbol}`}
                  </span>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              const prefill = query.trim();
              setOpen(false);
              onQuickCreate(prefill);
            }}
            className="w-full px-3 py-2.5 bg-turmeric/15 hover:bg-turmeric/25 border-t border-border text-xs font-bold text-leaf flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} weight="bold" />
            <span>
              {query.trim()
                ? `Add "${query.trim()}" as a new product`
                : "Add a brand new product"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

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
  const urlSupplierId = searchParams.get("supplierId") || "";

  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers);
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);

  // Form states
  const [supplierId, setSupplierId] = useState(
    correctPurchaseData?.supplierId || urlSupplierId || ""
  );
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
  const [supplierModalError, setSupplierModalError] = useState<string | null>(null);
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);

  // Quick Product Modal
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [targetLineId, setTargetLineId] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState("");
  const [newProductNameTamil, setNewProductNameTamil] = useState("");
  const [newProductCategoryId, setNewProductCategoryId] = useState(categories[0]?.id || "");
  const [newProductKind, setNewProductKind] = useState<"LOOSE" | "PACKAGED">("PACKAGED");
  const [newProductBaseUnitId, setNewProductBaseUnitId] = useState(
    units.find((u) => u.code === "packet" && u.isBaseable)?.id ||
      units.find((u) => u.isBaseable)?.id ||
      ""
  );
  const [newProductMrp, setNewProductMrp] = useState("");
  const [productModalError, setProductModalError] = useState<string | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Post-Save Price Review Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<
    (PriceReviewItem & {
      selected: boolean;
      chosenPrice: number;
      publishNow: boolean;
    })[]
  >([]);
  const [savedPurchaseId, setSavedPurchaseId] = useState<string | null>(null);
  const [reviewModalError, setReviewModalError] = useState<string | null>(null);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  // Draft auto-save restore (only when not correcting and no URL supplier pre-fill override)
  useEffect(() => {
    if (correctId) return;

    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          setSupplierId(urlSupplierId || parsed.supplierId || "");
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
  }, [correctId, urlSupplierId]);

  // Debounced auto-save
  useEffect(() => {
    if (correctId) return;

    const handler = setTimeout(() => {
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
    setSupplierId(urlSupplierId || "");
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

  const openQuickAddProduct = (lineId: string | null, prefillName = "") => {
    setTargetLineId(lineId);
    setNewProductName(prefillName);
    setNewProductNameTamil("");
    setNewProductMrp("");
    setProductModalError(null);
    setIsAddProductOpen(true);
  };

  const handleProductKindPreset = (kind: "LOOSE" | "PACKAGED") => {
    setNewProductKind(kind);
    if (kind === "LOOSE") {
      const kg = units.find((u) => u.code === "kg" && u.isBaseable);
      if (kg) setNewProductBaseUnitId(kg.id);
    } else {
      const pkt =
        units.find((u) => u.code === "packet" && u.isBaseable) ||
        units.find((u) => u.code === "piece" && u.isBaseable);
      if (pkt) setNewProductBaseUnitId(pkt.id);
    }
  };

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

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 1) {
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

  const handleProductSelect = async (lineId: string, pId: string) => {
    const prod = products.find((p) => p.id === pId);
    if (!prod) return;

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
          unitId: defaultUnitId,
          isPack: defaultUnit?.dimension === "PACK",
          baseUnitSymbol: prod.baseUnit.symbol,
          lastCost: prod.lastCost,
        };
      })
    );

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
  const handleCreateSupplier = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newSupplierName.trim()) {
      setSupplierModalError("Please enter the wholesale store name.");
      return;
    }
    try {
      setSupplierModalError(null);
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
      setSupplierModalError(
        err instanceof Error ? err.message : "Failed to create wholesale store."
      );
    } finally {
      setIsAddingSupplier(false);
    }
  };

  // Quick Product Creation
  const handleCreateProduct = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newProductName.trim()) {
      setProductModalError("Please enter a product name.");
      return;
    }
    try {
      setProductModalError(null);
      setIsAddingProduct(true);

      const mrpNum = newProductMrp.trim() ? Number(newProductMrp) : null;
      const isLoose = newProductKind === "LOOSE";

      const res = await createProduct({
        name: newProductName.trim(),
        nameTamil: newProductNameTamil.trim() || null,
        categoryId: newProductCategoryId,
        baseUnitId: newProductBaseUnitId,
        sellStep: isLoose ? 0.25 : 1,
        minQty: isLoose ? 0.25 : 1,
        mrp: mrpNum && !isNaN(mrpNum) ? mrpNum : null,
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
        sellingPrice: p.sellingPrice,
        mrp: p.mrp,
      };

      setProducts((prev) => [newProd, ...prev]);

      // Attach to the exact line where user triggered "+ Add", or first empty line
      setLines((prev) => {
        const chosenLineIndex = targetLineId
          ? prev.findIndex((l) => l.id === targetLineId)
          : prev.findIndex((l) => !l.productId);

        if (chosenLineIndex >= 0) {
          return prev.map((l, idx) =>
            idx === chosenLineIndex
              ? {
                  ...l,
                  productId: newProd.id,
                  productName: newProd.name,
                  productNameTamil: newProd.nameTamil,
                  unitId: newProd.baseUnitId,
                  isPack: false,
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
      setTargetLineId(null);
      setNewProductName("");
      setNewProductNameTamil("");
      setNewProductMrp("");
    } catch (err: unknown) {
      setProductModalError(
        err instanceof Error ? err.message : "Failed to create product."
      );
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
      setFormError("Please select or add a wholesale store.");
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

    const formattedItems = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.productId) {
        setFormError(`Item #${i + 1} has no product selected.`);
        return;
      }
      const qty = parseFloat(line.quantity);
      if (isNaN(qty) || qty <= 0) {
        setFormError(`Item #${i + 1} has invalid quantity.`);
        return;
      }
      if (!line.unitId) {
        setFormError(`Item #${i + 1} has no unit selected.`);
        return;
      }
      if (line.isPack) {
        const packFactor = parseFloat(line.unitsPerPack);
        if (isNaN(packFactor) || packFactor <= 0) {
          setFormError(`Item #${i + 1} uses a pack unit — enter how many items are in 1 pack.`);
          return;
        }
      }
      const amt = parseFloat(line.lineAmount);
      if (isNaN(amt) || amt <= 0) {
        setFormError(`Item #${i + 1} needs a valid line total amount.`);
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
      setFormError("Please enter at least one item on this bill.");
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
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }

      setSavedPurchaseId(result.purchaseId);

      if (result.priceReviewItems && result.priceReviewItems.length > 0) {
        setReviewItems(
          result.priceReviewItems.map((item) => ({
            ...item,
            selected: true,
            chosenPrice: item.recommendedPrice,
            publishNow: !item.isPublished,
          }))
        );
        setReviewModalError(null);
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

  // Apply selected selling prices cleanly from modal
  const handleApplyReviewedPrices = async () => {
    const selected = reviewItems.filter((i) => i.selected);
    if (selected.length === 0) return;

    // Client-side MRP guard check for instant friendly feedback
    for (const item of selected) {
      if (!item.chosenPrice || item.chosenPrice <= 0) {
        setReviewModalError(`Please enter a valid selling price for "${item.productName}".`);
        return;
      }
      if (item.mrp && item.chosenPrice > item.mrp) {
        setReviewModalError(
          `Selling price for "${item.productName}" (₹${item.chosenPrice}) cannot exceed MRP (₹${item.mrp}).`
        );
        return;
      }
    }

    try {
      setReviewModalError(null);
      setIsUpdatingPrices(true);

      await applyPurchaseReviewedPrices(
        selected.map((item) => ({
          productId: item.productId,
          sellingPrice: item.chosenPrice,
          publish: item.publishNow,
        }))
      );

      setIsReviewModalOpen(false);
      if (savedPurchaseId) {
        router.push(`/admin/purchases/${savedPurchaseId}`);
      } else {
        router.push("/admin/purchases");
      }
    } catch (err: unknown) {
      setReviewModalError(
        err instanceof Error ? err.message : "Failed to update selling prices."
      );
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const selectedModalCategory = categories.find((c) => c.id === newProductCategoryId);

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
              ? "Correcting replaces the previous bill, adjusts stock, and recalculates item costs."
              : "Pick a wholesale store and enter what you bought — stock updates and selling prices are suggested automatically."}
          </p>
        </div>
      </div>

      {/* Restored draft notice */}
      {hasRestoredDraft && (
        <div className="rounded-lg border border-turmeric/50 bg-turmeric/10 p-3 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-ink">
            <ArrowsClockwise size={16} className="text-leaf shrink-0" />
            <span>
              Restored an unsaved wholesale bill draft from this browser session.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={discardDraft}
            className="h-7 px-2 text-red hover:text-red hover:bg-red/10 text-xs shrink-0"
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
        <Card className="p-4 sm:p-5 bg-surface border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted flex items-center gap-2">
              <Storefront size={18} className="text-leaf" />
              1. Wholesale Store & Bill Info
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-ink">
                  Wholesale Store <span className="text-red">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setSupplierModalError(null);
                    setIsAddSupplierOpen(true);
                  }}
                  className="text-xs text-leaf hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  <Plus size={13} weight="bold" />
                  Add new store
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
        <Card className="p-4 sm:p-5 bg-surface border-border shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted flex items-center gap-2">
                <Package size={18} className="text-leaf" />
                2. Items on Bill ({lines.length})
              </h2>
              <p className="text-xs text-ink-muted">
                Search for a product (or create a new one inline) and enter quantity & bill amount.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openQuickAddProduct(null)}
              className="text-xs text-leaf hover:bg-leaf-light font-semibold inline-flex items-center gap-1 bg-leaf/5 border border-leaf/20 px-3 py-2 rounded-md min-h-[38px] transition-colors"
            >
              <Plus size={14} weight="bold" />
              New product
            </button>
          </div>

          {/* Lines container */}
          <div className="space-y-4">
            {lines.map((line, idx) => {
              const prod = products.find((p) => p.id === line.productId);
              const unit = units.find((u) => u.id === line.unitId);
              const cat = categories.find((c) => c.id === prod?.categoryId);

              const lineRate = parseFloat(line.ratePerUnit);
              const lastCost = line.lastCost;
              let diffPercent: number | null = null;
              if (lastCost && !isNaN(lineRate) && lineRate > 0) {
                diffPercent = Math.round(((lineRate - lastCost) / lastCost) * 100 * 10) / 10;
              }

              // Compute live base-unit cost & selling price suggestion preview
              const qtyVal = parseFloat(line.quantity);
              const amtVal = parseFloat(line.lineAmount);
              let baseQty = 0;
              if (!isNaN(qtyVal) && qtyVal > 0 && unit) {
                if (unit.dimension === "PACK") {
                  const packSize = parseFloat(line.unitsPerPack);
                  if (!isNaN(packSize) && packSize > 0) {
                    baseQty = qtyVal * packSize;
                  }
                } else if (unit.factorToBase) {
                  baseQty = qtyVal * unit.factorToBase;
                } else {
                  baseQty = qtyVal;
                }
              }
              const liveUnitCost =
                baseQty > 0 && !isNaN(amtVal) && amtVal > 0 ? amtVal / baseQty : null;

              const recPrice =
                liveUnitCost && cat
                  ? Math.ceil(liveUnitCost * (1 + cat.recommendedMarkup / 100))
                  : null;
              const lowPrice =
                liveUnitCost && cat
                  ? Math.ceil(liveUnitCost * (1 + cat.lowMarkup / 100))
                  : null;
              const highPrice =
                liveUnitCost && cat
                  ? Math.ceil(liveUnitCost * (1 + cat.highMarkup / 100))
                  : null;

              return (
                <div
                  key={line.id}
                  className="p-3.5 sm:p-4 rounded-lg border border-border/90 bg-page/30 space-y-3 relative"
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
                      className="h-8 w-8 p-0 text-ink-muted hover:text-red hover:bg-red/10"
                      title="Remove item"
                    >
                      <Trash size={15} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    {/* Searchable Product Selector */}
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[11px] font-semibold text-ink">
                        Product <span className="text-red">*</span>
                      </label>
                      <SearchableProductSelect
                        products={products}
                        selectedId={line.productId}
                        onSelect={(pId) => handleProductSelect(line.id, pId)}
                        onQuickCreate={(prefill) => openQuickAddProduct(line.id, prefill)}
                      />

                      {line.lastCost !== null && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted pt-0.5">
                          <span>Last cost:</span>
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
                        className="h-[42px] text-center font-mono font-semibold"
                      />
                    </div>

                    {/* Unit select */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-ink">
                        Bought In <span className="text-red">*</span>
                      </label>
                      <select
                        value={line.unitId}
                        onChange={(e) => handleUnitSelect(line.id, e.target.value)}
                        required
                        className="w-full h-[42px] rounded-md border border-border bg-surface px-2 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-leaf font-medium"
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
                      <label className="text-[11px] font-semibold text-ink">Rate (₹)</label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Rate"
                        value={line.ratePerUnit}
                        onChange={(e) => handleRateChange(line.id, e.target.value)}
                        className="h-[42px] text-right font-mono text-xs"
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
                        className="h-[42px] text-right font-mono font-bold text-sm text-leaf"
                      />
                    </div>
                  </div>

                  {/* Pack size helper */}
                  {line.isPack && (
                    <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-3 text-xs bg-turmeric/10 p-2.5 rounded">
                      <Package size={16} className="text-leaf shrink-0" />
                      <div className="flex-1 min-w-[180px]">
                        <span className="font-medium text-ink">
                          Pack Helper: How many {line.baseUnitSymbol || "units"} are in 1{" "}
                          {unit?.label?.toLowerCase() || "pack"}?
                        </span>
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          step="any"
                          placeholder="e.g. 25"
                          value={line.unitsPerPack}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.id === line.id ? { ...l, unitsPerPack: e.target.value } : l
                              )
                            )
                          }
                          required={line.isPack}
                          className="h-9 text-right font-mono text-xs bg-surface"
                        />
                      </div>
                    </div>
                  )}

                  {/* Live Selling Price Suggestion Preview */}
                  {prod && liveUnitCost && cat && recPrice && (
                    <div className="rounded-md bg-leaf-light/70 border border-leaf/25 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-leaf flex items-center gap-1.5">
                          <Sparkle size={14} weight="fill" className="text-turmeric-dark shrink-0" />
                          <span>
                            Cost: {formatINR(liveUnitCost)}/{prod.baseUnit.symbol} → Suggested Sell Price:{" "}
                            <span className="font-mono font-bold text-ink underline decoration-turmeric decoration-2">
                              {formatINR(recPrice)}/{prod.baseUnit.symbol}
                            </span>
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          Based on <strong>{cat.name}</strong> (+{cat.recommendedMarkup}% profit rule · Range: Low {formatINR(lowPrice!)} · High {formatINR(highPrice!)})
                        </div>
                      </div>

                      <div className="text-[11px] shrink-0 font-medium">
                        {prod.sellingPrice === null ? (
                          <span className="inline-block bg-turmeric/25 text-ink px-2 py-1 rounded font-semibold">
                            Not priced yet — confirm after saving
                          </span>
                        ) : prod.sellingPrice <= liveUnitCost ? (
                          <span className="inline-block bg-red-light text-red px-2 py-1 rounded font-semibold border border-red/20">
                            Store price {formatINR(prod.sellingPrice)} is below cost!
                          </span>
                        ) : (
                          <span className="inline-block bg-surface text-leaf px-2 py-1 rounded border border-border">
                            Current store price: <strong className="font-mono">{formatINR(prod.sellingPrice)}</strong>
                          </span>
                        )}
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
            className="w-full gap-2 border-dashed border-border py-4 font-semibold text-xs hover:bg-page min-h-[44px]"
          >
            <Plus size={16} weight="bold" />
            Add another item to bill
          </Button>
        </Card>

        {/* Step 3: Extra Charges & Notes */}
        <Card className="p-4 sm:p-5 bg-surface border-border shadow-xs space-y-4">
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
                Extra charges are split fairly across items to calculate true unit cost.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Notes / Reference</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid by cash, auto transport"
                className="h-11"
              />
            </div>
          </div>
        </Card>

        {/* Grand Total Summary Box */}
        <Card className="p-4 sm:p-5 bg-page/70 border-border/80 shadow-xs space-y-3">
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
        <div className="sticky bottom-16 md:bottom-4 z-20 bg-surface/95 backdrop-blur-md p-3.5 sm:p-4 rounded-xl border border-border shadow-md flex items-center justify-between gap-3">
          <div className="hidden sm:block">
            <div className="text-xs text-ink-muted">Grand Total:</div>
            <div className="text-xl font-bold font-mono text-ink">
              {formatINR(grandTotal)}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link href="/admin/purchases" className="w-1/3 sm:w-auto">
              <Button type="button" variant="outline" className="w-full min-h-[44px]">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="turmeric"
              disabled={isSubmitting}
              className="flex-1 sm:w-auto px-6 sm:px-8 gap-2 font-bold shadow-sm min-h-[44px]"
            >
              <FloppyDisk size={18} weight="bold" />
              {isSubmitting
                ? "Saving bill..."
                : correctId
                ? "Save corrected bill"
                : "Save bill & suggest prices"}
            </Button>
          </div>
        </div>
      </form>

      {/* Quick Add Wholesale Store Modal */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Add Wholesale Store</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Enter the store name to start. Phone and market area are optional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSupplier} className="space-y-3 py-2">
            {supplierModalError && (
              <div className="p-2.5 rounded bg-red-light text-red text-xs font-medium border border-red/20">
                {supplierModalError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Wholesale Store Name <span className="text-red">*</span>
              </label>
              <Input
                placeholder="e.g. Sri Meenakshi Traders"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                autoFocus
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Phone (optional)</label>
              <Input
                placeholder="e.g. 9842100000"
                value={newSupplierPhone}
                onChange={(e) => setNewSupplierPhone(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Market Area (optional)</label>
              <Input
                placeholder="e.g. Main Wholesale Market"
                value={newSupplierArea}
                onChange={(e) => setNewSupplierArea(e.target.value)}
                className="h-10"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddSupplierOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="turmeric"
                disabled={isAddingSupplier || !newSupplierName.trim()}
              >
                {isAddingSupplier ? "Adding..." : "Add Store"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Product Modal */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Quick Add Product</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Create the product now, enter what you paid on this bill, and we will suggest your selling price right away.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProduct} className="space-y-3 py-2">
            {productModalError && (
              <div className="p-2.5 rounded bg-red-light text-red text-xs font-medium border border-red/20">
                {productModalError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Product Name <span className="text-red">*</span>
              </label>
              <Input
                placeholder="e.g. Toor Dal Premium"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                autoFocus
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Tamil Name <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <Input
                placeholder="எ.கா. துவரம் பருப்பு"
                value={newProductNameTamil}
                onChange={(e) => setNewProductNameTamil(e.target.value)}
                className="h-10 font-tamil"
              />
            </div>

            {/* 1-tap Loose vs Packaged preset */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">How do customers buy it?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleProductKindPreset("PACKAGED")}
                  className={`p-2 rounded-md border text-xs font-semibold text-left transition-colors ${
                    newProductKind === "PACKAGED"
                      ? "border-leaf bg-leaf-light text-leaf"
                      : "border-border bg-surface text-ink-muted hover:text-ink"
                  }`}
                >
                  <div>Packaged / Piece</div>
                  <div className="text-[10px] font-normal opacity-80">Sold by 1 pkt / pc / btl</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleProductKindPreset("LOOSE")}
                  className={`p-2 rounded-md border text-xs font-semibold text-left transition-colors ${
                    newProductKind === "LOOSE"
                      ? "border-leaf bg-leaf-light text-leaf"
                      : "border-border bg-surface text-ink-muted hover:text-ink"
                  }`}
                >
                  <div>Loose Weight / Oil</div>
                  <div className="text-[10px] font-normal opacity-80">Sold from 0.25 kg / L</div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">Category</label>
                <select
                  value={newProductCategoryId}
                  onChange={(e) => setNewProductCategoryId(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-surface px-2.5 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-leaf font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">Base Unit</label>
                <select
                  value={newProductBaseUnitId}
                  onChange={(e) => setNewProductBaseUnitId(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-surface px-2.5 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-leaf font-medium"
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

            {selectedModalCategory && (
              <div className="rounded bg-leaf-light/60 border border-leaf/20 px-2.5 py-1.5 text-[11px] text-leaf">
                Price suggestion rule for <strong>{selectedModalCategory.name}</strong>:{" "}
                Low +{selectedModalCategory.lowMarkup}% · Rec +{selectedModalCategory.recommendedMarkup}% · High +{selectedModalCategory.highMarkup}%
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                MRP printed on pack (₹){" "}
                <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="Leave blank if loose item"
                value={newProductMrp}
                onChange={(e) => setNewProductMrp(e.target.value)}
                className="h-10 font-mono"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddProductOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="turmeric"
                disabled={isAddingProduct || !newProductName.trim()}
              >
                {isAddingProduct ? "Adding..." : "Create & Add to Bill"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Post-Save Price Review Modal Dialog */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-lg text-ink">
              <Sparkle size={20} weight="fill" className="text-turmeric" />
              Set Your Selling Prices
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted leading-relaxed">
              Bill saved! Here are recommended selling prices calculated from what you paid plus your category profit rules. Pick a suggestion or enter any custom price.
            </DialogDescription>
          </DialogHeader>

          {reviewModalError && (
            <div className="p-2.5 rounded bg-red-light text-red text-xs font-medium border border-red/20 flex items-center gap-2">
              <WarningCircle size={15} weight="bold" />
              <span>{reviewModalError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {reviewItems.map((item, idx) => {
              const profit = item.chosenPrice - item.newCost;
              const profitPct =
                item.newCost > 0 ? Math.round((profit / item.newCost) * 1000) / 10 : 0;
              const isChosenBelowCost = item.chosenPrice > 0 && item.chosenPrice < item.newCost;
              const isAboveMrp = item.mrp !== null && item.chosenPrice > item.mrp;

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

                    <div className="text-right text-xs">
                      <div className="text-ink-muted">
                        You paid:{" "}
                        <span className="font-bold text-ink font-mono">
                          {formatINR(item.newCost)}/{item.baseUnitSymbol}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        Old selling price:{" "}
                        <span className="font-mono">
                          {item.currentSellingPrice
                            ? formatINR(item.currentSellingPrice)
                            : "Not set yet"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Plain formula explainer */}
                  <div className="text-[11px] text-leaf bg-surface/80 border border-border/60 rounded px-2.5 py-1.5">
                    <strong>How we suggest this:</strong> {item.categoryName} default (+
                    {item.categoryDefaultMarkup}% profit) → Cost {formatINR(item.newCost)} +{" "}
                    {item.categoryDefaultMarkup}% ={" "}
                    <strong className="font-mono">{formatINR(item.recommendedPrice)}</strong>
                    {item.mrp ? ` (MRP limit: ${formatINR(item.mrp)})` : ""}
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
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
                      className={`text-xs px-2.5 py-1.5 rounded-md border font-mono ${
                        item.chosenPrice === item.lowPrice
                          ? "bg-leaf text-white border-leaf"
                          : "bg-surface hover:bg-page border-border text-ink"
                      }`}
                    >
                      Low (+{item.lowMarkup}%): {formatINR(item.lowPrice)}
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
                      className={`text-xs px-2.5 py-1.5 rounded-md border font-mono ${
                        item.chosenPrice === item.recommendedPrice
                          ? "bg-turmeric text-ink border-turmeric font-bold"
                          : "bg-surface hover:bg-page border-border text-ink"
                      }`}
                    >
                      ★ Rec (+{item.categoryDefaultMarkup}%): {formatINR(item.recommendedPrice)}
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
                      className={`text-xs px-2.5 py-1.5 rounded-md border font-mono ${
                        item.chosenPrice === item.highPrice
                          ? "bg-leaf text-white border-leaf"
                          : "bg-surface hover:bg-page border-border text-ink"
                      }`}
                    >
                      High (+{item.highMarkup}%): {formatINR(item.highPrice)}
                    </button>

                    {/* Custom price input */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[11px] text-ink-muted">Sell ₹:</span>
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
                          );
                        }}
                        className="h-9 w-24 text-right font-mono text-xs font-bold bg-surface"
                      />
                    </div>
                  </div>

                  {/* Live profit / warning & publish toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <div>
                      {isAboveMrp ? (
                        <span className="text-red font-semibold">
                          Exceeds MRP ({formatINR(item.mrp!)})! Please lower to MRP or below.
                        </span>
                      ) : isChosenBelowCost ? (
                        <span className="text-red font-semibold">
                          Loss warning: selling for less than {formatINR(item.newCost)} cost!
                        </span>
                      ) : (
                        <span className="text-leaf font-semibold font-mono">
                          Your profit: +{formatINR(profit)}/{item.baseUnitSymbol} (+{profitPct}%)
                        </span>
                      )}
                    </div>

                    {!item.isPublished && (
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-ink font-medium">
                        <input
                          type="checkbox"
                          checked={item.publishNow}
                          onChange={(e) =>
                            setReviewItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, publishNow: e.target.checked } : it
                              )
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-border text-leaf focus:ring-leaf"
                        />
                        <span>Publish to customer store now</span>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-3">
            <Button
              type="button"
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
              type="button"
              variant="turmeric"
              onClick={handleApplyReviewedPrices}
              disabled={
                isUpdatingPrices || reviewItems.filter((i) => i.selected).length === 0
              }
              className="gap-1.5 font-bold"
            >
              <CheckCircle size={16} weight="bold" />
              {isUpdatingPrices ? "Saving prices..." : "Apply selected prices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
