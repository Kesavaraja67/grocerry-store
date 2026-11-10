import { notFound } from "next/navigation";
import { getPurchaseById } from "@/server/admin/purchases";
import { PurchaseDetailView } from "./PurchaseDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const purchase = await getPurchaseById(id);
  if (!purchase) {
    return { title: "Purchase Not Found — Pandian Store Admin" };
  }
  return {
    title: `Bill ${purchase.invoiceNo || purchase.id} — Pandian Store Admin`,
  };
}

export default async function PurchaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const purchase = await getPurchaseById(id);

  if (!purchase) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <PurchaseDetailView purchase={purchase} />
    </div>
  );
}

