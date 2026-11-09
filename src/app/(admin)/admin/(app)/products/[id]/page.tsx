import React from "react";
import { notFound } from "next/navigation";
import { getProductById } from "@/server/admin/products";
import { ProductDetailView } from "./ProductDetailView";

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const product = await getProductById(id);
    return <ProductDetailView product={product} />;
  } catch {
    notFound();
  }
}

