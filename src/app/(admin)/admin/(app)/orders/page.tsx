import React from "react";
import { getAdminOrders } from "@/server/admin/orders";
import { OrdersManager } from "./OrdersManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orders | Pandian Store Admin",
};

interface OrdersPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    fulfilment?: string;
    page?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;

  const data = await getAdminOrders({
    status: "ALL",
    query: params.q || "",
    fulfilment: "ALL",
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-heading">
          Customer orders
        </h1>
        <p className="text-xs text-muted">
          Review incoming requests, pack items, and mark ready for delivery or pickup.
        </p>
      </div>

      <OrdersManager
        initialData={data}
        currentStatus={params.status || "ALL"}
        currentQuery={params.q || ""}
        currentFulfilment={params.fulfilment || "ALL"}
      />
    </div>
  );
}
