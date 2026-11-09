"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Storefront,
  Receipt,
  WarningCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Prohibit,
  PencilSimple,
  Printer,
  Info,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR } from "@/lib/format";
import { voidPurchase } from "@/server/admin/purchases";

interface PurchaseItemDetail {
  id: string;
  productId: string;
  productName: string;
  productNameTamil: string | null;
  baseUnitSymbol: string;
  quantity: number;
  unitId: string;
  unitLabel: string;
  unitSymbol: string;
  unitsPerPack: number | null;
  baseQty: number;
  lineAmount: number;
  extraShare: number;
  unitCost: number;
  previousRate: number | null;
  previousDate: string | null;
  previousSupplierName: string | null;
  diffPercent: number | null;
  sellingPrice: number | null;
}

interface PurchaseDetail {
  id: string;
  purchaseDate: string;
  invoiceNo: string | null;
  supplierId: string;
  supplier: {
    id: string;
    name: string;
    phone: string | null;
    area: string | null;
    address: string | null;
  };
  subtotal: number;
  extraCharges: number;
  total: number;
  notes: string | null;
  status: "ACTIVE" | "VOIDED";
  voidedAt: string | null;
  voidReason: string | null;
  replaces: {
    id: string;
    invoiceNo: string | null;
    purchaseDate: string;
    total: number;
  } | null;
  replacedBy: {
    id: string;
    invoiceNo: string | null;
    purchaseDate: string;
    total: number;
  } | null;
  createdAt: string;
  items: PurchaseItemDetail[];
}

interface Props {
  purchase: PurchaseDetail;
}

