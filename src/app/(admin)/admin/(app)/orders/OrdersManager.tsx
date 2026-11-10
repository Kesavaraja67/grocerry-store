"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Funnel,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  Storefront,
  Printer,
  WhatsappLogo,
  ArrowRight,
  Clock,
  WarningCircle,
  CaretRight,
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
  AdminOrdersResult,
} from "@/server/admin/orders";
import { OrderStatus, FulfilmentType } from "@/server/domain/orders";
import { formatINR } from "@/server/domain/money";

interface OrdersManagerProps {
  initialData: AdminOrdersResult;
  currentStatus: string;
  currentQuery: string;
  currentFulfilment: string;
}

const STATUS_TABS: Array<{ id: OrderStatus | "ALL"; label: string; labelTamil: string }> = [
  { id: "ALL", label: "All Orders", labelTamil: "அனைத்தும்" },
  { id: "PLACED", label: "New Requests", labelTamil: "புதியவை" },
  { id: "ACCEPTED", label: "Accepted", labelTamil: "ஏற்றுக்கொள்ளப்பட்டது" },
  { id: "PROCESSING", label: "Packing", labelTamil: "பேக்கிங்" },
  { id: "READY", label: "Ready", labelTamil: "தயார்" },
  { id: "COMPLETED", label: "Completed", labelTamil: "முடிந்தது" },
  { id: "CANCELLED", label: "Cancelled", labelTamil: "ரத்து" },
];

