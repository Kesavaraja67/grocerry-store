import React from "react";
import { getSuppliers } from "@/server/admin/suppliers";
import { SupplierList } from "./SupplierList";

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const suppliers = await getSuppliers(q);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Wholesale Stores
          </h1>
          <p className="text-xs text-muted">
            Track where you buy your stock, see purchase history, and compare prices across wholesale stores.
          </p>
        </div>
      </div>

      <SupplierList initialSuppliers={suppliers} initialSearch={q || ""} />
    </div>
  );
}
