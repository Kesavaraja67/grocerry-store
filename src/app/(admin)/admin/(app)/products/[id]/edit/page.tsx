import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getProductById } from "@/server/admin/products";
import { getCategories } from "@/server/admin/categories";
import { getBaseUnits } from "@/server/admin/units";
import { ProductForm } from "../../ProductForm";

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const [product, categories, baseUnits] = await Promise.all([
      getProductById(id),
      getCategories(),
      getBaseUnits(),
    ]);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/products/${product.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink font-medium"
          >
            <ArrowLeft size={16} />
            <span>Back to {product.name}</span>
          </Link>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Edit product: {product.name}
          </h1>
          <p className="text-xs text-muted">
            Update product details, selling price, units, or images.
          </p>
        </div>

        <ProductForm
          categories={categories}
          baseUnits={baseUnits}
          initialData={{
            id: product.id,
            name: product.name,
            nameTamil: product.nameTamil,
            brand: product.brand,
            description: product.description,
            sizeLabel: product.sizeLabel,
            categoryId: product.categoryId,
            baseUnitId: product.baseUnitId,
            sellStep: product.sellStep,
            minQty: product.minQty,
            maxQty: product.maxQty,
            sellingPrice: product.sellingPrice,
            mrp: product.mrp,
            lowStockAt: product.lowStockAt,
            isPublished: product.isPublished,
            isFeatured: product.isFeatured,
            cost: product.cost,
            images: product.images,
          }}
        />
      </div>
    );
  } catch {
    notFound();
  }
}

