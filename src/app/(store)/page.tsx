import React from "react";
import Link from "next/link";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { copy } from "@/lib/copy";
import { shopSeedConfig } from "../../../config/shop.seed";

export default function StorefrontHomePage() {
  const categories = [
    { name: "Rice & Grains", slug: "rice-and-grains", iconKey: "grains", tint: "#EBF2ED" },
    { name: "Pulses & Dals", slug: "pulses-and-dals", iconKey: "pulses", tint: "#FDF6E9" },
    { name: "Oils & Ghee", slug: "oils-and-ghee", iconKey: "oils", tint: "#FEF9E7" },
    { name: "Spices & Masala", slug: "spices-and-masala", iconKey: "spices", tint: "#FBEFEF" },
    { name: "Snacks & Biscuits", slug: "snacks-and-biscuits", iconKey: "snacks", tint: "#F8F3EA" },
    { name: "Tea & Beverages", slug: "tea-coffee-beverages", iconKey: "beverages", tint: "#F3EFEA" },
    { name: "Dairy & Eggs", slug: "dairy-and-eggs", iconKey: "dairy", tint: "#F5F9F6" },
    { name: "Household Care", slug: "household-and-personal-care", iconKey: "household", tint: "#EBF1F5" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* 1. Shop notes band (Section 11) */}
      <div className="bg-surface rounded-lg p-3.5 sm:p-4 border border-border shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
          <span className="font-medium text-ink">Accepting orders</span>
          <span className="text-muted">· {shopSeedConfig.hoursText}</span>
        </div>
        <div className="flex items-center gap-4 text-muted">
          <span>Min order: ₹{shopSeedConfig.minOrderAmount}</span>
          <span>Delivery within 3 km</span>
        </div>
      </div>

      {/* 2. Shop by Category (Section 11) */}
      <section id="categories" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-ink">
            Shop by category
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/c/${cat.slug}`}
              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg border border-border hover:border-leaf/40 hover:shadow-xs transition-all text-center group"
              style={{ backgroundColor: cat.tint }}
            >
              <div className="w-12 h-12 rounded-full bg-surface/80 flex items-center justify-center text-leaf group-hover:scale-105 transition-transform mb-2">
                <CategoryIcon iconKey={cat.iconKey} size={26} weight="regular" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-ink line-clamp-2">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Welcome / Shop Banner */}
      <section className="bg-leaf text-white rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {copy.shop.name}
          </h1>
          <p className="text-sm sm:text-base text-white/80 leading-relaxed font-tamil">
            உயர்தர அரிசி, பருப்பு வகைகள், நல்லெண்ணெய், சமையல் மளிகைப் பொருட்கள் நியாயமான விலையில் உங்கள் இல்லம் தேடி வரும்.
          </p>
          <p className="text-xs text-white/70">
            Order groceries online from home. Fast delivery across town or convenient shop pickup. Pay on delivery by cash or UPI.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/search"
            className="bg-turmeric text-ink font-semibold px-5 py-2.5 rounded-md hover:bg-turmeric-hover transition-colors text-sm min-h-[44px] flex items-center justify-center"
          >
            Browse all items
          </Link>
        </div>
      </section>
    </div>
  );
}
