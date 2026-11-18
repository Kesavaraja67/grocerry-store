import React from "react";
import { notFound } from "next/navigation";
import { getProductById } from "@/server/admin/products";
import { getCategories } from "@/server/admin/categories";
import { getUnits } from "@/server/admin/units";
import { ItemDetailView } from "./ItemDetailView";

export const dynamic = "force-dynamic";

interface ItemDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const resolvedParams = await params;

  try {
    const [product, categories, units] = await Promise.all([
      getProductById(resolvedParams.id),
      getCategories(),
      getUnits(),
    ]);

    if (!product) {
      notFound();
    }

    const simpleUnits = units.map((u) => ({
      id: u.id,
      label: u.label,
      symbol: u.symbol,
    }));

    const simpleCategories = categories.map((c) => ({
      id: c.id,
      name: c.name,
    }));

    return (
      <ItemDetailView
        product={product}
        categories={simpleCategories}
        units={simpleUnits}
      />
    );
  } catch (err) {
    notFound();
  }
}

