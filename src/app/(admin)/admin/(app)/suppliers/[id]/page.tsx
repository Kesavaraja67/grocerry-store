import React from "react";
import { notFound } from "next/navigation";
import { getSupplierProfile } from "@/server/admin/suppliers";
import { SupplierProfileView } from "./SupplierProfileView";

export default async function AdminSupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const profile = await getSupplierProfile(id);
    return <SupplierProfileView profile={profile} />;
  } catch {
    notFound();
  }
}

