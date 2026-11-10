import React from "react";
import { notFound } from "next/navigation";
import { getAdminOrderById, getOrderWhatsAppUrl } from "@/server/admin/orders";
import { OrderDetailView } from "./OrderDetailView";

export const metadata = {
  title: "Order Details | Pandian Store Admin",
};

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const order = await getAdminOrderById(id);

  if (!order) {
    notFound();
  }

  const whatsAppUrl = await getOrderWhatsAppUrl(order.id);

  return <OrderDetailView order={order} whatsAppUrl={whatsAppUrl} />;
}
