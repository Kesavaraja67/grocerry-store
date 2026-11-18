import React from "react";
import { notFound } from "next/navigation";
import { getSupplierProfile } from "@/server/admin/suppliers";
import { ShopDetailView } from "./ShopDetailView";

export const dynamic = "force-dynamic";

interface ShopDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ShopDetailPage({ params }: ShopDetailPageProps) {
  const resolvedParams = await params;

  try {
    const profile = await getSupplierProfile(resolvedParams.id);
    if (!profile) {
      notFound();
    }

    return <ShopDetailView profile={profile} />;
  } catch (err) {
    notFound();
  }
}

