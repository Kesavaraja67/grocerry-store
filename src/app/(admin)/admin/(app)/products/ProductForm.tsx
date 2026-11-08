"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CurrencyInr,
  Tag,
  UploadSimple,
  Trash,
  CheckCircle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { createProduct, updateProduct } from "@/server/admin/products";
import {
  calculatePriceMetrics,
  calculatePriceFromMarkup,
  generatePriceSuggestions,
  validateSellingPrice,
} from "@/server/domain/pricing";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/format";

interface CategoryOption {
  id: string;
  name: string;
  lowMarkup: number;
  recommendedMarkup: number;
  highMarkup: number;
}

interface UnitOption {
  id: string;
  label: string;
  symbol: string;
  code: string;
}

interface ProductFormProps {
  categories: CategoryOption[];
  baseUnits: UnitOption[];
  initialData?: {
    id: string;
    name: string;
    nameTamil: string | null;
    brand: string | null;
    description: string | null;
    sizeLabel: string | null;
    categoryId: string;
    baseUnitId: string;
    sellStep: number;
    minQty: number;
    maxQty: number;
    sellingPrice: number | null;
    mrp: number | null;
    lowStockAt: number;
    isPublished: boolean;
    isFeatured: boolean;
    cost?: {
      lastCost: number | null;
      avgCost: number | null;
      costBasis: "LATEST" | "AVERAGE";
    } | null;
    images?: Array<{ url: string; publicId: string; alt?: string | null }>;
  };
}

