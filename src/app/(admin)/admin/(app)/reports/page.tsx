import { getReportsData } from "@/server/admin/reports";
import { ReportsView } from "./ReportsView";

export const metadata = {
  title: "Reports & Analytics — Pandian Store Admin",
};

export default async function ReportsPage() {
  const data = await getReportsData();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <ReportsView data={data} />
    </div>
  );
}

