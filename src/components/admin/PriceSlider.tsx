"use client";

import React, { useState, useTransition } from "react";
import {
  CurrencyInr,
  WarningCircle,
  CheckCircle,
  Plus,
  Minus,
} from "@phosphor-icons/react";
import { updateProductSellingPrice } from "@/server/admin/pricing";
import { priceFromSlider, SliderPriceResult } from "@/server/domain/pricing";
import { Button } from "@/components/ui/button";

interface PriceSliderProps {
  productId: string;
  productName?: string;
  unitSymbol: string;
  cost: number;
  mrp: number | null;
  currentPrice: number | null;
  recommendedMarkupPercent?: number;
  onPriceSaved?: (newPrice: number) => void;
}

export function PriceSlider({
  productId,
  productName,
  unitSymbol,
  cost,
  mrp,
  currentPrice,
  recommendedMarkupPercent = 10,
  onPriceSaved,
}: PriceSliderProps) {
  // Initial price calculation
  const initialResult = priceFromSlider({
    cost,
    mrp,
    currentPrice,
    recommendedMarkupPercent,
  });

  const [chosenPrice, setChosenPrice] = useState<number>(initialResult.price);
  const [isPending, startTransition] = useTransition();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute metrics dynamically from chosenPrice
  const metrics: SliderPriceResult = priceFromSlider({
    cost,
    mrp,
    currentPrice,
    chosenPrice,
    recommendedMarkupPercent,
  });

  const handlePriceChange = (val: number) => {
    if (metrics.isDisabled) return;
    const clamped = Math.max(1, Math.round(val));
    setChosenPrice(clamped);
    setSavedSuccess(false);
    setError(null);
  };

  const handleStep = (step: number) => {
    const next = chosenPrice + step;
    if (mrp && next > mrp) return;
    handlePriceChange(next);
  };

  const handleSave = () => {
    if (metrics.isDisabled) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await updateProductSellingPrice(productId, chosenPrice);
        if (res.success) {
          setSavedSuccess(true);
          onPriceSaved?.(chosenPrice);
          setTimeout(() => setSavedSuccess(false), 3000);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to save price.";
        setError(msg);
      }
    });
  };

  const handleKeepCurrent = () => {
    if (currentPrice && currentPrice > 0) {
      handlePriceChange(currentPrice);
      handleSave();
    }
  };

  if (metrics.isDisabled) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-sm text-amber-900">
        <div className="flex items-center gap-2 font-bold text-amber-800">
          <WarningCircle size={20} weight="bold" />
          <span>Cannot set price with slider</span>
        </div>
        <p className="text-xs">
          {metrics.disabledReason || "MRP is below what you paid. Please update the purchase cost or MRP."}
        </p>
        <p className="text-xs font-mono">
          Cost: ₹{cost} · MRP: ₹{mrp ?? "—"}
        </p>
      </div>
    );
  }

  const ariaValueText = `Selling price ₹${chosenPrice} per ${unitSymbol}. ${
    metrics.isBelowCost
      ? `Warning: Selling below cost, loss of ₹${Math.abs(metrics.profitPerUnit)} per ${unitSymbol}.`
      : `You earn ₹${metrics.profitPerUnit} profit per ${unitSymbol}.`
  }`;

  const sliderSpan = Math.max(1, metrics.maxSlider - metrics.minSlider);
  const clampedForBar = Math.min(metrics.maxSlider, Math.max(metrics.minSlider, chosenPrice));
  const fillPercent = Math.min(
    100,
    Math.max(0, ((clampedForBar - metrics.minSlider) / sliderSpan) * 100)
  );
  const costPercent = Math.min(
    100,
    Math.max(0, ((cost - metrics.minSlider) / sliderSpan) * 100)
  );
  const inputId = `custom-price-input-${productId}`;

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div>
          <h3 className="font-bold text-base text-ink font-heading">
            {productName ? productName : "Set selling price"}
          </h3>
          <p className="text-xs text-muted">
            {productName
              ? "Set selling price — slide or enter rupees"
              : "Move the slider or enter a price in rupees."}
          </p>
        </div>

        {/* Current price badge */}
        <div className="text-right shrink-0 ml-3">
          <p className="text-xs text-muted">Currently</p>
          <p className="text-sm font-bold font-mono text-ink">
            {currentPrice ? `₹${currentPrice}/${unitSymbol}` : "Not set"}
          </p>
        </div>
      </div>

      {/* Warning if below cost */}
      {metrics.isBelowCost && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <WarningCircle size={18} weight="bold" className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Selling price is below what you paid (₹{cost})</p>
            <p className="text-[11px] text-red-600 mt-0.5">
              You will lose ₹{Math.abs(metrics.profitPerUnit)} on each {unitSymbol} sold.
            </p>
          </div>
        </div>
      )}

      {/* Main Price Readout */}
      <div className="flex items-center justify-between bg-page p-3.5 rounded-xl border border-border">
        <div>
          <p className="text-xs text-muted">New selling price</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-ink">
              ₹{chosenPrice}
            </span>
            <span className="text-xs font-semibold text-muted">/{unitSymbol}</span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted">What you paid: ₹{cost}</p>
          <p
            className={`text-sm font-bold font-mono mt-0.5 ${
              metrics.isBelowCost
                ? "text-red-600"
                : "text-emerald-700"
            }`}
          >
            {metrics.isBelowCost
              ? `−₹${Math.abs(metrics.profitPerUnit)} loss`
              : `+₹${metrics.profitPerUnit} profit (${metrics.markupPercent}%)`}
          </p>
        </div>
      </div>

      {/* Slider & Quick Step Buttons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted font-mono px-1">
          <span>₹{metrics.minSlider} (min)</span>
          {mrp && <span>₹{mrp} (MRP max)</span>}
          {!mrp && <span>₹{metrics.maxSlider}</span>}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            disabled={chosenPrice <= metrics.minSlider}
            aria-label="Decrease price by ₹1"
            className="w-11 h-11 rounded-xl border border-border bg-page hover:bg-leaf-light hover:text-leaf flex items-center justify-center font-bold text-ink transition-colors disabled:opacity-40 min-h-[44px] shrink-0"
          >
            <Minus size={16} weight="bold" />
          </button>

          {/* Accessible Custom-Styled Range Slider */}
          <div className="flex-1 relative h-11 min-h-[44px] flex items-center select-none px-1">
            <input
              type="range"
              min={metrics.minSlider}
              max={metrics.maxSlider}
              step={1}
              value={clampedForBar}
              onChange={(e) => handlePriceChange(Number(e.target.value))}
              aria-label={`Selling price per ${unitSymbol}`}
              aria-valuetext={ariaValueText}
              className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0"
            />
            {/* Track */}
            <div className="w-full h-3 rounded-full bg-stone-200 border border-border overflow-hidden pointer-events-none">
              <div
                className={`h-full rounded-full ${
                  metrics.isBelowCost ? "bg-red-500" : "bg-leaf"
                }`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
            {/* Cost Marker Tick */}
            {cost >= metrics.minSlider && cost <= metrics.maxSlider && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-600/80 rounded-full pointer-events-none"
                style={{ left: `${costPercent}%` }}
              />
            )}
            {/* Visible Thumb */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white border-[3px] shadow-md pointer-events-none peer-focus-visible:ring-4 peer-focus-visible:ring-leaf/30 ${
                metrics.isBelowCost ? "border-red-600" : "border-leaf"
              }`}
              style={{ left: `${fillPercent}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => handleStep(1)}
            disabled={mrp ? chosenPrice >= mrp : false}
            aria-label="Increase price by ₹1"
            className="w-11 h-11 rounded-xl border border-border bg-page hover:bg-leaf-light hover:text-leaf flex items-center justify-center font-bold text-ink transition-colors disabled:opacity-40 min-h-[44px] shrink-0"
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Type exact price input */}
      <div className="flex items-center gap-3">
        <label htmlFor={inputId} className="text-xs font-semibold text-muted shrink-0">
          Or type price:
        </label>
        <div className="relative max-w-[140px]">
          <span className="absolute left-3 top-2.5 text-xs text-muted font-mono">₹</span>
          <input
            id={inputId}
            type="number"
            min={1}
            max={mrp ?? undefined}
            value={chosenPrice}
            onChange={(e) => handlePriceChange(Number(e.target.value))}
            className="w-full h-10 pl-7 pr-3 rounded-lg border border-border bg-page text-sm font-mono font-bold text-ink focus:outline-none focus:ring-2 focus:ring-leaf min-h-[40px]"
          />
        </div>
      </div>

      {/* Errors or Success */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
          {error}
        </p>
      )}

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-leaf-light border border-[#D5E3DA] text-xs text-leaf font-bold flex items-center gap-2">
          <CheckCircle size={16} weight="bold" />
          <span>Price updated to ₹{chosenPrice}/{unitSymbol}.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          type="button"
          variant="default"
          onClick={handleSave}
          disabled={isPending || chosenPrice <= 0}
          className="flex-1 h-12 text-sm font-bold min-h-[48px] shadow-xs"
        >
          {isPending ? "Saving..." : `Save price: ₹${chosenPrice}/${unitSymbol}`}
        </Button>

        {currentPrice && currentPrice !== chosenPrice && (
          <Button
            type="button"
            variant="outline"
            onClick={handleKeepCurrent}
            disabled={isPending}
            className="h-12 text-xs font-semibold min-h-[48px]"
          >
            Keep current price (₹{currentPrice})
          </Button>
        )}
      </div>
    </div>
  );
}

