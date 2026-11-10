"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Minus,
  ShoppingCartSimple,
  CheckCircle,
  XCircle,
  Truck,
  ShieldCheck,
  ShareNetwork,
} from "@phosphor-icons/react";
import { formatINR } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { ProductCard } from "@/components/store/ProductCard";
import { type PublicProductDetail } from "@/server/public/products";

interface Props {
  product: PublicProductDetail;
}

export function ProductDetailClient({ product }: Props) {
  const { getItemQuantity, updateQuantity } = useCart();
  const cartQty = getItemQuantity(product.id);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedQty, setSelectedQty] = useState(
    cartQty > 0 ? cartQty : product.minQty
  );

  const handleAddToCart = () => {
    updateQuantity(product.id, selectedQty);
  };

  const handleQuickPick = (val: number) => {
    setSelectedQty(val);
    if (cartQty > 0) {
      updateQuantity(product.id, val);
    }
  };

  // Generate sensible quick picks based on unit dimension and sellStep
  const isLoose = product.sellStep < 1;
  const quickPicks = isLoose
    ? [0.25, 0.5, 1, 2].filter((q) => q >= product.minQty && q <= product.maxQty)
    : [1, 2, 5, 10].filter((q) => q >= product.minQty && q <= product.maxQty);

  const activeImage = product.images[activeImageIndex] || null;

  return (
    <div className="space-y-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-ink-muted flex items-center gap-1.5">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <Link href={`/c/${product.categorySlug}`} className="hover:text-ink">
          {product.categoryName}
        </Link>
        <span>/</span>
        <span className="text-ink font-medium truncate">{product.name}</span>
      </nav>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square w-full rounded-2xl bg-surface border border-border overflow-hidden shadow-2xs">
            {activeImage ? (
              <img
                src={activeImage.url}
                alt={activeImage.alt || product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-page text-ink-muted/40 font-bold text-6xl font-heading">
                {product.name.slice(0, 1)}
              </div>
            )}

            {product.savingsPercent && product.savingsPercent > 0 && (
              <span className="absolute left-3 top-3 rounded-md bg-turmeric px-2.5 py-1 text-xs font-bold text-ink shadow-xs">
                {product.savingsPercent}% OFF
              </span>
            )}
          </div>

          {/* Gallery Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative aspect-square w-16 rounded-lg overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx
                      ? "border-leaf shadow-xs"
                      : "border-border opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt={img.alt || product.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details & Add to Cart */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            {/* Category & Brand badge */}
            <div className="flex items-center gap-2">
              <Link
                href={`/c/${product.categorySlug}`}
                className="text-xs font-semibold text-leaf hover:underline bg-leaf/10 px-2 py-0.5 rounded"
              >
                {product.categoryName}
              </Link>
              {product.brand && (
                <span className="text-xs text-ink-muted uppercase font-semibold tracking-wider">
                  {product.brand}
                </span>
              )}
            </div>

            {/* Title & Tamil name */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-heading leading-tight">
                {product.name}
              </h1>
              {product.nameTamil && (
                <div className="text-lg text-ink-muted font-tamil mt-0.5">
                  {product.nameTamil}
                </div>
              )}
            </div>

            {/* Size Label */}
            <div className="text-sm text-ink-muted">
              Unit: <strong className="text-ink">{product.sizeLabel || `1 ${product.baseUnitSymbol}`}</strong>
            </div>

            {/* Price block */}
            <div className="p-4 rounded-xl bg-page/70 border border-border space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold font-mono text-ink">
                  {formatINR(product.sellingPrice)}
                </span>
                <span className="text-xs text-ink-muted">
                  / {product.baseUnitSymbol}
                </span>

                {product.mrp && product.mrp > product.sellingPrice && (
                  <span className="text-sm text-ink-muted line-through font-mono">
                    MRP: {formatINR(product.mrp)}
                  </span>
                )}
              </div>

              {product.savingsAmount && product.savingsAmount > 0 && (
                <p className="text-xs font-semibold text-leaf">
                  You save {formatINR(product.savingsAmount)} ({product.savingsPercent}%) off MRP!
                </p>
              )}
            </div>

            {/* Stock Status */}
            <div>
              {product.inStock ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-leaf">
                  <CheckCircle size={16} weight="fill" />
                  <span>In Stock — Ready for Home Delivery & Store Pickup</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red">
                  <XCircle size={16} weight="fill" />
                  <span>Currently Out of Stock</span>
                </div>
              )}
            </div>

            {/* Quantity Selector & Quick Picks */}
            {product.inStock && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink">
                    Select Quantity ({product.baseUnitSymbol}):
                  </label>
                  <span className="text-xs text-ink-muted">
                    Total: <strong className="font-mono text-ink">{formatINR(selectedQty * product.sellingPrice)}</strong>
                  </span>
                </div>

                {/* Quick Pick Chips */}
                {quickPicks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {quickPicks.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickPick(val)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors ${
                          selectedQty === val
                            ? "bg-leaf text-white border-leaf"
                            : "bg-surface border-border text-ink hover:bg-page"
                        }`}
                      >
                        {val < 1 && product.baseUnitSymbol === "kg"
                          ? `${val * 1000} g`
                          : `${val} ${product.baseUnitSymbol}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quantity Stepper */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-border bg-surface overflow-hidden h-11">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedQty((prev) =>
                          Math.max(product.minQty, Math.round((prev - product.sellStep) * 1000) / 1000)
                        )
                      }
                      disabled={selectedQty <= product.minQty}
                      className="px-3 h-full hover:bg-page text-ink disabled:opacity-40 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={16} weight="bold" />
                    </button>
                    <span className="px-4 text-sm font-bold font-mono text-ink text-center min-w-[50px]">
                      {selectedQty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedQty((prev) =>
                          Math.min(product.maxQty, Math.round((prev + product.sellStep) * 1000) / 1000)
                        )
                      }
                      disabled={selectedQty >= product.maxQty}
                      className="px-3 h-full hover:bg-page text-ink disabled:opacity-40 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus size={16} weight="bold" />
                    </button>
                  </div>

                  <span className="text-xs text-ink-muted">
                    {product.baseUnitLabel} (Step: {product.sellStep} {product.baseUnitSymbol})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Add to Cart Primary Button */}
          <div className="space-y-4 pt-4 border-t border-border">
            {product.inStock ? (
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full h-12 rounded-xl bg-turmeric hover:bg-turmeric-hover text-ink font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98"
              >
                <ShoppingCartSimple size={20} weight="bold" />
                <span>
                  {cartQty > 0
                    ? `Update Cart (${selectedQty} ${product.baseUnitSymbol} · ${formatINR(
                        selectedQty * product.sellingPrice
                      )})`
                    : `Add to Cart (${formatINR(selectedQty * product.sellingPrice)})`}
                </span>
              </button>
            ) : (
              <button
                disabled
                className="w-full h-12 rounded-xl bg-page text-ink-muted font-bold text-sm cursor-not-allowed border border-border"
              >
                Item Currently Unavailable
              </button>
            )}

            {/* Delivery & Quality Assurances */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-ink-muted">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-leaf shrink-0" />
                <span>Free delivery on orders &gt; ₹500</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-leaf shrink-0" />
                <span>100% Quality guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      {product.description && (
        <div className="p-6 rounded-2xl bg-surface border border-border space-y-2">
          <h2 className="text-base font-bold font-heading text-ink">
            Product Description
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      )}

      {/* Related Products Grid */}
      {product.relatedProducts.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-lg sm:text-xl font-bold font-heading text-ink">
            More from {product.categoryName}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {product.relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Sticky Mobile Add to Cart Bar */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md p-3 border-t border-border flex items-center justify-between gap-3 shadow-lg">
        <div>
          <div className="text-xs text-ink-muted">Total:</div>
          <div className="text-base font-bold font-mono text-ink">
            {formatINR(selectedQty * product.sellingPrice)}
          </div>
        </div>

        {product.inStock ? (
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 h-10 rounded-lg bg-turmeric text-ink font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
          >
            <ShoppingCartSimple size={16} weight="bold" />
            <span>{cartQty > 0 ? "Update Cart" : "Add to Cart"}</span>
          </button>
        ) : (
          <button
            disabled
            className="flex-1 h-10 rounded-lg bg-page text-ink-muted text-xs font-semibold"
          >
            Out of stock
          </button>
        )}
      </div>
    </div>
  );
}

