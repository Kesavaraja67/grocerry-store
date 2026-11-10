"use client";

import React from "react";
import {
  Grains,
  Plant,
  Drop,
  Pepper,
  Cookie,
  Coffee,
  Egg,
  Broom,
  ShoppingBag,
  Package,
  Basket,
  IconProps,
} from "@phosphor-icons/react";

export type CategoryIconKey =
  | "grains"
  | "pulses"
  | "oils"
  | "spices"
  | "snacks"
  | "beverages"
  | "dairy"
  | "household"
  | "default";

const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  grains: Grains,
  pulses: Plant,
  oils: Drop,
  spices: Pepper,
  snacks: Cookie,
  beverages: Coffee,
  dairy: Egg,
  household: Broom,
  package: Package,
  basket: Basket,
  default: ShoppingBag,
};

interface CategoryIconProps extends IconProps {
  iconKey?: string | null;
  className?: string;
  size?: number | string;
}

export function CategoryIcon({
  iconKey,
  size = 24,
  weight = "regular",
  className,
  ...props
}: CategoryIconProps) {
  const normalizedKey = (iconKey || "default").toLowerCase().trim();
  const IconComponent = ICON_MAP[normalizedKey] || ICON_MAP.default;

  return <IconComponent size={size} weight={weight} className={className} {...props} />;
}

export const AVAILABLE_CATEGORY_ICONS = [
  { key: "grains", label: "Rice & Grains", component: Grains },
  { key: "pulses", label: "Pulses & Dals", component: Plant },
  { key: "oils", label: "Oils & Ghee", component: Drop },
  { key: "spices", label: "Spices & Masala", component: Pepper },
  { key: "snacks", label: "Snacks & Biscuits", component: Cookie },
  { key: "beverages", label: "Tea & Beverages", component: Coffee },
  { key: "dairy", label: "Dairy & Eggs", component: Egg },
  { key: "household", label: "Household & Cleaning", component: Broom },
  { key: "basket", label: "General Groceries", component: Basket },
];

