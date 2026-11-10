"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trash,
  Plus,
  Minus,
  ShoppingCartSimple,
  ArrowRight,
  Truck,
  WarningCircle,
  ArrowLeft,
  Sparkle,
} from "@phosphor-icons/react";
import { formatINR } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { verifyCart, type VerifiedCartSummary } from "@/server/public/cart";

export function CartView() {
  const { items, updateQuantity, removeFromCart, clearCart } = useCart();
  const [verifiedCart, setVerifiedCart] = useState<VerifiedCartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync and verify with server
  useEffect(() => {
    let isCancelled = false;

    async function loadVerification() {
      if (items.length === 0) {
        setVerifiedCart(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const res = await verifyCart(items);
        if (!isCancelled) {
          setVerifiedCart(res);
        }
      } catch {
        // Fallback on network error
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadVerification();

    return () => {
      isCancelled = true;
    };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-turmeric/20 text-leaf flex items-center justify-center mx-auto mb-2">
          <ShoppingCartSimple size={36} weight="duotone" />
        </div>
        <h1 className="text-2xl font-bold font-heading text-ink">
          Your shopping cart is empty
        </h1>
        <p className="text-sm text-ink-muted max-w-md mx-auto">
          You haven&apos;t added any grocery items yet. Explore our fresh dal, rice, oils, and spices!
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-turmeric hover:bg-turmeric-hover text-ink font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-xs"
          >
            <span>Start Shopping</span>
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>
    );
  }

  const freeDeliveryThreshold = verifiedCart?.freeDeliveryThreshold ?? 500;
  const currentSubtotal = verifiedCart?.subtotal ?? 0;
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - currentSubtotal);
  const freeDeliveryProgress = Math.min(100, Math.round((currentSubtotal / freeDeliveryThreshold) * 100));

  const isBelowMinOrder =
    verifiedCart && currentSubtotal > 0 && currentSubtotal < verifiedCart.minOrderAmount;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border pb-4">
        <div>
          <Link href="/" className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 mb-1">
            <ArrowLeft size={13} /> Continue shopping
          </Link>
          <h1 className="text-2xl font-bold font-heading text-ink">
            Shopping Cart ({items.length} {items.length === 1 ? "item" : "items"})
          </h1>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="text-xs text-ink-muted hover:text-red transition-colors flex items-center gap-1"
        >
          <Trash size={14} /> Clear all items
        </button>
      </div>

      {/* Free Delivery Progress Bar */}
      <div className="rounded-xl border border-turmeric/40 bg-turmeric/10 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-ink">
          <span className="flex items-center gap-1.5">
            <Truck size={18} weight="bold" className="text-leaf" />
            {amountToFreeDelivery > 0 ? (
              <span>
                Add <strong className="text-leaf">{formatINR(amountToFreeDelivery)}</strong> more for <strong>FREE Home Delivery</strong>!
              </span>
            ) : (
              <span className="text-leaf font-bold">
                🎉 Congratulations! You have unlocked FREE Home Delivery!
              </span>
            )}
          </span>
          <span className="font-mono text-ink-muted">{freeDeliveryProgress}%</span>
        </div>
        <div className="h-2 w-full bg-turmeric/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-leaf rounded-full transition-all duration-300"
            style={{ width: `${freeDeliveryProgress}%` }}
          />
        </div>
      </div>

      {/* Cart Grid: Items List + Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cart Item Rows */}
        <div className="lg:col-span-2 space-y-3">
          {verifiedCart?.items.map((item) => (
            <div
              key={item.productId}
              className={`rounded-xl border p-4 bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                item.error ? "border-red/40 bg-red/5" : "border-border shadow-xs"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Link
                  href={`/p/${item.slug}`}
                  className="w-16 h-16 rounded-lg bg-page overflow-hidden shrink-0 border border-border"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-ink-muted text-xl font-heading">
                      {item.name.slice(0, 1)}
                    </div>
                  )}
                </Link>

                <div className="min-w-0">
                  <Link
                    href={`/p/${item.slug}`}
                    className="font-bold text-sm text-ink hover:text-leaf transition-colors line-clamp-1"
                  >
                    {item.name}
                  </Link>
                  {item.nameTamil && (
                    <div className="text-xs text-ink-muted font-tamil line-clamp-1">
                      {item.nameTamil}
                    </div>
                  )}
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {formatINR(item.unitPrice)} / {item.baseUnitSymbol}
                    {item.sizeLabel && ` (${item.sizeLabel})`}
                  </div>

                  {item.error && (
                    <div className="text-xs text-red font-semibold mt-1">
                      {item.error}
                    </div>
                  )}
                </div>
              </div>

              {/* Stepper + Total + Remove */}
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-border/60">
                {/* Stepper */}
                <div className="flex items-center rounded-lg border border-border bg-page overflow-hidden h-9">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.round((item.quantity - item.sellStep) * 1000) / 1000;
                      if (next < item.minQty) removeFromCart(item.productId);
                      else updateQuantity(item.productId, next);
                    }}
                    className="px-2.5 h-full hover:bg-surface text-ink transition-colors flex items-center justify-center"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={13} weight="bold" />
                  </button>
                  <span className="px-3 text-xs font-bold font-mono text-ink text-center min-w-[36px]">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(
                        item.maxQty,
                        Math.round((item.quantity + item.sellStep) * 1000) / 1000
                      );
                      updateQuantity(item.productId, next);
                    }}
                    disabled={item.quantity >= item.maxQty}
                    className="px-2.5 h-full hover:bg-surface text-ink transition-colors flex items-center justify-center disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus size={13} weight="bold" />
                  </button>
                </div>

                {/* Line amount */}
                <div className="text-right min-w-[80px]">
                  <div className="font-bold font-mono text-base text-ink">
                    {formatINR(item.lineAmount)}
                  </div>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  className="p-1.5 text-ink-muted hover:text-red transition-colors"
                  title="Remove item"
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Col: Order Summary Card */}
        <div>
          <div className="sticky top-20 rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
            <h2 className="text-base font-bold font-heading text-ink">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center text-ink-muted">
                <span>Items Subtotal:</span>
                <span className="font-mono font-semibold text-ink">
                  {formatINR(currentSubtotal)}
                </span>
              </div>

              <div className="flex justify-between items-center text-ink-muted">
                <span>Home Delivery:</span>
                <span className="font-mono font-semibold">
                  {verifiedCart?.deliveryFee === 0 ? (
                    <span className="text-leaf font-bold">FREE</span>
                  ) : (
                    formatINR(verifiedCart?.deliveryFee ?? 0)
                  )}
                </span>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center text-lg font-bold text-ink">
                <span>Total Amount:</span>
                <span className="font-mono text-2xl text-leaf font-extrabold">
                  {formatINR(verifiedCart?.total ?? 0)}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted">
                All prices are tax-inclusive. Cash on delivery or UPI accepted upon delivery.
              </p>
            </div>

            {/* Warnings */}
            {verifiedCart && !verifiedCart.isAcceptingOrders && (
              <div className="rounded-lg border border-turmeric/40 bg-turmeric/10 p-3 text-xs text-ink flex items-start gap-2">
                <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5 text-turmeric-dark" />
                <span>
                  The shop is currently paused and not taking new orders at this hour.
                </span>
              </div>
            )}

            {isBelowMinOrder && (
              <div className="rounded-lg border border-red/40 bg-red/5 p-3 text-xs text-red flex items-start gap-2">
                <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
                <span>
                  Minimum order amount is {formatINR(verifiedCart.minOrderAmount)}. Please add{" "}
                  {formatINR(verifiedCart.minOrderAmount - currentSubtotal)} more to checkout.
                </span>
              </div>
            )}

            {/* Checkout Button */}
            <Link
              href={isBelowMinOrder || !verifiedCart?.isAcceptingOrders ? "#" : "/checkout"}
              className={isBelowMinOrder || !verifiedCart?.isAcceptingOrders ? "pointer-events-none" : ""}
            >
              <button
                type="button"
                disabled={isBelowMinOrder || !verifiedCart?.isAcceptingOrders || isLoading}
                className="w-full h-12 rounded-xl bg-turmeric hover:bg-turmeric-hover text-ink font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} weight="bold" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

