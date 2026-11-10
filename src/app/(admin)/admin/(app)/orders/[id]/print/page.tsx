import React from "react";
import { notFound } from "next/navigation";
import { getAdminOrderById } from "@/server/admin/orders";
import { getShopSettings } from "@/server/admin/settings";
import { OrderSlipPrintView } from "./OrderSlipPrintView";

export const metadata = {
  title: "Order Slip | Pandian Store",
};

interface OrderSlipPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderSlipPage({ params }: OrderSlipPageProps) {
  const { id } = await params;
  const [order, settings] = await Promise.all([
    getAdminOrderById(id),
    getShopSettings(),
  ]);

  if (!order) {
    notFound();
  }

  return <OrderSlipPrintView order={order} settings={settings} />;
}