export function ProductForm({
  categories,
  baseUnits,
  initialData,
}: ProductFormProps) {
  const router = useRouter();

  // Basic Details
  const [name, setName] = useState(initialData?.name || "");
  const [nameTamil, setNameTamil] = useState(initialData?.nameTamil || "");
  const [brand, setBrand] = useState(initialData?.brand || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [sizeLabel, setSizeLabel] = useState(initialData?.sizeLabel || "");
  const [categoryId, setCategoryId] = useState(
    initialData?.categoryId || categories[0]?.id || ""
  );
  const [baseUnitId, setBaseUnitId] = useState(
    initialData?.baseUnitId || baseUnits[0]?.id || ""
  );
  const [sellStep, setSellStep] = useState(initialData?.sellStep || 1);
  const [minQty, setMinQty] = useState(initialData?.minQty || 1);
  const [maxQty, setMaxQty] = useState(initialData?.maxQty || 50);
  const [lowStockAt, setLowStockAt] = useState(initialData?.lowStockAt || 5);
  const [isPublished, setIsPublished] = useState(initialData?.isPublished || false);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);

  // Pricing Fields
  const [mrp, setMrp] = useState<string>(
    initialData?.mrp ? String(initialData.mrp) : ""
  );
  const [sellingPrice, setSellingPrice] = useState<string>(
    initialData?.sellingPrice ? String(initialData.sellingPrice) : ""
  );
  const [customMarkup, setCustomMarkup] = useState<string>("");

  // Images state (up to 3 images)
  const [images, setImages] = useState<Array<{ url: string; publicId: string; alt?: string }>>(
    initialData?.images?.map((img) => ({
      url: img.url,
      publicId: img.publicId,
      alt: img.alt || undefined,
    })) || []
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cost and active category info
  const selectedCat = categories.find((c) => c.id === categoryId);
  const currentCost = initialData?.cost
    ? initialData.cost.costBasis === "AVERAGE" && initialData.cost.avgCost
      ? initialData.cost.avgCost
      : initialData.cost.lastCost
    : null;

  // Calculate live metrics
  const priceNum = Number(sellingPrice);
  const mrpNum = mrp !== "" ? Number(mrp) : null;
  const metrics =
    priceNum > 0 && currentCost
      ? calculatePriceMetrics(priceNum, currentCost, mrpNum)
      : null;

  // Calculate Low/Recommended/High suggestions from category markups
  const suggestions =
    currentCost && selectedCat
      ? generatePriceSuggestions(currentCost, {
          lowMarkup: selectedCat.lowMarkup,
          recommendedMarkup: selectedCat.recommendedMarkup,
          highMarkup: selectedCat.highMarkup,
        })
      : null;

  // When selling price changes, back-calculate markup if cost exists
  const handlePriceChange = (newPrice: string) => {
    setSellingPrice(newPrice);
    const p = Number(newPrice);
    if (currentCost && p > 0) {
      const calcMarkup = ((p - currentCost) / currentCost) * 100;
      setCustomMarkup(calcMarkup.toFixed(1));
    }
  };

  // When custom markup % changes, calculate selling price
  const handleMarkupChange = (newMarkup: string) => {
    setCustomMarkup(newMarkup);
    const m = Number(newMarkup);
    if (currentCost && !isNaN(m)) {
      const p = calculatePriceFromMarkup(currentCost, m, "UP_1");
      setSellingPrice(p.toFixed(2));
    }
  };

  // Apply suggestion chip
  const applySuggestion = (suggestedPrice: number, markupPct: number) => {
    setSellingPrice(suggestedPrice.toFixed(2));
    setCustomMarkup(markupPct.toFixed(1));
  };

  // Quick unit step presets for loose goods vs packets
  const handleUnitChange = (unitId: string) => {
    setBaseUnitId(unitId);
    const chosen = baseUnits.find((u) => u.id === unitId);
    if (chosen?.code === "kg" || chosen?.code === "litre") {
      setSellStep(0.25);
      setMinQty(0.25);
    } else {
      setSellStep(1);
      setMinQty(1);
    }
  };

  // Mock / signed Cloudinary image upload simulation
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 3) {
      alert("You can upload a maximum of 3 images per product.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("Image must be smaller than 3 MB.");
      return;
    }

    setUploadingImage(true);
    try {
      // In a real upload, we post to Cloudinary using signed upload params
      // For instant reliable preview in dev/MVP without requiring external Cloudinary credentials:
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImages((prev) => [
          ...prev,
          { url: dataUrl, publicId: `local_${Date.now()}` },
        ]);
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch {
      alert("Image upload failed.");
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    const price = sellingPrice !== "" ? Number(sellingPrice) : null;
    const mrpVal = mrp !== "" ? Number(mrp) : null;

    // Validate MRP guard
    if (price && mrpVal) {
      const v = validateSellingPrice(price, currentCost, mrpVal);
      if (!v.isValid) {
        setErrorMessage(v.error || "Invalid price");
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        name,
        nameTamil: nameTamil || null,
        brand: brand || null,
        description: description || null,
        sizeLabel: sizeLabel || null,
        categoryId,
        baseUnitId,
        sellStep: Number(sellStep),
        minQty: Number(minQty),
        maxQty: Number(maxQty),
        sellingPrice: price,
        mrp: mrpVal,
        lowStockAt: Number(lowStockAt),
        isPublished,
        isFeatured,
      };

      if (initialData?.id) {
        await updateProduct(initialData.id, payload, images);
      } else {
        await createProduct(payload, images);
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save product.";
      setErrorMessage(msg);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-md bg-red-light text-red border border-[#FAD2CF] text-xs font-semibold"
        >
          {errorMessage}
        </div>
      )}

      {/* 1. Basic Product Information */}
      <Card>
        <CardHeader>
          <CardTitle>Product information</CardTitle>
          <CardDescription>
            Enter product names in English and optional Tamil for local search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Product name (English) *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ponni Boiled Rice"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Tamil name <span className="text-muted font-normal font-tamil">(தமிழ் பெயர்)</span>
              </label>
              <Input
                value={nameTamil}
                onChange={(e) => setNameTamil(e.target.value)}
                placeholder="e.g. பொன்னி புழுங்கல் அரிசி"
                className="font-tamil"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Category *</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Stock & pricing unit *</label>
              <Select value={baseUnitId} onValueChange={handleUnitChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {baseUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label} ({u.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Pack / Size label</label>
              <Input
                value={sizeLabel}
                onChange={(e) => setSizeLabel(e.target.value)}
                placeholder="e.g. 1 L pouch, 500 g"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Brand (optional)</label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Aavin, Narasu's, Fortune"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Low stock alert threshold</label>
              <Input
                type="number"
                min={0}
                value={lowStockAt}
                onChange={(e) => setLowStockAt(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description for customers on the storefront"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Customer Order Steps & Limits (Loose vs Packaged) */}
      <Card>
        <CardHeader>
          <CardTitle>Quantities & Ordering steps</CardTitle>
          <CardDescription>
            Loose goods (like rice) can be sold in 0.25 kg steps. Packaged goods sell in 1 unit steps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Quantity step (sellStep)</label>
              <Input
                type="number"
                step="0.05"
                min="0.05"
                required
                value={sellStep}
                onChange={(e) => setSellStep(Number(e.target.value))}
              />
              <span className="text-[11px] text-muted">e.g. 0.25 for loose, 1 for packets</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Min order qty</label>
              <Input
                type="number"
                step="0.05"
                min="0.05"
                required
                value={minQty}
                onChange={(e) => setMinQty(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Max order qty</label>
              <Input
                type="number"
                step="1"
                min="1"
                required
                value={maxQty}
                onChange={(e) => setMaxQty(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Pricing Engine Panel (Section 9.4 & 10) */}
      <Card className="border-leaf/30 shadow-xs">
        <CardHeader className="bg-leaf-light/50 border-b border-border/80">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-leaf flex items-center gap-1.5">
                <CurrencyInr size={20} weight="bold" />
                <span>Pricing & Markup Engine</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted mt-0.5">
                Calculate selling price with Low, Recommended, and High markup suggestions.
              </CardDescription>
            </div>
            {currentCost && (
              <Badge variant="outline" className="tabular-nums privacy-figure">
                Wholesale cost: {formatINR(currentCost)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Wholesale cost status */}
          {!currentCost ? (
            <div className="p-3 rounded-md bg-page border border-border text-xs text-muted flex items-center gap-2">
              <Tag size={16} className="text-muted shrink-0" />
              <span>
                No purchase recorded for this item yet. Record a wholesale purchase to receive profit suggestions.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">Category suggestion starting points:</span>
                <span className="text-[11px] text-muted italic">Starting points only, not market prices</span>
              </div>

              {suggestions && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      applySuggestion(
                        Number(suggestions.low.price),
                        Number(suggestions.low.markupPercent)
                      )
                    }
                    className="p-3 rounded-lg border border-border bg-surface hover:border-leaf/50 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Low ({suggestions.low.markupPercent.toString()}%)</span>
                      <span className="text-[11px] font-medium text-emerald-700">
                        {suggestions.low.marginPercent.toString()}% margin
                      </span>
                    </div>
                    <div className="text-lg font-bold text-ink mt-1 tabular-nums">
                      {formatINR(suggestions.low.price.toString())}
                    </div>
                    <span className="text-[11px] text-muted block">
                      Profit: {formatINR(suggestions.low.profitPerUnit.toString())}/unit
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applySuggestion(
                        Number(suggestions.recommended.price),
                        Number(suggestions.recommended.markupPercent)
                      )
                    }
                    className="p-3 rounded-lg border-2 border-leaf bg-leaf-light/40 hover:bg-leaf-light transition-colors text-left"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-leaf">
                      <span>Recommended ({suggestions.recommended.markupPercent.toString()}%)</span>
                      <span className="text-[11px] font-bold text-emerald-800">
                        {suggestions.recommended.marginPercent.toString()}% margin
                      </span>
                    </div>
                    <div className="text-lg font-bold text-leaf mt-1 tabular-nums">
                      {formatINR(suggestions.recommended.price.toString())}
                    </div>
                    <span className="text-[11px] text-muted block">
                      Profit: {formatINR(suggestions.recommended.profitPerUnit.toString())}/unit
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applySuggestion(
                        Number(suggestions.high.price),
                        Number(suggestions.high.markupPercent)
                      )
                    }
                    className="p-3 rounded-lg border border-border bg-surface hover:border-leaf/50 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>High ({suggestions.high.markupPercent.toString()}%)</span>
                      <span className="text-[11px] font-medium text-emerald-700">
                        {suggestions.high.marginPercent.toString()}% margin
                      </span>
                    </div>
                    <div className="text-lg font-bold text-ink mt-1 tabular-nums">
                      {formatINR(suggestions.high.price.toString())}
                    </div>
                    <span className="text-[11px] text-muted block">
                      Profit: {formatINR(suggestions.high.profitPerUnit.toString())}/unit
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Direct Price & Markup Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Selling price (₹) *</label>
              <Input
                type="number"
                step="0.25"
                min="0"
                value={sellingPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
                className="font-bold text-base h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Custom markup (%)</label>
              <Input
                type="number"
                step="0.5"
                value={customMarkup}
                onChange={(e) => handleMarkupChange(e.target.value)}
                placeholder="e.g. 12"
                disabled={!currentCost}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">MRP (Maximum Retail Price)</label>
              <Input
                type="number"
                step="0.5"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="Leave blank if loose"
              />
              <span className="text-[11px] text-muted">Enforces Indian packaged goods rule</span>
            </div>
          </div>

          {/* Computed Metrics & Warnings (Section 9.4) */}
          {metrics && (
            <div className="p-3 rounded-lg bg-page border border-border space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted">
                  Markup: <strong className="text-ink">{metrics.markupPercent.toString()}%</strong>
                </span>
                <span className="text-muted">
                  Margin: <strong className="text-emerald-700">{metrics.marginPercent.toString()}%</strong>
                </span>
                <span className="text-muted">
                  Profit per unit: <strong className="text-ink">{formatINR(metrics.profitPerUnit.toString())}</strong>
                </span>
              </div>
              <p className="text-[11px] text-muted border-t border-border/60 pt-1.5">
                Helper: A 20% markup gives a 16.67% margin. Profit is calculated on selling price.
              </p>

              {metrics.isBelowCost && (
                <div className="flex items-center gap-1.5 text-red font-semibold text-xs pt-1">
                  <WarningCircle size={16} />
                  <span>Warning: Selling price is lower than what you paid for this item.</span>
                </div>
              )}
              {metrics.isAboveMRP && (
                <div className="flex items-center gap-1.5 text-red font-semibold text-xs pt-1">
                  <WarningCircle size={16} />
                  <span>Error: Selling price cannot exceed Maximum Retail Price MRP.</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Product Photos (up to 3 images) */}
      <Card>
        <CardHeader>
          <CardTitle>Product photos</CardTitle>
          <CardDescription>
            Upload up to 3 clear product photos. First image is the primary storefront thumbnail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative w-24 h-24 rounded-lg border border-border overflow-hidden bg-page group"
              >
                <Image
                  src={img.url}
                  alt={`Product image ${idx + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <X size={12} weight="bold" />
                </button>
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 bg-ink/70 text-white text-[9px] px-1 rounded font-medium">
                    Primary
                  </span>
                )}
              </div>
            ))}

            {images.length < 3 && (
              <label className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-leaf/50 flex flex-col items-center justify-center cursor-pointer text-muted hover:text-leaf transition-colors text-center p-2">
                <UploadSimple size={20} />
                <span className="text-[10px] mt-1 font-medium">
                  {uploadingImage ? "Uploading..." : "Add photo"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            )}
          </div>
          <p className="text-[11px] text-muted">
            PNG, JPG, or WEBP up to 3 MB. Products without photos will render a clean category icon tile automatically.
          </p>
        </CardContent>
      </Card>

      {/* 5. Publishing & Storefront Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Storefront visibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="isPublished"
              checked={isPublished}
              onCheckedChange={(checked) => setIsPublished(!!checked)}
            />
            <label htmlFor="isPublished" className="text-sm font-semibold text-ink cursor-pointer">
              Publish on storefront (visible to customers)
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="isFeatured"
              checked={isFeatured}
              onCheckedChange={(checked) => setIsFeatured(!!checked)}
            />
            <label htmlFor="isFeatured" className="text-sm font-medium text-ink cursor-pointer">
              Feature in "Today's essentials" on homepage
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 bg-surface/95 backdrop-blur-xs p-4 -mx-4 -mb-4 sm:mx-0 sm:mb-0 border-t sm:border border-border sm:rounded-lg flex items-center justify-between shadow-xs">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" variant="turmeric" disabled={saving} className="font-semibold px-6">
          {saving ? "Saving..." : initialData?.id ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
