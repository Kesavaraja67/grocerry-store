import React from "react";
import { getAdminOrders } from "@/server/admin/orders";
import { OrdersManager } from "./OrdersManager";
import { OrderStatus, FulfilmentType } from "@/server/domain/orders";

export const metadata = {
  title: "Order Management | Pandian Store Admin",
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

  const status = (params.status as OrderStatus | "ALL") || "ALL";
  const query = params.q || "";
  const fulfilment = (params.fulfilment as FulfilmentType | "ALL") || "ALL";
  const page = parseInt(params.page || "1", 10) || 1;

  const data = await getAdminOrders({
    status,
    query,
    fulfilment,
    page,
    pageSize: 30,
  });

  return (
    <OrdersManager
      initialData={data}
      currentStatus={status}
      currentQuery={query}
      currentFulfilment={fulfilment}
    />
  );
}

