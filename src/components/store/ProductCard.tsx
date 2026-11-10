"use client";

import Link from "next/link";
import { Plus, Minus, Check } from "@phosphor-icons/react";
import { formatINR } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { type PublicProductSummary } from "@/server/public/products";

interface Props {
  product: PublicProductSummary;
  priority?: boolean;
}

export function ProductCard({ product }: Props) {
  const { getItemQuantity, addToCart, updateQuantity } = useCart();
  const quantity = getItemQuantity(product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product.id, product.sellStep, product.minQty);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newQty = Math.min(product.maxQty, quantity + product.sellStep);
    updateQuantity(product.id, newQty);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newQty = quantity - product.sellStep;
    if (newQty < product.minQty) {
      updateQuantity(product.id, 0);
    } else {
      updateQuantity(product.id, newQty);
    }
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-3 transition-all duration-200 hover:border-leaf/40 hover:shadow-sm">
      {/* Product Image Area */}
      <Link href={`/p/${product.slug}`} className="block relative aspect-square w-full overflow-hidden rounded-lg bg-page mb-2.5">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt || product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-page text-ink-muted/50 font-bold text-2xl font-heading">
            {product.name.slice(0, 1)}
          </div>
        )}

        {/* Savings Badge */}
        {product.savingsPercent && product.savingsPercent > 0 && (
          <span className="absolute left-1.5 top-1.5 rounded bg-turmeric px-1.5 py-0.5 text-[10px] font-bold text-ink shadow-xs">
            {product.savingsPercent}% OFF
          </span>
        )}

        {/* Out of Stock Overlay Badge */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-ink/80 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
              Out of stock
            </span>
          </div>
        )}
      </Link>

      {/* Info Section */}
      <div className="flex-1 flex flex-col justify-between">
        <Link href={`/p/${product.slug}`} className="block space-y-0.5">
          <h3 className="font-semibold text-sm text-ink group-hover:text-leaf transition-colors line-clamp-1">
            {product.name}
          </h3>
          {product.nameTamil && (
            <div className="text-xs text-ink-muted font-tamil line-clamp-1">
              {product.nameTamil}
            </div>
          )}
          <div className="text-[11px] text-ink-muted">
            {product.sizeLabel || `${product.sellStep} ${product.baseUnitSymbol}`}
          </div>
        </Link>

        {/* Price & Add to Cart Container */}
        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
          {/* Price Block */}
          <div>
            <div className="text-base font-bold font-mono text-ink">
              {formatINR(product.sellingPrice)}
            </div>
            {product.mrp && product.mrp > product.sellingPrice && (
              <div className="text-[11px] text-ink-muted line-through font-mono">
                {formatINR(product.mrp)}
              </div>
            )}
          </div>

          {/* Cart Stepper / Add Button */}
          <div>
            {!product.inStock ? (
              <button
                disabled
                className="h-9 px-3 rounded-md bg-page text-ink-muted text-xs font-semibold cursor-not-allowed border border-border"
              >
                Unavailable
              </button>
            ) : quantity === 0 ? (
              <button
                type="button"
                onClick={handleAdd}
                className="h-9 px-4 rounded-md bg-turmeric hover:bg-turmeric-hover text-ink text-xs font-bold transition-colors min-h-[36px] flex items-center gap-1 shadow-xs active:scale-95"
                aria-label={`Add ${product.name} to cart`}
              >
                <Plus size={14} weight="bold" />
                Add
              </button>
            ) : (
              <div className="flex items-center rounded-md border border-turmeric bg-turmeric/10 overflow-hidden h-9">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="h-full px-2 text-ink hover:bg-turmeric/30 transition-colors flex items-center justify-center min-w-[28px]"
                  aria-label="Decrease quantity"
                >
                  <Minus size={13} weight="bold" />
                </button>
                <span className="px-2 text-xs font-bold font-mono text-ink text-center min-w-[28px]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={quantity >= product.maxQty}
                  className="h-full px-2 text-ink hover:bg-turmeric/30 transition-colors flex items-center justify-center min-w-[28px] disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus size={13} weight="bold" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

