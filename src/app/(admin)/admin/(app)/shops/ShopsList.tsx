"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Storefront,
  Phone,
  Plus,
  CaretRight,
  Clock,
  MapPin,
} from "@phosphor-icons/react";
import { MicButton } from "@/components/admin/MicButton";
import { createSupplier } from "@/server/admin/suppliers";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ShopItem {
  id: string;
  name: string;
  phone: string | null;
  area: string | null;
  address: string | null;
  purchaseCount: number;
  totalSpent: number;
  lastPurchaseDate: Date | null;
}

interface ShopsListProps {
  initialShops: ShopItem[];
}

export function ShopsList({ initialShops }: ShopsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Add shop modal
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    area: "",
    address: "",
  });
  const [addError, setAddError] = useState<string | null>(null);

  const filteredShops = useMemo(() => {
    if (!search.trim()) return initialShops;
    const q = search.trim().toLowerCase();
    return initialShops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.area && s.area.toLowerCase().includes(q))
    );
  }, [initialShops, search]);

  const handleCreateShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setAddError(null);
    startTransition(async () => {
      try {
        await createSupplier({
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          area: form.area.trim() || undefined,
          address: form.address.trim() || undefined,
        });
        setAddOpen(false);
        setForm({ name: "", phone: "", area: "", address: "" });
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to add shop.";
        setAddError(msg);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top search & Add Shop button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.admin.shops.searchPlaceholder.en}
            className="w-full h-12 pl-10 pr-10 rounded-xl bg-surface border border-border text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-leaf focus:border-leaf transition-all shadow-xs"
          />
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-3.5 text-muted pointer-events-none"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <MicButton onResult={(text) => setSearch(text)} />
          </div>
        </div>

        <Button
          type="button"
          variant="default"
          onClick={() => setAddOpen(true)}
          className="h-12 px-4 rounded-xl font-bold text-xs gap-1.5 shadow-xs shrink-0 min-h-[44px]"
        >
          <Plus size={16} weight="bold" />
          <span className="hidden sm:inline">{copy.admin.shops.addShop.en}</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Shops List */}
      <div className="bg-surface border border-border rounded-2xl divide-y divide-border/70 overflow-hidden shadow-xs">
        {filteredShops.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Storefront size={36} weight="light" className="mx-auto text-muted mb-2" />
            <p className="text-sm font-semibold text-ink">No shops found</p>
            <p className="text-xs text-muted mt-1">
              {search
                ? `No wholesale shops matching "${search}".`
                : copy.admin.shops.emptyState.en}
            </p>
          </div>
        ) : (
          filteredShops.map((shop) => {
            return (
              <Link
                key={shop.id}
                href={`/admin/shops/${shop.id}`}
                className="flex items-center justify-between p-4 hover:bg-page/50 transition-colors group min-h-[64px]"
              >
                <div className="min-w-0 pr-3">
                  <p className="font-bold text-sm text-ink group-hover:text-leaf truncate">
                    {shop.name}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted">
                    {shop.phone && (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Phone size={12} />
                        <span>{shop.phone}</span>
                      </span>
                    )}

                    {shop.area && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} />
                        <span>{shop.area}</span>
                      </span>
                    )}

                    {shop.lastPurchaseDate && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        <span>
                          Visited{" "}
                          {new Date(shop.lastPurchaseDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-muted bg-page px-2 py-1 rounded-md border border-border">
                    {shop.purchaseCount} {shop.purchaseCount === 1 ? "bill" : "bills"}
                  </span>
                  <CaretRight
                    size={16}
                    className="text-muted group-hover:text-ink transition-transform group-hover:translate-x-0.5"
                  />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Add Shop Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a wholesale shop</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateShop} className="space-y-4 py-2">
            {addError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {addError}
              </p>
            )}

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Shop name
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Senthil Traders"
                required
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 9840012345"
                  className="h-11 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Area / Market
                </label>
                <Input
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="e.g. Flower Bazaar"
                  className="h-11"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Address (optional)
              </label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street address"
                className="h-11"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                className="h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={isPending || !form.name.trim()}
                className="h-11 font-bold"
              >
                {isPending ? "Adding..." : "Save shop"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