export function PurchaseDetailView({ purchase }: Props) {
  const router = useRouter();
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isVoided = purchase.status === "VOIDED";

  const handleVoidConfirm = async () => {
    if (!voidReason.trim()) {
      setErrorMessage("Please enter a reason for voiding this bill.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await voidPurchase(purchase.id, voidReason.trim());
      setIsVoidModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to void purchase bill.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button and breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/purchases"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Back to wholesale purchases
        </Link>

        <div className="flex items-center gap-2">
          {!isVoided && (
            <>
              <Link href={`/admin/purchases/new?correctId=${purchase.id}`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <PencilSimple size={15} />
                  Correct bill
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVoidModalOpen(true)}
                className="gap-1.5 text-xs text-red hover:text-red hover:bg-red/5 border-red/30"
              >
                <Prohibit size={15} />
                Void bill
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs"
          >
            <Printer size={15} />
            Print
          </Button>
        </div>
      </div>

      {/* Void Notification Banner */}
      {isVoided && (
        <div className="rounded-lg border border-red/30 bg-red/5 p-4 text-sm text-red space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <WarningCircle size={18} weight="bold" />
            This purchase bill was VOIDED on{" "}
            {purchase.voidedAt ? purchase.voidedAt.split("T")[0] : ""}
          </div>
          <p className="text-xs text-ink-muted pl-6">
            <span className="font-medium text-ink">Reason:</span> {purchase.voidReason || "No reason specified."}
          </p>
          <p className="text-[11px] text-ink-muted pl-6">
            Stock quantities were reversed and product moving average costs were automatically recalculated.
          </p>
        </div>
      )}

      {/* Replacement Notice Banner */}
      {purchase.replacedBy && (
        <div className="rounded-lg border border-turmeric/40 bg-turmeric/10 p-4 text-sm space-y-1">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Info size={18} weight="bold" className="text-leaf" />
            This bill was replaced by a corrected bill:
          </div>
          <p className="text-xs text-ink-muted pl-6">
            <Link
              href={`/admin/purchases/${purchase.replacedBy.id}`}
              className="font-medium text-leaf underline hover:text-leaf-dark"
            >
              View replacement bill ({purchase.replacedBy.invoiceNo || purchase.replacedBy.id}) — {formatINR(purchase.replacedBy.total)}
            </Link>
          </p>
        </div>
      )}

      {/* Top Bill Meta Card */}
      <Card className="p-6 bg-surface border-border shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-heading text-ink">
                {purchase.invoiceNo ? `Bill #${purchase.invoiceNo}` : "Wholesale Bill"}
              </h1>
              {isVoided ? (
                <Badge variant="outline" className="text-red border-red/40 bg-red/5">
                  Voided
                </Badge>
              ) : (
                <Badge variant="outline" className="text-leaf border-leaf/40 bg-leaf/5">
                  Active
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
              <span className="flex items-center gap-1 font-mono">
                <Calendar size={14} />
                Bill Date: {purchase.purchaseDate}
              </span>
              <span>•</span>
              <span>Recorded: {purchase.createdAt.split("T")[0]}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-page/70 p-4 rounded-lg border border-border/60">
            <div className="w-10 h-10 rounded-full bg-turmeric/20 text-leaf flex items-center justify-center shrink-0">
              <Storefront size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-ink-muted uppercase tracking-wider font-semibold">
                Wholesale Store
              </div>
              <Link
                href={`/admin/suppliers/${purchase.supplierId}`}
                className="text-base font-bold text-ink hover:text-leaf underline-offset-2 hover:underline transition-colors"
              >
                {purchase.supplier.name}
              </Link>
              {purchase.supplier.area && (
                <div className="text-xs text-ink-muted">{purchase.supplier.area}</div>
              )}
            </div>
          </div>
        </div>

        {purchase.notes && (
          <div className="mt-4 pt-4 border-t border-border/60 text-xs text-ink-muted">
            <span className="font-semibold text-ink">Notes:</span> {purchase.notes}
          </div>
        )}
      </Card>

      {/* Purchase Items Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-heading text-ink">
            Items on Bill ({purchase.items.length})
          </h2>
          <span className="text-xs text-ink-muted">
            Rates are tax-inclusive and allocate transport/loading proportionally.
          </span>
        </div>

        <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-page/60 hover:bg-page/60">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty Entered</TableHead>
                <TableHead className="text-right">Stock Added</TableHead>
                <TableHead className="text-right">Line Amount</TableHead>
                <TableHead className="text-right">Extra Share</TableHead>
                <TableHead className="text-right">Net Cost / Unit</TableHead>
                <TableHead className="text-right">Comparison</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map((item, idx) => {
                const hasDiff = item.diffPercent !== null;
                const isHigher = item.diffPercent !== null && item.diffPercent > 0;
                const isLower = item.diffPercent !== null && item.diffPercent < 0;

                return (
                  <TableRow key={item.id} className="hover:bg-page/40 transition-colors">
                    <TableCell className="text-xs text-ink-muted font-mono">{idx + 1}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="font-semibold text-sm text-ink hover:text-leaf underline-offset-2 hover:underline transition-colors"
                      >
                        {item.productName}
                      </Link>
                      {item.productNameTamil && (
                        <div className="text-xs text-ink-muted font-tamil">
                          {item.productNameTamil}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.quantity} {item.unitSymbol}
                      {item.unitsPerPack && (
                        <div className="text-[11px] text-ink-muted">
                          ({item.unitsPerPack} {item.baseUnitSymbol}/pack)
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-leaf">
                      +{item.baseQty} {item.baseUnitSymbol}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-ink">
                      {formatINR(item.lineAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-ink-muted">
                      {item.extraShare > 0 ? formatINR(item.extraShare) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-ink">
                      {formatINR(item.unitCost)} / {item.baseUnitSymbol}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.diffPercent !== null ? (
                        <div className="inline-flex flex-col items-end">
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                              isHigher
                                ? "text-red"
                                : isLower
                                ? "text-leaf"
                                : "text-ink-muted"
                            }`}
                          >
                            {isHigher && <ArrowUpRight size={13} weight="bold" />}
                            {isLower && <ArrowDownRight size={13} weight="bold" />}
                            {item.diffPercent > 0 ? `+${item.diffPercent}%` : `${item.diffPercent}%`}
                          </span>
                          <span className="text-[10px] text-ink-muted">
                            vs {formatINR(item.previousRate || 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-muted italic">First purchase</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Financial Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 bg-surface border-border shadow-xs">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted mb-3">
            Wholesale Store Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Store Name:</span>
              <span className="font-semibold text-ink">{purchase.supplier.name}</span>
            </div>
            {purchase.supplier.phone && (
              <div className="flex justify-between">
                <span className="text-ink-muted">Phone:</span>
                <span className="font-mono text-ink">{purchase.supplier.phone}</span>
              </div>
            )}
            {purchase.supplier.area && (
              <div className="flex justify-between">
                <span className="text-ink-muted">Area / Market:</span>
                <span className="text-ink">{purchase.supplier.area}</span>
              </div>
            )}
            {purchase.supplier.address && (
              <div className="flex justify-between">
                <span className="text-ink-muted">Address:</span>
                <span className="text-ink text-right max-w-xs">{purchase.supplier.address}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 bg-surface border-border shadow-xs space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted mb-3">
            Bill Total Breakdown
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center text-ink-muted">
              <span>Items Subtotal:</span>
              <span className="font-mono text-ink">{formatINR(purchase.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-ink-muted">
              <span>Extra Charges (Transport / Loading):</span>
              <span className="font-mono text-ink">
                {purchase.extraCharges > 0 ? formatINR(purchase.extraCharges) : "₹0.00"}
              </span>
            </div>
            <div className="pt-2 border-t border-border flex justify-between items-center text-base font-bold text-ink">
              <span>Total Paid:</span>
              <span className="font-mono text-lg text-leaf">{formatINR(purchase.total)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Void Confirmation Modal Dialog */}
      <Dialog open={isVoidModalOpen} onOpenChange={setIsVoidModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red font-heading">
              <WarningCircle size={22} weight="bold" />
              Void Wholesale Bill
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted leading-relaxed">
              Voiding this bill will reverse all stock quantities added by this purchase and
              automatically recalculate moving weighted average costs for every item.
              This cannot be undone if stock has already been sold.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="rounded-md border border-red/30 bg-red/5 p-3 text-xs text-red">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-ink">
              Reason for voiding <span className="text-red">*</span>
            </label>
            <Input
              placeholder="e.g. Bill entered twice, wrong supplier, or cancelled delivery"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsVoidModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleVoidConfirm}
              disabled={isSubmitting || !voidReason.trim()}
              className="bg-red hover:bg-red/90 text-white border-transparent"
            >
              {isSubmitting ? "Voiding..." : "Confirm Void"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
