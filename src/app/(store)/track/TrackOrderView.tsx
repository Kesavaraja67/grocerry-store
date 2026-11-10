"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MagnifyingGlass,
  ClockCounterClockwise,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  Storefront,
  WhatsappLogo,
  Phone,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatINR, formatDate } from "@/lib/format";
import { getPublicOrderTracking } from "@/server/public/orders";

interface TrackingData {
  orderNumber: string;
  status: string;
  placedAt: string;
  customerName: string;
  fulfilment: string;
  addressLine: string | null;
  area: string | null;
  pincode: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  rejectedReason: string | null;
  cancelReason: string | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitLabel: string;
    unitPrice: number;
    lineTotal: number;
  }>;
  events: Array<{
    status: string;
    note: string | null;
    createdAt: string;
  }>;
}

const ORDER_STEPS = ["PLACED", "ACCEPTED", "PROCESSING", "READY", "COMPLETED"];

export function TrackOrderView() {
  const searchParams = useSearchParams();

  const [orderNumber, setOrderNumber] = useState(searchParams.get("orderNumber") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically search if query params are present
  useEffect(() => {
    const o = searchParams.get("orderNumber");
    const p = searchParams.get("phone");
    if (o && p) {
      handleLookup(o, p);
    }
  }, [searchParams]);

  const handleLookup = async (orderNo = orderNumber, ph = phone) => {
    if (!orderNo.trim() || !ph.trim()) {
      setError("Please enter both your Order Number (e.g. PS-1001) and Mobile Number.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setHasSearched(true);
      const res = await getPublicOrderTracking(orderNo.trim(), ph.trim());
      if (!res) {
        setTrackingData(null);
        setError("No order found matching this order number and mobile phone. Please check your details.");
      } else {
        setTrackingData(res);
      }
    } catch {
      setError("Unable to retrieve order details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIndex = (status: string) => {
    return ORDER_STEPS.indexOf(status);
  };

  const currentStepIndex = trackingData ? getStepIndex(trackingData.status) : -1;
  const isCancelled = trackingData?.status === "CANCELLED" || trackingData?.status === "REJECTED";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-turmeric/20 text-leaf flex items-center justify-center mx-auto">
          <ClockCounterClockwise size={24} weight="bold" />
        </div>
        <h1 className="text-2xl font-bold font-heading text-ink">
          Track Your Grocery Order
        </h1>
        <p className="text-xs text-ink-muted">
          Enter your order number and mobile number to see real-time preparation & delivery status.
        </p>
      </div>

      {/* Lookup Card */}
      <Card className="p-5 bg-surface border-border shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Order Number</label>
              <Input
                placeholder="e.g. PS-1001"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                required
                className="h-11 font-mono uppercase font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Mobile Number</label>
              <Input
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="h-11 font-mono font-semibold"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="turmeric"
            disabled={isLoading}
            className="w-full h-11 font-bold text-xs gap-2 shadow-xs"
          >
            <MagnifyingGlass size={16} weight="bold" />
            <span>{isLoading ? "Searching order..." : "Track Status"}</span>
          </Button>
        </form>
      </Card>

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-red/40 bg-red/5 p-4 flex items-start gap-3 text-sm text-red">
          <WarningCircle size={20} weight="bold" className="shrink-0 mt-0.5" />
          <div className="text-xs">{error}</div>
        </div>
      )}

      {/* Tracking Result View */}
      {trackingData && (
        <div className="space-y-6 pt-2">
          {/* Status Stepper Card */}
          <Card className="p-6 bg-surface border-border shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border pb-4">
              <div>
                <span className="text-xs text-ink-muted">Order Status for</span>
                <div className="text-xl font-bold font-mono text-leaf">
                  {trackingData.orderNumber}
                </div>
              </div>

              <div className="text-xs text-ink-muted text-right">
                <div>Placed on {trackingData.placedAt.split("T")[0]}</div>
                <div className="font-semibold text-ink capitalize">
                  {trackingData.fulfilment === "DELIVERY" ? "Home Delivery" : "Store Pickup"}
                </div>
              </div>
            </div>

            {/* Stepper Progress */}
            {isCancelled ? (
              <div className="rounded-xl border border-red/30 bg-red/5 p-4 space-y-1 text-sm text-red">
                <div className="font-bold flex items-center gap-2">
                  <XCircle size={18} weight="bold" />
                  Order {trackingData.status === "CANCELLED" ? "Cancelled" : "Declined"}
                </div>
                <p className="text-xs text-ink-muted">
                  Reason: {trackingData.cancelReason || trackingData.rejectedReason || "Store was unable to fulfill this order."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative flex items-center justify-between">
                  {/* Stepper connecting line */}
                  <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-page z-0" />
                  <div
                    className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-leaf z-0 transition-all duration-500"
                    style={{
                      width: `${Math.max(0, (currentStepIndex / (ORDER_STEPS.length - 1)) * 100)}%`,
                    }}
                  />

                  {ORDER_STEPS.map((step, idx) => {
                    const isDone = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;

                    return (
                      <div key={step} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isCurrent
                              ? "bg-leaf text-white ring-4 ring-leaf/20"
                              : isDone
                              ? "bg-leaf text-white"
                              : "bg-surface border-2 border-border text-ink-muted"
                          }`}
                        >
                          {isDone ? <CheckCircle size={16} weight="bold" /> : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] sm:text-xs mt-1.5 font-semibold text-center whitespace-nowrap ${
                            isCurrent ? "text-leaf font-bold" : isDone ? "text-ink" : "text-ink-muted"
                          }`}
                        >
                          {step === "PLACED"
                            ? "Placed"
                            : step === "ACCEPTED"
                            ? "Accepted"
                            : step === "PROCESSING"
                            ? "Packing"
                            : step === "READY"
                            ? trackingData.fulfilment === "DELIVERY"
                              ? "Out for Delivery"
                              : "Ready for Pickup"
                            : "Delivered"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Events Log / Timeline */}
          {trackingData.events.length > 0 && (
            <Card className="p-5 bg-surface border-border shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                Status Updates Timeline
              </h3>
              <div className="space-y-3 divide-y divide-border/60 text-xs">
                {trackingData.events.map((evt, idx) => (
                  <div key={idx} className="pt-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-ink">
                        {evt.status.replace("_", " ")}
                      </div>
                      {evt.note && <div className="text-ink-muted mt-0.5">{evt.note}</div>}
                    </div>
                    <span className="text-[11px] font-mono text-ink-muted shrink-0">
                      {evt.createdAt.split("T")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Items Summary Card */}
          <Card className="p-5 bg-surface border-border shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink border-b border-border pb-2">
              Items Ordered ({trackingData.items.length})
            </h3>
            <div className="divide-y divide-border/60 text-xs">
              {trackingData.items.map((i) => (
                <div key={i.id} className="py-2 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-ink">{i.productName}</span>
                    <span className="text-[11px] text-ink-muted block">
                      {i.quantity} {i.unitLabel} × {formatINR(i.unitPrice)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-ink">
                    {formatINR(i.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border flex justify-between items-center text-sm font-bold text-ink">
              <span>Total:</span>
              <span className="font-mono text-lg text-leaf">{formatINR(trackingData.total)}</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

