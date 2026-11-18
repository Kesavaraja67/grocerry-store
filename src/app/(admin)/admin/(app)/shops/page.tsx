import React from "react";
import { getSuppliers } from "@/server/admin/suppliers";
import { ShopsList } from "./ShopsList";

export const dynamic = "force-dynamic";

export default async function ShopsPage() {
  const suppliers = await getSuppliers();

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-heading">
          Wholesale shops
        </h1>
        <p className="text-xs text-muted">
          Your suppliers, wholesale stores, and purchase history.
        </p>
      </div>

      <ShopsList initialShops={suppliers} />
    </div>
  );
}

