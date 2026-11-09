import { getPurchases } from "@/server/admin/purchases";
import { getSuppliers } from "@/server/admin/suppliers";
import { PurchaseListTable } from "./PurchaseListTable";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    supplierId?: string;
    status?: "ACTIVE" | "VOIDED";
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

export const metadata = {
  title: "Wholesale Purchases — Pandian Store Admin",
};

export default async function PurchasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const [purchasesData, suppliers] = await Promise.all([
    getPurchases({
      search: params.search,
      supplierId: params.supplierId,
      status: params.status,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      page,
      limit: 20,
    }),
    getSuppliers(),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PurchaseListTable
        purchases={purchasesData.purchases}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        pagination={purchasesData.pagination}
        currentFilters={{
          search: params.search,
          supplierId: params.supplierId,
          status: params.status,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        }}
      />
    </div>
  );
}
