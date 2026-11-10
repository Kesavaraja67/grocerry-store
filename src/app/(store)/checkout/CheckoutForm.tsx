"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  Storefront,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  Phone,
  WhatsappLogo,
  ArrowRight,
  ArrowLeft,
  Lock,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { verifyCart, type VerifiedCartSummary } from "@/server/public/cart";
import { createCustomerOrder } from "@/server/public/orders";

export function CheckoutForm() {
  const router = useRouter();
  const { items, clearCart } = useCart();

  const [verifiedCart, setVerifiedCart] = useState<VerifiedCartSummary | null>(null);
  const [isLoadingCart, setIsLoadingCart] = useState(true);

  // Form inputs
  const [fulfilment, setFulfilment] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [whatsapp, setWhatsapp] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("625001");
  const [customerNotes, setCustomerNotes] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Bot trap

  // Unique idempotency key per checkout session
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  // Verify cart on mount
  useEffect(() => {
    async function verify() {
      if (items.length === 0) {
        setIsLoadingCart(false);
        return;
      }
      try {
        const data = await verifyCart(items);
        setVerifiedCart(data);
      } catch {
        // Fallback
      } finally {
        setIsLoadingCart(false);
      }
    }
    verify();
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate phone number
    const cleanPhone = customerPhone.trim().replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number (e.g. 9842100000).");
      return;
    }

    if (fulfilment === "DELIVERY") {
      if (!addressLine.trim() || !area.trim()) {
        setErrorMessage("Please enter your complete delivery address and area.");
        return;
      }
      if (!/^\d{6}$/.test(pincode.trim())) {
        setErrorMessage("Please enter a valid 6-digit postal pincode.");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const res = await createCustomerOrder({
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        whatsapp: sameAsPhone ? cleanPhone : whatsapp.trim() || undefined,
        fulfilment,
        addressLine: fulfilment === "DELIVERY" ? addressLine.trim() : undefined,
        area: fulfilment === "DELIVERY" ? area.trim() : undefined,
        landmark: fulfilment === "DELIVERY" && landmark.trim() ? landmark.trim() : undefined,
        pincode: fulfilment === "DELIVERY" ? pincode.trim() : undefined,
        customerNotes: customerNotes.trim() || undefined,
        idempotencyKey,
        website: honeypot, // Honeypot trap
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });

      // Clear customer cart upon order placement
      clearCart();

      // Redirect to confirmation screen
      router.push(`/order-success/${res.orderNumber}`);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to place order. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoadingCart && items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold font-heading text-ink">
          Your cart is empty
        </h1>
        <p className="text-xs text-ink-muted">
          Add items to your cart before proceeding to checkout.
        </p>
        <Link href="/">
          <Button variant="turmeric" className="gap-2 font-bold text-xs mt-2">
            Browse Groceries
          </Button>
        </Link>
      </div>
    );
  }

  const subtotal = verifiedCart?.subtotal ?? 0;
  const deliveryFee = fulfilment === "DELIVERY" ? verifiedCart?.deliveryFee ?? 0 : 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <Link href="/cart" className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 mb-1">
          <ArrowLeft size={13} /> Back to cart
        </Link>
        <h1 className="text-2xl font-bold font-heading text-ink">
          Checkout & Order Details
        </h1>
        <p className="text-xs text-ink-muted">
          Fast guest checkout. No password needed. Pay cash or UPI upon delivery / pickup.
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="rounded-xl border border-red/40 bg-red/5 p-4 flex items-start gap-3 text-sm text-red">
          <WarningCircle size={20} weight="bold" className="shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Unable to place order</div>
            <div className="text-xs mt-0.5">{errorMessage}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer & Fulfilment Inputs */}
        <div className="md:col-span-2 space-y-6">
          {/* 1. Fulfilment Mode Selector */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
              1. Choose Delivery or Pickup
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfilment("DELIVERY")}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  fulfilment === "DELIVERY"
                    ? "border-leaf bg-leaf/5 shadow-2xs"
                    : "border-border hover:bg-page"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-leaf/10 text-leaf flex items-center justify-center">
                    <Truck size={18} weight="bold" />
                  </div>
                  {fulfilment === "DELIVERY" && (
                    <CheckCircle size={18} weight="fill" className="text-leaf" />
                  )}
                </div>
                <div className="mt-2">
                  <div className="font-bold text-sm text-ink">Home Delivery</div>
                  <div className="text-[11px] text-ink-muted">Delivered directly to your doorstep</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFulfilment("PICKUP")}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  fulfilment === "PICKUP"
                    ? "border-leaf bg-leaf/5 shadow-2xs"
                    : "border-border hover:bg-page"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-turmeric/20 text-ink flex items-center justify-center">
                    <Storefront size={18} weight="bold" />
                  </div>
                  {fulfilment === "PICKUP" && (
                    <CheckCircle size={18} weight="fill" className="text-leaf" />
                  )}
                </div>
                <div className="mt-2">
                  <div className="font-bold text-sm text-ink">Store Pickup</div>
                  <div className="text-[11px] text-ink-muted">West Masi St (Ready in 30 mins)</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Customer Contact Info */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
              2. Your Contact Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-ink">
                  Full Name <span className="text-red">*</span>
                </label>
                <Input
                  placeholder="e.g. Meenakshi Sundaram"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Mobile Number (10 digits) <span className="text-red">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">
                    +91
                  </span>
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="9842100000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="h-11 pl-12 font-mono font-semibold"
                  />
                </div>
                <p className="text-[10px] text-ink-muted">
                  We will call or WhatsApp this number to confirm delivery.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-ink">WhatsApp Number</label>
                  <label className="text-[11px] text-ink-muted flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsPhone}
                      onChange={(e) => setSameAsPhone(e.target.checked)}
                      className="rounded text-leaf focus:ring-leaf"
                    />
                    <span>Same as mobile</span>
                  </label>
                </div>
                {!sameAsPhone ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">
                      +91
                    </span>
                    <Input
                      type="tel"
                      maxLength={10}
                      placeholder="9842100000"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="h-11 pl-12 font-mono"
                    />
                  </div>
                ) : (
                  <Input
                    disabled
                    value={customerPhone ? `+91 ${customerPhone}` : "Same as phone"}
                    className="h-11 bg-page text-ink-muted text-xs font-mono"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 3. Address fields (only if Home Delivery selected) */}
          {fulfilment === "DELIVERY" && (
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                3. Delivery Address
              </h2>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">
                    House / Flat No., Building & Street <span className="text-red">*</span>
                  </label>
                  <Input
                    placeholder="e.g. 12/4, Kamarajar Salai, Opp. Bus Stop"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    required={fulfilment === "DELIVERY"}
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-1">
                    <label className="text-xs font-semibold text-ink">
                      Area / Locality <span className="text-red">*</span>
                    </label>
                    <Input
                      placeholder="e.g. KK Nagar"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      required={fulfilment === "DELIVERY"}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <label className="text-xs font-semibold text-ink">
                      Landmark (Optional)
                    </label>
                    <Input
                      placeholder="e.g. Near Pillayar Temple"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <label className="text-xs font-semibold text-ink">
                      Pincode <span className="text-red">*</span>
                    </label>
                    <Input
                      placeholder="625001"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      required={fulfilment === "DELIVERY"}
                      className="h-11 font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Notes */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-2 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-ink">
              Special Instructions / Notes (Optional)
            </label>
            <Input
              placeholder={
                fulfilment === "DELIVERY"
                  ? "e.g. Call before coming, leave at gate"
                  : "e.g. Will pick up around 6:00 PM this evening"
              }
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="h-11 text-xs"
            />
          </div>

          {/* Anti-spam honeypot (hidden from humans) */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Right Col: Order Summary & Place Order */}
        <div>
          <div className="sticky top-20 rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
            <h2 className="text-base font-bold font-heading text-ink">
              Your Order Request
            </h2>

            {/* Quick items list */}
            <div className="max-h-48 overflow-y-auto divide-y divide-border/60 text-xs text-ink-muted">
              {verifiedCart?.items.map((i) => (
                <div key={i.productId} className="py-2 flex justify-between items-center">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-ink">{i.name}</span>
                    <span className="text-[11px] block">
                      {i.quantity} {i.baseUnitSymbol} × {formatINR(i.unitPrice)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-ink shrink-0">
                    {formatINR(i.lineAmount)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between items-center text-ink-muted">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-ink">
                  {formatINR(subtotal)}
                </span>
              </div>

              <div className="flex justify-between items-center text-ink-muted">
                <span>Delivery:</span>
                <span className="font-mono font-semibold">
                  {deliveryFee === 0 ? (
                    <span className="text-leaf font-bold">FREE</span>
                  ) : (
                    formatINR(deliveryFee)
                  )}
                </span>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center text-lg font-bold text-ink">
                <span>Total Payable:</span>
                <span className="font-mono text-2xl text-leaf font-extrabold">
                  {formatINR(total)}
                </span>
              </div>
            </div>

            {/* Payment instructions notice */}
            <div className="rounded-xl border border-border bg-page/70 p-3.5 space-y-1.5 text-xs text-ink-muted">
              <div className="flex items-center gap-1.5 font-bold text-ink">
                <ShieldCheck size={16} className="text-leaf" />
                <span>Pay on Delivery / Pickup</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                No advance online payment required. Pay by <strong>Cash</strong> or scan our <strong>GPay / PhonePe / Paytm / UPI QR code</strong> when your order arrives.
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoadingCart}
              className="w-full h-12 rounded-xl bg-turmeric hover:bg-turmeric-hover text-ink font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-98"
            >
              <Lock size={16} weight="bold" />
              <span>
                {isSubmitting ? "Placing Order Request..." : `Submit Order Request (${formatINR(total)})`}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

