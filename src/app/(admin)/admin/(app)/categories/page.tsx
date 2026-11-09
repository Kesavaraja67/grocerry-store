import React from "react";
import { getCategories } from "@/server/admin/categories";
import { CategoryManager } from "./CategoryManager";

export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
          Categories & Markup Defaults
        </h1>
        <p className="text-xs text-muted">
          Manage product categories, visual icon tints, and default profit markup starting points.
        </p>
      </div>

      <CategoryManager initialCategories={categories} />
    </div>
  );
}

