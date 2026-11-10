"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Storefront,
  Phone,
  MapPin,
  MagnifyingGlass,
  ArrowRight,
  PencilSimple,
  Archive,
} from "@phosphor-icons/react";
import { createSupplier, updateSupplier, toggleArchiveSupplier } from "@/server/admin/suppliers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatDate } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SupplierItem {
  id: string;
  name: string;
  phone: string | null;
  area: string | null;
  address: string | null;
  notes: string | null;
  isArchived: boolean;
  purchaseCount: number;
  totalSpent: number;
  lastPurchaseDate: Date | null;
}

interface SupplierListProps {
  initialSuppliers: SupplierItem[];
  initialSearch: string;
}

export function SupplierList({ initialSuppliers, initialSearch }: SupplierListProps) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers);
  const [search, setSearch] = useState(initialSearch);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [justCreatedSupplier, setJustCreatedSupplier] = useState<{ id: string; name: string } | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openCreateDialog = () => {
    setEditingSupplier(null);
    setName("");
    setPhone("");
    setArea("");
    setAddress("");
    setNotes("");
    setErrorMessage(null);
    setDialogOpen(true);
  };

  const openEditDialog = (s: SupplierItem) => {
    setEditingSupplier(s);
    setName(s.name);
    setPhone(s.phone || "");
    setArea(s.area || "");
    setAddress(s.address || "");
    setNotes(s.notes || "");
    setErrorMessage(null);
    setDialogOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/admin/suppliers?q=${encodeURIComponent(search)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, {
          name,
          phone: phone || null,
          area: area || null,
          address: address || null,
          notes: notes || null,
        });
        setSuppliers((prev) =>
          prev.map((s) =>
            s.id === editingSupplier.id
              ? {
                  ...s,
                  name,
                  phone: phone || null,
                  area: area || null,
                  address: address || null,
                  notes: notes || null,
                }
              : s
          )
        );
      } else {
        const res = await createSupplier({
          name,
          phone: phone || null,
          area: area || null,
          address: address || null,
          notes: notes || null,
        });
        if (res.supplier) {
          setSuppliers((prev) => [
            {
              ...res.supplier,
              purchaseCount: 0,
              totalSpent: 0,
              lastPurchaseDate: null,
            },
            ...prev,
          ]);
          setJustCreatedSupplier({ id: res.supplier.id, name: res.supplier.name });
        }
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save wholesale store.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (s: SupplierItem) => {
    if (!confirm(`Are you sure you want to archive "${s.name}"?`)) return;

    try {
      const res = await toggleArchiveSupplier(s.id);
      setSuppliers((prev) => prev.filter((item) => item.id !== s.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to archive wholesale store.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Post-Create Shortcut Banner */}
      {justCreatedSupplier && (
        <div className="p-3.5 rounded-lg border border-leaf/30 bg-leaf-light flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-ink">
            <span className="font-bold text-leaf">&ldquo;{justCreatedSupplier.name}&rdquo;</span> added to your wholesale stores!{" "}
            <span className="text-ink-muted">Want to record products bought from them now?</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/admin/purchases/new?supplierId=${justCreatedSupplier.id}`}>
              <Button variant="turmeric" size="sm" className="gap-1.5 font-semibold text-xs">
                <Plus size={14} weight="bold" />
                <span>Add items &amp; bill for this store</span>
              </Button>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setJustCreatedSupplier(null)}
              className="text-xs text-muted"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wholesale store name..."
            className="pl-9 h-11"
          />
          <MagnifyingGlass size={16} className="absolute left-3 top-3.5 text-muted pointer-events-none" />
        </form>

        <Button variant="turmeric" onClick={openCreateDialog} className="gap-1.5 font-semibold shrink-0">
          <Plus size={18} weight="bold" />
          <span>Add wholesale store</span>
        </Button>
      </div>

      {/* Suppliers Grid / Cards */}
      {suppliers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold text-ink">No wholesale stores found</p>
          <p className="text-xs text-muted mt-1">
            Add wholesale stores where you purchase rice, pulses, oils, or packaged items.
          </p>
          <Button variant="turmeric" onClick={openCreateDialog} className="mt-4">
            Add your first wholesale store
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {suppliers.map((s) => (
            <Card key={s.id} className="hover:border-leaf/40 transition-colors flex flex-col justify-between">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/suppliers/${s.id}`}
                      className="font-bold text-base text-ink hover:text-leaf transition-colors line-clamp-1"
                    >
                      {s.name}
                    </Link>
                    {s.area && (
                      <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{s.area}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {s.purchaseCount} {s.purchaseCount === 1 ? "bill" : "bills"}
                  </Badge>
                </div>

                {s.phone && (
                  <p className="text-xs text-muted flex items-center gap-1.5">
                    <Phone size={14} className="text-leaf" />
                    <span>{s.phone}</span>
                  </p>
                )}

                <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted block text-[11px]">Total spent</span>
                    <span className="font-bold text-ink tabular-nums privacy-figure">
                      {formatINR(s.totalSpent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Last purchase</span>
                    <span className="font-medium text-ink tabular-nums">
                      {s.lastPurchaseDate ? formatDate(s.lastPurchaseDate) : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>

              <div className="p-3 bg-page/60 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(s)}
                    className="h-8 px-2 text-muted hover:text-ink"
                  >
                    <PencilSimple size={14} />
                    <span>Edit</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(s)}
                    className="h-8 px-2 text-muted hover:text-red"
                  >
                    <Archive size={14} />
                    <span>Archive</span>
                  </Button>
                </div>

                <Link
                  href={`/admin/suppliers/${s.id}`}
                  className="font-semibold text-leaf hover:underline flex items-center gap-1"
                >
                  <span>View history</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Supplier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit wholesale store" : "Add wholesale store"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-2.5 rounded bg-red-light text-red text-xs font-medium border border-[#FAD2CF]">
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Store / Trader name *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sri Murugan Wholesale Mandi"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Phone number <span className="font-normal text-muted">(optional)</span>
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Market area <span className="font-normal text-muted">(optional)</span>
                </label>
                <Input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Main Market Area"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Full address <span className="font-normal text-muted">(optional)</span>
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop no, street, market complex..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Notes <span className="font-normal text-muted">(optional)</span>
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Items usually purchased here, payment terms..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={loading}>
                {loading ? "Saving..." : editingSupplier ? "Save changes" : "Add store"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

