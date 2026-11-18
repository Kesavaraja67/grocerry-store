"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardText,
  WhatsappLogo,
  CheckCircle,
  XCircle,
  Truck,
  Storefront,
  CaretRight,
  WarningCircle,
  Clock,
  Phone,
  Package,
} from "@phosphor-icons/react";
import {
  acceptOrder,
  updateOrderStatus,
  cancelOrRejectOrder,
  AdminOrdersResult,
} from "@/server/admin/orders";
import { OrderStatus, FulfilmentType, CUSTOMER_STATUS_LABELS } from "@/server/domain/orders";
import { copy } from "@/lib/copy";
import { useLang } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface OrdersManagerProps {
  initialData: AdminOrdersResult;
  currentStatus: string;
  currentQuery: string;
  currentFulfilment: string;
}

type TabType = "NEW" | "IN_PROGRESS" | "DONE";

export function OrdersManager({
  initialData,
  currentStatus,
  currentQuery,
  currentFulfilment,
}: OrdersManagerProps) {
  const router = useRouter();
  const { mode } = useLang();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<TabType>("NEW");
  const [actionError, setActionError] = useState<string | null>(null);

  // Reject / Cancel dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogOrder, setDialogOrder] = useState<{
    id: string;
    orderNumber: string;
    action: "REJECT" | "CANCEL";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);

  const orders = initialData.orders;

  // Tab grouping
  const groupedOrders = useMemo(() => {
    const newOrders = orders.filter((o) => o.status === "PLACED");
    const inProgressOrders = orders.filter((o) =>
      ["ACCEPTED", "PROCESSING", "READY"].includes(o.status)
    );
    const doneOrders = orders.filter((o) =>
      ["COMPLETED", "REJECTED", "CANCELLED"].includes(o.status)
    );

    return {
      NEW: newOrders,
      IN_PROGRESS: inProgressOrders,
      DONE: doneOrders,
    };
  }, [orders]);

  const counts = {
    NEW: groupedOrders.NEW.length,
    IN_PROGRESS: groupedOrders.IN_PROGRESS.length,
    DONE: groupedOrders.DONE.length,
  };

  const activeList = groupedOrders[activeTab];

  // Actions
  const handleAccept = (orderId: string) => {
    setActionError(null);
    startTransition(async () => {
      try {
        const res = await acceptOrder(orderId);
        if (!res.success) {
          setActionError(res.error || "Failed to confirm order.");
        } else {
          router.refresh();
        }
      } catch (e: unknown) {
        setActionError(e instanceof Error ? e.message : "Failed to confirm order.");
      }
    });
  };

  const handleMarkReady = (orderId: string) => {
    setActionError(null);
    startTransition(async () => {
      try {
        const res = await updateOrderStatus(orderId, "READY");
        if (!res.success) {
          setActionError(res.error || "Failed to update order.");
        } else {
          router.refresh();
        }
      } catch (e: unknown) {
        setActionError(e instanceof Error ? e.message : "Failed to update order.");
      }
    });
  };

  const handleComplete = (orderId: string) => {
    setActionError(null);
    startTransition(async () => {
      try {
        const res = await updateOrderStatus(orderId, "COMPLETED");
        if (!res.success) {
          setActionError(res.error || "Failed to complete order.");
        } else {
          router.refresh();
        }
      } catch (e: unknown) {
        setActionError(e instanceof Error ? e.message : "Failed to complete order.");
      }
    });
  };

  const handleOpenDialog = (orderId: string, orderNumber: string, action: "REJECT" | "CANCEL") => {
    setDialogOrder({ id: orderId, orderNumber, action });
    setReason("");
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleConfirmDialog = () => {
    if (!dialogOrder) return;
    if (!reason.trim()) {
      setDialogError(copy.errors.reasonRequired);
      return;
    }

    setDialogError(null);
    startTransition(async () => {
      try {
        const res = await cancelOrRejectOrder(
          dialogOrder.id,
          dialogOrder.action,
          reason.trim()
        );
        if (!res.success) {
          setDialogError(res.error || "Failed to update order.");
        } else {
          setDialogOpen(false);
          router.refresh();
        }
      } catch (e: unknown) {
        setDialogError(e instanceof Error ? e.message : "Failed to update order.");
      }
    });
  };

  const handleWhatsApp = (phone: string, orderNumber: string, customerName: string) => {
    const clean = phone.replace(/\D/g, "");
    const full = clean.length === 10 ? `91${clean}` : clean;
    const text = encodeURIComponent(
      `வணக்கம் ${customerName}, உங்கள் பாண்டியன் ஸ்டோர் ஆர்டர் (${orderNumber}) பற்றிய தகவல்:`
    );
    window.open(`https://wa.me/${full}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-12">
      {/* 3 Tabs: New · In progress · Done */}
      <div className="grid grid-cols-3 gap-2 bg-surface p-1.5 rounded-2xl border border-border shadow-xs">
        {(
          [
            { id: "NEW", labelEn: copy.admin.orders.tabNew.en, labelTa: copy.admin.orders.tabNew.ta, count: counts.NEW },
            { id: "IN_PROGRESS", labelEn: copy.admin.orders.tabInProgress.en, labelTa: copy.admin.orders.tabInProgress.ta, count: counts.IN_PROGRESS },
            { id: "DONE", labelEn: copy.admin.orders.tabDone.en, labelTa: copy.admin.orders.tabDone.ta, count: counts.DONE },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-bold transition-all min-h-[48px] ${
                isActive
                  ? "bg-leaf text-white shadow-xs"
                  : "text-ink hover:bg-page"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{mode === "ta" ? tab.labelTa : tab.labelEn}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? "bg-white/20 text-white" : "bg-turmeric text-ink"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </div>
              {mode === "both" && (
                <span className={`text-[10px] font-tamil font-normal leading-tight ${isActive ? "text-white/80" : "text-muted"}`}>
                  {tab.labelTa}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <WarningCircle size={16} weight="bold" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        {activeList.length === 0 ? (
          <div className="py-12 px-4 text-center bg-surface border border-border rounded-2xl">
            <ClipboardText size={36} weight="light" className="mx-auto text-muted mb-2" />
            <p className="text-sm font-semibold text-ink">
              {activeTab === "NEW"
                ? copy.admin.orders.emptyNew.en
                : activeTab === "IN_PROGRESS"
                ? copy.admin.orders.emptyInProgress.en
                : copy.admin.orders.emptyDone.en}
            </p>
            <p className="text-xs text-muted font-tamil mt-1">
              {activeTab === "NEW"
                ? copy.admin.orders.emptyNew.ta
                : activeTab === "IN_PROGRESS"
                ? copy.admin.orders.emptyInProgress.ta
                : copy.admin.orders.emptyDone.ta}
            </p>
          </div>
        ) : (
          activeList.map((order) => {
            const isDelivery = order.fulfilment === "DELIVERY";
            const statusLabel =
              CUSTOMER_STATUS_LABELS[order.status]?.label || order.status;

            return (
              <div
                key={order.id}
                className="bg-surface border-2 border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 transition-all"
              >
                {/* Header: Customer + Fulfilment + Order Number */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-ink">
                        {order.customerName}
                      </span>
                      <span className="text-xs font-mono text-muted">
                        #{order.orderNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="font-mono text-ink font-semibold hover:underline flex items-center gap-1"
                      >
                        <Phone size={12} />
                        <span>{order.customerPhone}</span>
                      </a>
                      <span>·</span>
                      <span>
                        {new Date(order.placedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {isDelivery && order.addressLine && (
                      <p className="text-xs text-muted mt-1">
                        📍 {order.addressLine}{order.area ? `, ${order.area}` : ""}
                      </p>
                    )}
                  </div>

                  {/* Fulfilment Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                      isDelivery
                        ? "bg-amber-50 text-amber-900 border border-amber-200"
                        : "bg-leaf-light text-leaf border border-[#D5E3DA]"
                    }`}
                  >
                    {isDelivery ? <Truck size={14} /> : <Storefront size={14} />}
                    <span>{isDelivery ? "Delivery" : "Store pickup"}</span>
                  </span>
                </div>

                {/* Items & Total */}
                <div className="bg-page p-3 rounded-xl border border-border space-y-1 text-xs">
                  <p className="text-ink font-medium leading-relaxed">
                    {order.itemsSummary}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-border/60">
                    <span className="text-muted text-[11px]">
                      {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    </span>
                    <span className="font-mono font-extrabold text-base text-ink">
                      ₹{order.total.toString()}
                    </span>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between text-xs text-muted pt-0.5">
                  <span className="font-semibold text-ink">
                    Status: <span className="text-leaf">{statusLabel}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleWhatsApp(order.customerPhone, order.orderNumber, order.customerName)}
                    className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline min-h-[36px]"
                  >
                    <WhatsappLogo size={16} weight="fill" className="text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                {/* Primary Action Button */}
                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  {order.status === "PLACED" && (
                    <>
                      <Button
                        type="button"
                        variant="default"
                        disabled={isPending}
                        onClick={() => handleAccept(order.id)}
                        className="flex-1 h-12 text-sm font-bold shadow-xs min-h-[48px]"
                      >
                        {isPending ? "Confirming..." : "Confirm order"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleOpenDialog(order.id, order.orderNumber, "REJECT")}
                        className="h-12 text-xs font-semibold text-red hover:bg-red-50 hover:text-red-700 min-h-[48px]"
                      >
                        Can&apos;t accept
                      </Button>
                    </>
                  )}

                  {["ACCEPTED", "PROCESSING"].includes(order.status) && (
                    <>
                      <Button
                        type="button"
                        variant="turmeric"
                        disabled={isPending}
                        onClick={() => handleMarkReady(order.id)}
                        className="flex-1 h-12 text-sm font-bold shadow-xs min-h-[48px]"
                      >
                        {isPending ? "Updating..." : "Mark packed and ready"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleOpenDialog(order.id, order.orderNumber, "CANCEL")}
                        className="h-12 text-xs font-semibold text-muted hover:text-red min-h-[48px]"
                      >
                        Cancel
                      </Button>
                    </>
                  )}

                  {order.status === "READY" && (
                    <>
                      <Button
                        type="button"
                        variant="default"
                        disabled={isPending}
                        onClick={() => handleComplete(order.id)}
                        className="flex-1 h-12 text-sm font-bold shadow-xs min-h-[48px]"
                      >
                        {isPending
                          ? "Completing..."
                          : isDelivery
                          ? "Delivered to customer"
                          : "Handed over to customer"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleOpenDialog(order.id, order.orderNumber, "CANCEL")}
                        className="h-12 text-xs font-semibold text-muted hover:text-red min-h-[48px]"
                      >
                        Cancel
                      </Button>
                    </>
                  )}

                  {["COMPLETED", "REJECTED", "CANCELLED"].includes(order.status) && (
                    <div className="w-full text-center py-1">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          order.status === "COMPLETED"
                            ? "bg-leaf-light text-leaf"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject / Cancel Reason Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogOrder?.action === "REJECT" ? "Can't accept order" : "Cancel order"} #
              {dialogOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {dialogError && (
              <p className="p-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
                {dialogError}
              </p>
            )}

            <p className="text-muted">
              {dialogOrder?.action === "REJECT"
                ? "Let the customer know why this order cannot be accepted right now:"
                : "Enter the reason for cancelling this order (reserved stock will be restored):"}
            </p>

            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Out of stock / Customer requested cancellation"
              className="h-11"
              required
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="h-10 text-xs"
              >
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending || !reason.trim()}
                onClick={handleConfirmDialog}
                className="h-10 text-xs font-bold"
              >
                {isPending ? "Confirming..." : dialogOrder?.action === "REJECT" ? "Reject order" : "Cancel order"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
