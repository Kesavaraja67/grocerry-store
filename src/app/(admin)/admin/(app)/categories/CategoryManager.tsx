"use client";

import React, { useState } from "react";
import {
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  reorderCategory,
} from "@/server/admin/categories";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  PencilSimple,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import { CategoryIcon, AVAILABLE_CATEGORY_ICONS } from "@/components/shared/CategoryIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  iconKey: string;
  tint: string | null;
  sortOrder: number;
  lowMarkup: number;
  recommendedMarkup: number;
  highMarkup: number;
  isActive: boolean;
  activeProductCount: number;
}

interface CategoryManagerProps {
  initialCategories: CategoryItem[];
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState("grains");
  const [tint, setTint] = useState("#EBF2ED");
  const [lowMarkup, setLowMarkup] = useState(5);
  const [recommendedMarkup, setRecommendedMarkup] = useState(10);
  const [highMarkup, setHighMarkup] = useState(15);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setName("");
    setIconKey("grains");
    setTint("#EBF2ED");
    setLowMarkup(5);
    setRecommendedMarkup(10);
    setHighMarkup(15);
    setErrorMessage(null);
    setDialogOpen(true);
  };

  const openEditDialog = (c: CategoryItem) => {
    setEditingCategory(c);
    setName(c.name);
    setIconKey(c.iconKey);
    setTint(c.tint || "#EBF2ED");
    setLowMarkup(c.lowMarkup);
    setRecommendedMarkup(c.recommendedMarkup);
    setHighMarkup(c.highMarkup);
    setErrorMessage(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name,
          iconKey,
          tint,
          lowMarkup: Number(lowMarkup),
          recommendedMarkup: Number(recommendedMarkup),
          highMarkup: Number(highMarkup),
        });
        setCategories((prev) =>
          prev.map((c) =>
            c.id === editingCategory.id
              ? {
                  ...c,
                  name,
                  iconKey,
                  tint,
                  lowMarkup: Number(lowMarkup),
                  recommendedMarkup: Number(recommendedMarkup),
                  highMarkup: Number(highMarkup),
                }
              : c
          )
        );
      } else {
        const res = await createCategory({
          name,
          iconKey,
          tint,
          lowMarkup: Number(lowMarkup),
          recommendedMarkup: Number(recommendedMarkup),
          highMarkup: Number(highMarkup),
        });
        if (res.category) {
          setCategories((prev) => [
            ...prev,
            {
              id: res.category.id,
              name: res.category.name,
              slug: res.category.slug,
              iconKey: res.category.iconKey,
              tint: res.category.tint,
              sortOrder: res.category.sortOrder,
              lowMarkup: Number(res.category.lowMarkup),
              recommendedMarkup: Number(res.category.recommendedMarkup),
              highMarkup: Number(res.category.highMarkup),
              isActive: true,
              activeProductCount: 0,
            },
          ]);
        }
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save category.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (category: CategoryItem) => {
    try {
      const res = await toggleCategoryStatus(category.id);
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, isActive: res.isActive } : c))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not toggle category status.");
    }
  };

  const handleReorder = async (category: CategoryItem, direction: "up" | "down") => {
    try {
      await reorderCategory(category.id, direction);
      // Local swap for responsive UX
      const idx = categories.findIndex((c) => c.id === category.id);
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx >= 0 && targetIdx < categories.length) {
        const copyArr = [...categories];
        const temp = copyArr[idx];
        copyArr[idx] = copyArr[targetIdx];
        copyArr[targetIdx] = temp;
        setCategories(copyArr);
      }
    } catch {
      // Re-fetch or ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="turmeric" onClick={openCreateDialog} className="gap-1.5 font-semibold">
          <Plus size={18} weight="bold" />
          <span>Add category</span>
        </Button>
      </div>

      <div className="space-y-2.5">
        {categories.map((c, idx) => (
          <Card key={c.id} className="overflow-hidden">
            <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-border"
                  style={{ backgroundColor: c.tint || "#EBF2ED" }}
                >
                  <CategoryIcon iconKey={c.iconKey} size={22} className="text-leaf" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm sm:text-base text-ink truncate">
                      {c.name}
                    </h3>
                    {!c.isActive && (
                      <Badge variant="muted">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted truncate">
                    {c.activeProductCount} active {c.activeProductCount === 1 ? "product" : "products"} · Markups: {c.lowMarkup}% / {c.recommendedMarkup}% / {c.highMarkup}%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="iconSm"
                  disabled={idx === 0}
                  onClick={() => handleReorder(c, "up")}
                  title="Move category up"
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="iconSm"
                  disabled={idx === categories.length - 1}
                  onClick={() => handleReorder(c, "down")}
                  title="Move category down"
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(c)}
                  className="gap-1 h-9"
                >
                  <PencilSimple size={14} />
                  <span>Edit</span>
                </Button>
                <Button
                  type="button"
                  variant={c.isActive ? "ghost" : "secondary"}
                  size="sm"
                  onClick={() => handleToggleStatus(c)}
                  className={c.isActive ? "text-muted hover:text-red h-9" : "h-9"}
                >
                  {c.isActive ? (
                    <span className="text-xs">Deactivate</span>
                  ) : (
                    <span className="text-xs text-leaf font-semibold">Activate</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add / Edit Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit category" : "Add new category"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-2.5 rounded bg-red-light text-red text-xs font-medium border border-[#FAD2CF]">
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Category name *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rice and Grains"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Category icon *</label>
              <div className="grid grid-cols-3 gap-2">
                {AVAILABLE_CATEGORY_ICONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setIconKey(item.key)}
                    className={`flex items-center gap-2 p-2 rounded-md border text-xs transition-all ${
                      iconKey === item.key
                        ? "border-leaf bg-leaf-light font-semibold text-leaf"
                        : "border-border bg-surface text-ink hover:bg-page"
                    }`}
                  >
                    <CategoryIcon iconKey={item.key} size={18} />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Tile background tint (Hex)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={tint}
                  onChange={(e) => setTint(e.target.value)}
                  className="w-10 h-10 rounded border border-border cursor-pointer p-0.5 bg-surface"
                />
                <Input
                  value={tint}
                  onChange={(e) => setTint(e.target.value)}
                  placeholder="#EBF2ED"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <h4 className="text-xs font-bold text-ink mb-2">Default Markup Starting Points (%)</h4>
              <p className="text-[11px] text-muted mb-3">
                Used to automatically suggest Low, Recommended, and High selling prices when recording wholesale purchases.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Low (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    required
                    value={lowMarkup}
                    onChange={(e) => setLowMarkup(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-leaf">Recommended (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    required
                    value={recommendedMarkup}
                    onChange={(e) => setRecommendedMarkup(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">High (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    required
                    value={highMarkup}
                    onChange={(e) => setHighMarkup(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={loading}>
                {loading ? "Saving..." : editingCategory ? "Save changes" : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
