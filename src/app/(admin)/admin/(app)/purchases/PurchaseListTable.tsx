"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Plus,
  Receipt,
  Eye,
  Calendar,
  Storefront,
  ArrowRight,
  WarningCircle,
  CheckCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR } from "@/lib/format";

interface PurchaseItemSummary {
  id: string;
  productId: string;
  productName: string;
  productNameTamil: string | null;
  quantity: number;
  unitSymbol: string;
  baseQty: number;
  lineAmount: number;
  unitCost: number;
}

interface PurchaseRow {
  id: string;
  purchaseDate: string;
  invoiceNo: string | null;
  supplierId: string;
  supplierName: string;
  supplierPhone: string | null;
  supplierArea: string | null;
  subtotal: number;
  extraCharges: number;
  total: number;
  status: "ACTIVE" | "VOIDED";
  notes: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  replacesId: string | null;
  itemCount: number;
  items: PurchaseItemSummary[];
}

interface SupplierOption {
  id: string;
  name: string;
}

interface Props {
  purchases: PurchaseRow[];
  suppliers: SupplierOption[];
  pagination: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  currentFilters: {
    search?: string;
    supplierId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export function PurchaseListTable({
  purchases,
  suppliers,
  pagination,
  currentFilters,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(currentFilters.search || "");
  const [supplierId, setSupplierId] = useState(currentFilters.supplierId || "");
  const [status, setStatus] = useState(currentFilters.status || "");
  const [dateFrom, setDateFrom] = useState(currentFilters.dateFrom || "");
  const [dateTo, setDateTo] = useState(currentFilters.dateTo || "");

  const handleFilterApply = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (supplierId) params.set("supplierId", supplierId);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    router.push(`/admin/purchases?${params.toString()}`);
  };

  const handleReset = () => {
    setSearch("");
    setSupplierId("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    router.push("/admin/purchases");
  };

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink font-heading">
            Wholesale Purchases
          </h1>
          <p className="text-sm text-ink-muted">
            Record wholesale purchase bills, track purchase rates and supplier history.
          </p>
        </div>
        <Link href="/admin/purchases/new">
          <Button variant="turmeric" className="gap-2 shadow-sm font-semibold">
            <Plus size={18} weight="bold" />
            Record purchase bill
          </Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 bg-surface border-border/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <Input
              type="text"
              placeholder="Bill no, notes, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFilterApply()}
              className="pl-9 h-10"
            />
          </div>

          {/* Supplier dropdown */}
          <div>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-leaf focus:border-leaf"
            >
              <option value="">All wholesale stores</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-leaf focus:border-leaf"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active bills</option>
              <option value="VOIDED">Voided bills</option>
            </select>
          </div>

          {/* Date from */}
          <div className="relative">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 text-xs"
              title="From date"
            />
          </div>

          {/* Date to & Actions */}
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 text-xs flex-1"
              title="To date"
            />
            <Button
              variant="outline"
              onClick={handleFilterApply}
              className="h-10 px-3 text-xs"
            >
              Filter
            </Button>
            {(search || supplierId || status || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                onClick={handleReset}
                className="h-10 px-2 text-xs text-ink-muted hover:text-ink"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Purchases List */}
      {purchases.length === 0 ? (
        <Card className="p-12 text-center bg-surface border-dashed border-border/80">
          <Receipt size={48} className="mx-auto text-ink-muted mb-3 opacity-60" />
          <h3 className="text-lg font-semibold text-ink">No purchase bills found</h3>
          <p className="text-sm text-ink-muted max-w-md mx-auto mt-1 mb-5">
            {search || supplierId || status || dateFrom || dateTo
              ? "Try adjusting your search filters to find what you are looking for."
              : "Record your first wholesale bill to begin tracking stock and purchase prices."}
          </p>
          <Link href="/admin/purchases/new">
            <Button variant="turmeric" className="gap-2 font-medium">
              <Plus size={18} weight="bold" />
              Record wholesale purchase
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-page/60 hover:bg-page/60">
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[140px]">Bill No.</TableHead>
                  <TableHead>Wholesale Store</TableHead>
                  <TableHead className="text-center w-[90px]">Items</TableHead>
                  <TableHead className="text-right w-[110px]">Subtotal</TableHead>
                  <TableHead className="text-right w-[110px]">Extra Charges</TableHead>
                  <TableHead className="text-right w-[130px]">Total Paid</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="text-right w-[90px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => {
                  const isVoid = p.status === "VOIDED";
                  return (
                    <TableRow
                      key={p.id}
                      className={`hover:bg-page/40 transition-colors ${
                        isVoid ? "opacity-60 bg-page/20" : ""
                      }`}
                    >
                      <TableCell className="font-mono text-xs text-ink-muted">
                        {p.purchaseDate}
                      </TableCell>
                      <TableCell>
                        {p.invoiceNo ? (
                          <span className="font-mono text-sm font-medium text-ink">
                            {p.invoiceNo}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted italic">No bill #</span>
                        )}
                        {p.replacesId && (
                          <span className="block text-[11px] text-leaf font-medium">
                            Corrected bill
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-ink">{p.supplierName}</div>
                        {p.supplierArea && (
                          <div className="text-xs text-ink-muted">{p.supplierArea}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center bg-page px-2 py-0.5 rounded text-xs font-medium text-ink">
                          {p.itemCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-ink-muted">
                        {formatINR(p.subtotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-ink-muted">
                        {p.extraCharges > 0 ? formatINR(p.extraCharges) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-sm text-ink">
                        {formatINR(p.total)}
                      </TableCell>
                      <TableCell>
                        {isVoid ? (
                          <Badge variant="outline" className="text-red border-red/40 bg-red/5 gap-1">
                            <WarningCircle size={12} weight="bold" />
                            Voided
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-leaf border-leaf/40 bg-leaf/5 gap-1">
                            <CheckCircle size={12} weight="bold" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/purchases/${p.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs">
                            <Eye size={16} />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Stacked Cards View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {purchases.map((p) => {
              const isVoid = p.status === "VOIDED";
              return (
                <Card
                  key={p.id}
                  className={`p-4 bg-surface border-border/90 shadow-xs space-y-3 ${
                    isVoid ? "opacity-60 bg-page/20" : ""
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink text-base">
                          {p.supplierName}
                        </span>
                        {isVoid ? (
                          <Badge variant="outline" className="text-red border-red/30 bg-red/5 text-[10px] px-1.5 py-0">
                            Voided
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-leaf border-leaf/30 bg-leaf/5 text-[10px] px-1.5 py-0">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-ink-muted flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{p.purchaseDate}</span>
                        {p.invoiceNo && (
                          <>
                            <span>•</span>
                            <span className="font-mono font-medium">{p.invoiceNo}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-ink">
                        {formatINR(p.total)}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {p.itemCount} {p.itemCount === 1 ? "item" : "items"}
                      </div>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="flex justify-between items-center pt-2 border-t border-border/60 text-xs">
                    <span className="text-ink-muted">
                      Extra charges: {p.extraCharges > 0 ? formatINR(p.extraCharges) : "₹0"}
                    </span>
                    <Link href={`/admin/purchases/${p.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs text-leaf font-medium">
                        View details
                        <ArrowRight size={14} />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-ink-muted px-1">
              <div>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total bills)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", String(pagination.page - 1));
                    router.push(`/admin/purchases?${params.toString()}`);
                  }}
                  className="h-8 px-3"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", String(pagination.page + 1));
                    router.push(`/admin/purchases?${params.toString()}`);
                  }}
                  className="h-8 px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
