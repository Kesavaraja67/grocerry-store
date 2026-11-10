import React from "react";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/server/public/products";
import { ProductDetailClient } from "./ProductDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found — Pandian Store" };

  return {
    title: `${product.name} (${product.nameTamil || ""}) — Pandian Store Madurai`,
    description: `Buy ${product.name} online at Pandian Store Madurai. ${
      product.description || "Fresh and pure groceries delivered to your home."
    }`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // JSON-LD structured data for SEO (Section 15)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.imageUrl || undefined,
    description: product.description || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.sellingPrice,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "GroceryStore",
        name: "Pandian Store",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <ProductDetailClient product={product} />
      </div>
    </>
  );
}

