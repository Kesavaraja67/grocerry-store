"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  WhatsappLogo,
  Phone,
  CheckCircle,
  XCircle,
  PencilSimple,
  Trash,
  Clock,
  Truck,
  Storefront,
  WarningCircle,
  ShieldCheck,
  User,
  MapPin,
  Note,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  acceptOrder,
  updateOrderStatus,
  cancelOrRejectOrder,
  modifyOrderItemsBeforeAccept,
} from "@/server/admin/orders";
import { OrderStatus, FulfilmentType } from "@/server/domain/orders";
import { formatINR } from "@/server/domain/money";
import { Decimal } from "decimal.js";

interface OrderDetailViewProps {
  order: any;
  whatsAppUrl: string | null;
}

export function OrderDetailView({ order, whatsAppUrl }: OrderDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Reject / Cancel dialog state
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    action: "CANCEL" | "REJECT";
    reason: string;
    error: string | null;
  }>({
    open: false,
    action: "REJECT",
    reason: "",
    error: null,
  });

  // Edit Items dialog state
  const [editItemsOpen, setEditItemsOpen] = useState(false);
  const [modifiedItems, setModifiedItems] = useState<
    Array<{ id: string; name: string; unitLabel: string; quantity: string; unitPrice: number; remove: boolean }>
  >([]);

  useEffect(() => {
    // Check initial privacy mode
    const isMasked = document.documentElement.classList.contains("privacy-masked");
    setPrivacyMode(isMasked);

    const handlePrivacyChange = () => {
      setPrivacyMode(document.documentElement.classList.contains("privacy-masked"));
    };
    window.addEventListener("pandian-privacy-change", handlePrivacyChange);
    return () => window.removeEventListener("pandian-privacy-change", handlePrivacyChange);
  }, []);

  const openEditItemsModal = () => {
    setModifiedItems(
      order.items.map((i: any) => ({
        id: i.id,
        name: i.productName,
        unitLabel: i.unitLabel,
        quantity: new Decimal(i.quantity).toString(),
        unitPrice: new Decimal(i.unitPrice).toNumber(),
        remove: false,
      }))
    );
    setEditItemsOpen(true);
  };

  const handleSaveModifiedItems = () => {
    const toRemove = modifiedItems.filter((i) => i.remove).map((i) => i.id);
    const updates = modifiedItems
      .filter((i) => !i.remove)
      .map((i) => ({ itemId: i.id, quantity: parseFloat(i.quantity) || 0 }));

    startTransition(async () => {
      const res = await modifyOrderItemsBeforeAccept(order.id, updates, toRemove);
      if (!res.success) {
        setActionError(res.error || "Failed to update items.");
      } else {
        setEditItemsOpen(false);
        router.refresh();
      }
    });
  };

  const handleAccept = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await acceptOrder(order.id);
      if (!res.success) {
        setActionError(res.error || "Failed to accept order.");
      } else {
        router.refresh();
      }
    });
  };

  const handleStatusTransition = (newStatus: OrderStatus) => {
    setActionError(null);
    startTransition(async () => {
      const res = await updateOrderStatus(order.id, newStatus);
      if (!res.success) {
        setActionError(res.error || "Failed to update order status.");
      } else {
        router.refresh();
      }
    });
  };

  const handleConfirmRejectOrCancel = () => {
    if (!rejectDialog.reason.trim()) {
      setRejectDialog((prev) => ({ ...prev, error: "Please enter a reason." }));
      return;
    }

    startTransition(async () => {
      const res = await cancelOrRejectOrder(
        order.id,
        rejectDialog.action,
        rejectDialog.reason
      );
      if (!res.success) {
        setRejectDialog((prev) => ({ ...prev, error: res.error || "Failed to cancel order." }));
      } else {
        setRejectDialog((prev) => ({ ...prev, open: false }));
        router.refresh();
      }
    });
  };

  const cleanPhone = order.customerPhone.replace(/\D/g, "");

  return (
    <div className="space-y-6">
      {/* Back button and quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 -ml-2 text-muted hover:text-ink hover:bg-surface rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="sr-only">Back to orders</span>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-ink">{order.orderNumber}</h1>
              {order.fulfilment === "DELIVERY" ? (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                  <Truck size={13} />
                  Home Delivery
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-200">
                  <Storefront size={13} />
                  Store Pickup
                </span>
              )}
            </div>
            <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
              <Clock size={13} />
              Placed on {new Date(order.placedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>

        {/* Action icons: WhatsApp, Call, Print */}
        <div className="flex items-center gap-2">
          {whatsAppUrl && (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#25D366] text-white text-xs font-semibold hover:bg-[#20bd5a] transition-colors shadow-xs"
            >
              <WhatsappLogo size={16} weight="bold" />
              <span>WhatsApp Customer</span>
            </a>
          )}
          <a
            href={`tel:${order.customerPhone}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-surface border border-border text-ink text-xs font-medium hover:bg-page transition-colors"
          >
            <Phone size={16} />
            <span>Call</span>
          </a>
          <Link
            href={`/admin/orders/${order.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-surface border border-border text-ink text-xs font-medium hover:bg-page transition-colors"
          >
            <Printer size={16} />
            <span>Print Slip</span>
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-md bg-red-light border border-red text-sm text-red flex items-start gap-3">
          <WarningCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Action failed</p>
            <p className="mt-0.5">{actionError}</p>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* State Machine Status Banner & Action Workflow Bar */}
      <div className="p-4 rounded-lg border border-border bg-surface shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-muted">
              Current Workflow Status
            </span>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={order.status} />
              {order.status === "REJECTED" && order.rejectedReason && (
                <span className="text-xs text-red font-medium">Reason: {order.rejectedReason}</span>
              )}
              {order.status === "CANCELLED" && order.cancelReason && (
                <span className="text-xs text-red font-medium">Reason: {order.cancelReason}</span>
              )}
            </div>
          </div>

          {/* Workflow Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {order.status === "PLACED" && (
              <>
                <Button
                  type="button"
                  variant="default"
                  disabled={isPending}
                  onClick={handleAccept}
                  className="text-sm h-10 px-4 min-h-[44px]"
                >
                  <CheckCircle size={18} weight="bold" />
                  Accept Order & Reserve Stock
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openEditItemsModal}
                  className="text-sm h-10 px-3 min-h-[44px]"
                >
                  <PencilSimple size={16} />
                  Adjust Items
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    setRejectDialog({
                      open: true,
                      action: "REJECT",
                      reason: "Items temporarily out of stock",
                      error: null,
                    })
                  }
                  className="text-sm h-10 px-3 min-h-[44px] text-red border-red/30 hover:bg-red-light"
                >
                  <XCircle size={16} />
                  Reject Request
                </Button>
              </>
            )}

            {order.status === "ACCEPTED" && (
              <>
                <Button
                  type="button"
                  variant="turmeric"
                  disabled={isPending}
                  onClick={() => handleStatusTransition("PROCESSING")}
                  className="text-sm h-10 px-4 min-h-[44px] text-ink font-bold"
                >
                  Start Packing & Weighing
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    setRejectDialog({
                      open: true,
                      action: "CANCEL",
                      reason: "Customer requested cancellation",
                      error: null,
                    })
                  }
                  className="text-sm h-10 px-3 min-h-[44px] text-red border-red/30 hover:bg-red-light"
                >
                  Cancel Order
                </Button>
              </>
            )}

            {order.status === "PROCESSING" && (
              <>
                <Button
                  type="button"
                  variant="default"
                  disabled={isPending}
                  onClick={() => handleStatusTransition("READY")}
                  className="text-sm h-10 px-4 min-h-[44px]"
                >
                  Mark Ready for {order.fulfilment === "DELIVERY" ? "Delivery" : "Pickup"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    setRejectDialog({
                      open: true,
                      action: "CANCEL",
                      reason: "Cancelled while packing",
                      error: null,
                    })
                  }
                  className="text-sm h-10 px-3 min-h-[44px] text-red border-red/30 hover:bg-red-light"
                >
                  Cancel Order
                </Button>
              </>
            )}

            {order.status === "READY" && (
              <>
                <Button
                  type="button"
                  variant="turmeric"
                  disabled={isPending}
                  onClick={() => handleStatusTransition("COMPLETED")}
                  className="text-sm h-10 px-4 min-h-[44px] text-ink font-bold"
                >
                  <CheckCircle size={18} weight="bold" />
                  Mark Fulfilled & Completed
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    setRejectDialog({
                      open: true,
                      action: "CANCEL",
                      reason: "Customer did not collect / failed delivery",
                      error: null,
                    })
                  }
                  className="text-sm h-10 px-3 min-h-[44px] text-red border-red/30 hover:bg-red-light"
                >
                  Cancel Order
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stepper progress representation */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/60">
          {[
            { key: "PLACED", label: "Request Placed" },
            { key: "ACCEPTED", label: "Confirmed" },
            { key: "PROCESSING", label: "Packing" },
            { key: "READY", label: "Ready / Out" },
          ].map((step, idx) => {
            const isCompleted =
              order.status === "COMPLETED" ||
              (step.key === "PLACED" && order.status !== "REJECTED") ||
              (step.key === "ACCEPTED" &&
                ["ACCEPTED", "PROCESSING", "READY", "COMPLETED"].includes(order.status)) ||
              (step.key === "PROCESSING" &&
                ["PROCESSING", "READY", "COMPLETED"].includes(order.status)) ||
              (step.key === "READY" && ["READY", "COMPLETED"].includes(order.status));

            const isCurrent = order.status === step.key;

            return (
              <div key={step.key} className="flex flex-col items-center text-center">
                <div
                  className={`w-full h-1.5 rounded-full mb-1.5 ${
                    isCurrent
                      ? "bg-turmeric"
                      : isCompleted
                      ? "bg-leaf"
                      : "bg-border"
                  }`}
                />
                <span
                  className={`text-[11px] font-medium truncate ${
                    isCurrent ? "text-ink font-bold" : isCompleted ? "text-leaf" : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Items List and Profit breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-base text-ink">
                Ordered Items ({order.items.length})
              </h2>
              {order.status === "PLACED" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openEditItemsModal}
                  className="text-xs"
                >
                  <PencilSimple size={14} />
                  Edit Items
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-page/60 text-xs text-muted uppercase">
                    <th className="py-2.5 px-4 font-semibold">Item</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Quantity</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Price</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Line Total</th>
                    {/* Admin cost inspection column with privacy masking */}
                    <th className="py-2.5 px-4 font-semibold text-right text-leaf">
                      Cost / Margin
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.items.map((item: any) => {
                    const lineTotal = new Decimal(item.lineTotal);
                    const unitPrice = new Decimal(item.unitPrice);
                    const qty = new Decimal(item.quantity);

                    // Cost data (Admin only)
                    const costRate = item.cost?.unitCost
                      ? new Decimal(item.cost.unitCost)
                      : item.product?.cost?.lastCost
                      ? new Decimal(item.product.cost.lastCost)
                      : null;

                    const totalCost = costRate ? costRate.times(qty) : null;
                    const estimatedProfit = totalCost ? lineTotal.minus(totalCost) : null;
                    const marginPct =
                      totalCost && lineTotal.gt(0)
                        ? estimatedProfit!.times(100).dividedBy(lineTotal).toFixed(1)
                        : null;

                    return (
                      <tr key={item.id} className="hover:bg-page/40">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-ink">{item.productName}</div>
                          {item.product?.nameTamil && (
                            <div className="text-xs text-muted font-tamil">
                              {item.product.nameTamil}
                            </div>
                          )}
                          {/* Stock status hint */}
                          {item.product && (
                            <div className="text-[11px] text-muted mt-0.5">
                              Current stock: {new Decimal(item.product.stockQty).toString()}{" "}
                              {item.unitLabel}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-medium text-ink">
                          {qty.toString()} {item.unitLabel}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-muted">
                          {formatINR(unitPrice)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-ink">
                          {formatINR(lineTotal)}
                        </td>

                        {/* Owner margin & cost analysis with privacy masking */}
                        <td className="py-3 px-4 text-right tabular-nums">
                          {costRate ? (
                            <div className="privacy-target">
                              <span className="text-xs font-semibold text-leaf">
                                +{marginPct}%
                              </span>
                              <div className="text-[11px] text-muted">
                                ₹{costRate.toFixed(2)}/u
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Subtotal, delivery fee, total breakdown */}
            <div className="p-4 bg-page/50 border-t border-border flex justify-end">
              <div className="w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal:</span>
                  <span className="tabular-nums font-medium text-ink">
                    {formatINR(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Delivery Fee:</span>
                  <span className="tabular-nums font-medium text-ink">
                    {new Decimal(order.deliveryFee).eq(0) ? (
                      <span className="text-leaf font-semibold">FREE</span>
                    ) : (
                      formatINR(order.deliveryFee)
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between font-bold text-base text-ink">
                  <span>Total Amount:</span>
                  <span className="tabular-nums text-leaf text-lg">
                    {formatINR(order.total)}
                  </span>
                </div>
                <div className="text-[11px] text-muted text-right">
                  Payment mode: Cash / UPI on Delivery
                </div>
              </div>
            </div>
          </div>

          {/* Timeline of Events */}
          <div className="bg-surface border border-border rounded-lg p-4 shadow-xs">
            <h2 className="font-bold text-base text-ink mb-4">Order History & Events</h2>
            <div className="space-y-4">
              {order.events.map((ev: any, idx: number) => (
                <div key={ev.id || idx} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-leaf mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{ev.status}</span>
                      <span className="text-muted tabular-nums">
                        {new Date(ev.createdAt).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {ev.note && <p className="text-muted mt-0.5">{ev.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Customer Info & Fulfillment Info */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-lg p-5 shadow-xs space-y-4">
            <h2 className="font-bold text-base text-ink flex items-center gap-2">
              <User size={18} className="text-leaf" />
              Customer Information
            </h2>

            <div className="text-sm space-y-3">
              <div>
                <span className="text-xs text-muted block">Customer Name</span>
                <span className="font-semibold text-ink text-base">{order.customerName}</span>
              </div>

              <div>
                <span className="text-xs text-muted block">Phone Number</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="font-medium text-leaf hover:underline text-sm tabular-nums"
                  >
                    {order.customerPhone}
                  </a>
                </div>
              </div>

              {order.fulfilment === "DELIVERY" && (
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted block flex items-center gap-1">
                    <MapPin size={14} />
                    Delivery Address
                  </span>
                  <div className="mt-1 font-medium text-ink space-y-0.5 text-xs leading-relaxed bg-page p-2.5 rounded border border-border">
                    {order.addressLine && <p>{order.addressLine}</p>}
                    {order.landmark && <p className="text-muted">Landmark: {order.landmark}</p>}
                    <p>
                      {order.area} {order.pincode ? `- ${order.pincode}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {order.notes && (
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted block flex items-center gap-1">
                    <Note size={14} />
                    Customer Note
                  </span>
                  <p className="mt-1 text-xs italic text-ink bg-page p-2.5 rounded border border-border">
                    &ldquo;{order.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modify Items Modal Dialog */}
      <Dialog open={editItemsOpen} onOpenChange={setEditItemsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adjust Order Items</DialogTitle>
            <DialogDescription>
              Adjust quantities or remove items before accepting the order. Subtotal and delivery fee will be recalculated.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2 divide-y divide-border">
            {modifiedItems.map((item, idx) => (
              <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold text-sm truncate ${
                      item.remove ? "line-through text-muted" : "text-ink"
                    }`}
                  >
                    {item.name}
                  </p>
                  <p className="text-xs text-muted">₹{item.unitPrice} per {item.unitLabel}</p>
                </div>

                {!item.remove ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          setModifiedItems((prev) =>
                            prev.map((i, iIdx) => (iIdx === idx ? { ...i, quantity: val } : i))
                          );
                        }}
                        className="w-20 h-9 px-2 text-sm text-right bg-page border border-border rounded focus:ring-1 focus:ring-leaf"
                      />
                      <span className="text-xs text-muted w-8">{item.unitLabel}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setModifiedItems((prev) =>
                          prev.map((i, iIdx) => (iIdx === idx ? { ...i, remove: true } : i))
                        )
                      }
                      className="p-2 text-muted hover:text-red hover:bg-red-light rounded"
                      title="Remove item"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setModifiedItems((prev) =>
                        prev.map((i, iIdx) => (iIdx === idx ? { ...i, remove: false } : i))
                      )
                    }
                    className="text-xs text-leaf font-medium hover:underline px-2 py-1"
                  >
                    Undo Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditItemsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isPending}
              onClick={handleSaveModifiedItems}
            >
              Update Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject or Cancel Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {rejectDialog.action === "REJECT" ? "Reject Order Request" : "Cancel Order"}
            </DialogTitle>
            <DialogDescription>
              {rejectDialog.action === "REJECT"
                ? `Order ${order.orderNumber} will be marked as rejected. The customer will see this reason.`
                : `Order ${order.orderNumber} will be cancelled. Any stock reserved at acceptance will be restored.`}
            </DialogDescription>
          </DialogHeader>

          {rejectDialog.error && (
            <div className="p-3 bg-red-light border border-red text-xs text-red rounded">
              {rejectDialog.error}
            </div>
          )}

          <div className="space-y-3 py-2">
            <label className="block text-xs font-semibold text-ink">
              Reason for {rejectDialog.action === "REJECT" ? "rejection" : "cancellation"}:
            </label>
            <textarea
              value={rejectDialog.reason}
              onChange={(e) =>
                setRejectDialog((prev) => ({ ...prev, reason: e.target.value, error: null }))
              }
              rows={3}
              placeholder="Enter reason..."
              className="w-full text-sm p-2.5 rounded-md border border-border bg-page focus:ring-2 focus:ring-leaf focus:outline-none"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectDialog((prev) => ({ ...prev, open: false }))}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isPending}
              onClick={handleConfirmRejectOrCancel}
              className="bg-red hover:bg-red/90 text-white"
            >
              {rejectDialog.action === "REJECT" ? "Confirm Rejection" : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case "PLACED":
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-turmeric text-ink font-bold border border-turmeric-dark/20 shadow-xs">
          New Request (Waiting for Acceptance)
        </span>
      );
    case "ACCEPTED":
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-leaf-light text-leaf font-bold border border-leaf/20">
          Order Accepted & Stock Reserved
        </span>
      );
    case "PROCESSING":
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
          Being Packed & Weighed
        </span>
      );
    case "READY":
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
          Ready for Pickup / Out for Delivery
        </span>
      );
    case "COMPLETED":
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
          Order Completed
        </span>
      );
    case "REJECTED":
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200">
          Order Rejected
        </span>
      );
    case "CANCELLED":
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red font-bold border border-red/20">
          Order Cancelled
        </span>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}