export function OrdersManager({
  initialData,
  currentStatus,
  currentQuery,
  currentFulfilment,
}: OrdersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(currentQuery);
  const [activeStatus, setActiveStatus] = useState<string>(currentStatus);
  const [activeFulfilment, setActiveFulfilment] = useState<string>(currentFulfilment);

  // Dialog states
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    orderId: string;
    orderNumber: string;
    action: "CANCEL" | "REJECT";
    reason: string;
    error: string | null;
  }>({
    open: false,
    orderId: "",
    orderNumber: "",
    action: "REJECT",
    reason: "",
    error: null,
  });

  const [actionError, setActionError] = useState<string | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilter({ query: search });
  };

  const applyFilter = (newParams: { status?: string; query?: string; fulfilment?: string }) => {
    const s = newParams.status !== undefined ? newParams.status : activeStatus;
    const q = newParams.query !== undefined ? newParams.query : search;
    const f = newParams.fulfilment !== undefined ? newParams.fulfilment : activeFulfilment;

    const url = new URL("/admin/orders", window.location.origin);
    if (s && s !== "ALL") url.searchParams.set("status", s);
    if (q) url.searchParams.set("q", q);
    if (f && f !== "ALL") url.searchParams.set("fulfilment", f);

    startTransition(() => {
      router.push(url.pathname + url.search);
    });
  };

  // State actions
  const handleAccept = async (orderId: string) => {
    setActionError(null);
    startTransition(async () => {
      const res = await acceptOrder(orderId);
      if (!res.success) {
        setActionError(res.error || "Failed to accept order.");
      } else {
        router.refresh();
      }
    });
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setActionError(null);
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, newStatus);
      if (!res.success) {
        setActionError(res.error || "Failed to update order status.");
      } else {
        router.refresh();
      }
    });
  };

  const openRejectOrCancelModal = (
    orderId: string,
    orderNumber: string,
    action: "CANCEL" | "REJECT"
  ) => {
    setRejectDialog({
      open: true,
      orderId,
      orderNumber,
      action,
      reason: action === "REJECT" ? "Items temporarily out of stock" : "Customer requested cancellation",
      error: null,
    });
  };

  const handleConfirmRejectOrCancel = async () => {
    if (!rejectDialog.reason.trim()) {
      setRejectDialog((prev) => ({ ...prev, error: "Please enter a reason." }));
      return;
    }

    startTransition(async () => {
      const res = await cancelOrRejectOrder(
        rejectDialog.orderId,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Order Management</h1>
          <p className="text-sm text-muted">
            Manage incoming customer requests, confirm orders, update packing status, and print slips.
          </p>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-md bg-red-light border border-red text-sm text-red flex items-start gap-3">
          <WarningCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Action could not be completed</p>
            <p className="mt-0.5">{actionError}</p>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs underline hover:no-underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          {STATUS_TABS.map((tab) => {
            const count = initialData.statusCounts[tab.id] ?? 0;
            const isActive = activeStatus === tab.id;
            const isPlaced = tab.id === "PLACED" && count > 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveStatus(tab.id);
                  applyFilter({ status: tab.id });
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-all ${
                  isActive
                    ? "bg-leaf text-surface shadow-xs"
                    : isPlaced
                    ? "bg-turmeric-light text-ink hover:bg-turmeric-light/80 border border-turmeric/30"
                    : "text-muted hover:text-ink hover:bg-page"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums font-semibold ${
                    isActive
                      ? "bg-white/20 text-surface"
                      : isPlaced
                      ? "bg-turmeric text-ink font-bold"
                      : "bg-surface border border-border text-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Fulfilment Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer, phone..."
            className="w-full h-11 pl-10 pr-4 text-sm bg-surface border border-border rounded-md text-ink placeholder:text-muted focus:ring-2 focus:ring-leaf focus:outline-none"
          />
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-3.5 text-muted pointer-events-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                applyFilter({ query: "" });
              }}
              className="absolute right-3 top-3 text-xs text-muted hover:text-ink"
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => {
                setActiveFulfilment("ALL");
                applyFilter({ fulfilment: "ALL" });
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                activeFulfilment === "ALL" ? "bg-page text-ink shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFulfilment("DELIVERY");
                applyFilter({ fulfilment: "DELIVERY" });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all ${
                activeFulfilment === "DELIVERY" ? "bg-page text-leaf font-semibold shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              <Truck size={14} />
              Delivery
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFulfilment("PICKUP");
                applyFilter({ fulfilment: "PICKUP" });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all ${
                activeFulfilment === "PICKUP" ? "bg-page text-leaf font-semibold shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              <Storefront size={14} />
              Pickup
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {initialData.orders.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-lg">
          <div className="w-12 h-12 mx-auto rounded-full bg-page flex items-center justify-center text-muted mb-3">
            <Package size={24} />
          </div>
          <h3 className="font-semibold text-ink text-base">No orders found</h3>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
            {activeStatus !== "ALL" || search
              ? "No orders match your active filter criteria. Try clearing the filter."
              : "When customers place orders from the storefront, they will appear here for review and confirmation."}
          </p>
          {(activeStatus !== "ALL" || search) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveStatus("ALL");
                setSearch("");
                setActiveFulfilment("ALL");
                applyFilter({ status: "ALL", query: "", fulfilment: "ALL" });
              }}
              className="mt-4"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto bg-surface border border-border rounded-lg shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-page/60 text-xs text-muted uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Order</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Fulfilment</th>
                  <th className="py-3 px-4 font-semibold">Items</th>
                  <th className="py-3 px-4 font-semibold text-right">Total</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {initialData.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-page/40 transition-colors">
                    {/* Order Number & Placed Time */}
                    <td className="py-3.5 px-4 font-medium text-ink">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-bold text-leaf hover:underline flex items-center gap-1"
                      >
                        {order.orderNumber}
                      </Link>
                      <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
                        <Clock size={12} />
                        {new Date(order.placedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink">{order.customerName}</div>
                      <div className="text-xs text-muted">{order.customerPhone}</div>
                      {order.area && (
                        <div className="text-[11px] text-muted truncate max-w-[150px]">
                          {order.area}
                        </div>
                      )}
                    </td>

                    {/* Fulfilment */}
                    <td className="py-3.5 px-4">
                      {order.fulfilment === "DELIVERY" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                          <Truck size={13} />
                          Delivery
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-200">
                          <Storefront size={13} />
                          Pickup
                        </span>
                      )}
                    </td>

                    {/* Items */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-xs font-medium text-ink truncate" title={order.itemsSummary}>
                        {order.itemsSummary}
                      </div>
                      <span className="text-[11px] text-muted">
                        {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right font-bold tabular-nums text-ink">
                      {formatINR(order.total)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <OrderStatusBadge status={order.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.status === "PLACED" && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              disabled={isPending}
                              onClick={() => handleAccept(order.id)}
                              className="text-xs h-8 px-2.5"
                            >
                              <CheckCircle size={15} weight="bold" />
                              Accept
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() =>
                                openRejectOrCancelModal(order.id, order.orderNumber, "REJECT")
                              }
                              className="text-xs h-8 px-2 text-red hover:bg-red-light border-red/30"
                            >
                              <XCircle size={15} />
                              Reject
                            </Button>
                          </>
                        )}

                        {order.status === "ACCEPTED" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="turmeric"
                            disabled={isPending}
                            onClick={() => handleStatusChange(order.id, "PROCESSING")}
                            className="text-xs h-8 px-2.5 text-ink font-semibold"
                          >
                            Start Packing
                          </Button>
                        )}

                        {order.status === "PROCESSING" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            disabled={isPending}
                            onClick={() => handleStatusChange(order.id, "READY")}
                            className="text-xs h-8 px-2.5"
                          >
                            Mark Ready
                          </Button>
                        )}

                        {order.status === "READY" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="turmeric"
                            disabled={isPending}
                            onClick={() => handleStatusChange(order.id, "COMPLETED")}
                            className="text-xs h-8 px-2.5 text-ink font-semibold"
                          >
                            Complete
                          </Button>
                        )}

                        <Link
                          href={`/admin/orders/${order.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-muted hover:text-ink hover:bg-page rounded transition-colors"
                          title="Print Order Slip"
                        >
                          <Printer size={16} />
                        </Link>

                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="p-1.5 text-muted hover:text-leaf hover:bg-leaf-light rounded transition-colors"
                          title="View Details"
                        >
                          <CaretRight size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (Phone-First) */}
          <div className="lg:hidden space-y-3">
            {initialData.orders.map((order) => (
              <div
                key={order.id}
                className="bg-surface border border-border rounded-lg p-4 shadow-xs space-y-3"
              >
                {/* Top Row: Number, Status, Time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-bold text-leaf hover:underline text-base"
                    >
                      {order.orderNumber}
                    </Link>
                    {order.fulfilment === "DELIVERY" ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                        Delivery
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-200">
                        Pickup
                      </span>
                    )}
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Customer Info */}
                <div className="text-sm">
                  <div className="font-semibold text-ink">{order.customerName}</div>
                  <div className="text-xs text-muted flex items-center justify-between mt-0.5">
                    <span>{order.customerPhone}</span>
                    <span className="text-[11px]">
                      {new Date(order.placedAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>

                {/* Items Summary & Total */}
                <div className="bg-page/70 p-2.5 rounded border border-border/50 text-xs">
                  <p className="text-ink font-medium truncate">{order.itemsSummary}</p>
                  <div className="flex items-center justify-between mt-1 text-muted">
                    <span>{order.itemCount} items</span>
                    <span className="font-bold text-ink text-sm tabular-nums">
                      {formatINR(order.total)}
                    </span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  {order.status === "PLACED" && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        disabled={isPending}
                        onClick={() => handleAccept(order.id)}
                        className="flex-1 text-xs h-10 min-h-[44px]"
                      >
                        <CheckCircle size={16} weight="bold" />
                        Accept Order
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          openRejectOrCancelModal(order.id, order.orderNumber, "REJECT")
                        }
                        className="text-xs h-10 min-h-[44px] px-3 text-red border-red/30 hover:bg-red-light"
                      >
                        <XCircle size={16} />
                        Reject
                      </Button>
                    </>
                  )}

                  {order.status === "ACCEPTED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="turmeric"
                      disabled={isPending}
                      onClick={() => handleStatusChange(order.id, "PROCESSING")}
                      className="flex-1 text-xs h-10 min-h-[44px] text-ink font-semibold"
                    >
                      Start Packing
                    </Button>
                  )}

                  {order.status === "PROCESSING" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      disabled={isPending}
                      onClick={() => handleStatusChange(order.id, "READY")}
                      className="flex-1 text-xs h-10 min-h-[44px]"
                    >
                      Mark Ready
                    </Button>
                  )}

                  {order.status === "READY" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="turmeric"
                      disabled={isPending}
                      onClick={() => handleStatusChange(order.id, "COMPLETED")}
                      className="flex-1 text-xs h-10 min-h-[44px] text-ink font-semibold"
                    >
                      Mark Completed
                    </Button>
                  )}

                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-center h-10 min-h-[44px] px-3 text-xs font-medium border border-border rounded-md hover:bg-page text-ink transition-colors"
                  >
                    View
                  </Link>

                  <Link
                    href={`/admin/orders/${order.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center h-10 min-h-[44px] px-3 text-xs font-medium border border-border rounded-md hover:bg-page text-muted hover:text-ink transition-colors"
                    title="Print Slip"
                  >
                    <Printer size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject or Cancel Modal */}
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
                ? `Order ${rejectDialog.orderNumber} will be rejected and the customer will see this reason.`
                : `Order ${rejectDialog.orderNumber} will be cancelled. Any reserved stock will be automatically restored.`}
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

            <div className="flex flex-wrap gap-1.5 pt-1">
              {(rejectDialog.action === "REJECT"
                ? [
                    "Items temporarily out of stock",
                    "Customer address out of delivery range",
                    "Customer requested change",
                    "Duplicate request",
                  ]
                : [
                    "Customer requested cancellation",
                    "Damaged items during packing",
                    "Unable to reach customer phone",
                    "Payment refused on delivery",
                  ]
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    setRejectDialog((prev) => ({ ...prev, reason: preset, error: null }))
                  }
                  className="text-[11px] px-2 py-1 bg-surface border border-border rounded text-muted hover:text-ink hover:bg-page transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
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

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case "PLACED":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-turmeric text-ink font-bold border border-turmeric-dark/20 shadow-xs">
          New Request
        </span>
      );
    case "ACCEPTED":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-leaf-light text-leaf font-semibold border border-leaf/20">
          Accepted
        </span>
      );
    case "PROCESSING":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
          Packing
        </span>
      );
    case "READY":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
          Ready
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
          Completed
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium border border-gray-200">
          Rejected
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-red-50 text-red font-medium border border-red/20">
          Cancelled
        </span>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
