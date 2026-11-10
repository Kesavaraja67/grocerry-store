import React from "react";
import Link from "next/link";
import {
  Sparkle,
  Truck,
  Storefront,
  ShieldCheck,
  WhatsappLogo,
  ArrowRight,
  Package,
} from "@phosphor-icons/react/dist/ssr";
import { getFeaturedProducts, getStapleProducts } from "@/server/public/products";
import { getPublicCategories } from "@/server/public/categories";
import { ProductCard } from "@/components/store/ProductCard";
import { CategoryStrip } from "@/components/store/CategoryStrip";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { prisma } from "@/server/db";

export const metadata = {
  title: "Pandian Store — Fresh Groceries Delivered in Madurai",
  description:
    "Order quality dal, rice, cooking oils, spices, and daily household groceries for home delivery or store pickup in Madurai.",
};

export default async function StoreHomePage() {
  const [categories, featuredProducts, stapleProducts, shopSettings] =
    await Promise.all([
      getPublicCategories(),
      getFeaturedProducts(8),
      getStapleProducts(12),
      prisma.shopSettings.findFirst({ where: { id: 1 } }),
    ]);

  const isAccepting = shopSettings ? shopSettings.acceptingOrders : true;

  return (
    <div className="space-y-8">
      {/* Category Strip */}
      <CategoryStrip categories={categories} />

      {/* Hero Welcome Banner */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-leaf-dark via-leaf to-leaf p-6 sm:p-10 text-white shadow-sm">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-turmeric/20 px-3 py-1 text-xs font-bold text-turmeric border border-turmeric/30">
              <Sparkle size={14} weight="fill" />
              <span>மதுரையின் குடும்ப மளிகை கடை</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-heading leading-tight">
              Fresh, Quality Groceries at Wholesale-Fair Prices
            </h1>

            <p className="text-sm sm:text-base text-white/85 leading-relaxed">
              Order your monthly provisions, premium dals, Ponni rice, wood-pressed oils, and spices.
              Fast home delivery across Madurai or pick up ready bags at our store.
            </p>

            {/* Shop Order Status */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {isAccepting ? (
                <div className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-xs">
                  <span className="h-2 w-2 rounded-full bg-turmeric animate-pulse" />
                  <span>Taking orders now · Delivery today</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-md bg-turmeric text-ink px-3 py-1.5 text-xs font-bold">
                  <span>Shop is currently closed for new orders. Opening soon!</span>
                </div>
              )}

              <a
                href="#categories"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-turmeric transition-colors ml-1"
              >
                <span>Browse categories</span>
                <ArrowRight size={14} weight="bold" />
              </a>
            </div>
          </div>

          {/* Decorative Background Pattern */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none hidden lg:flex items-center justify-center">
            <Storefront size={280} weight="thin" />
          </div>
        </div>
      </section>

      {/* Trust Badges Bar */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-border shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-turmeric/20 text-leaf flex items-center justify-center shrink-0">
              <Truck size={20} weight="bold" />
            </div>
            <div>
              <div className="text-xs font-bold text-ink">Free Home Delivery</div>
              <div className="text-[11px] text-ink-muted">On all Madurai orders above ₹500</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-border shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-leaf/10 text-leaf flex items-center justify-center shrink-0">
              <ShieldCheck size={20} weight="bold" />
            </div>
            <div>
              <div className="text-xs font-bold text-ink">Clean & Unadulterated</div>
              <div className="text-[11px] text-ink-muted">Hand-checked pulses, grains & spices</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-border shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-turmeric/20 text-ink flex items-center justify-center shrink-0">
              <Storefront size={20} weight="bold" />
            </div>
            <div>
              <div className="text-xs font-bold text-ink">Store Pickup Ready</div>
              <div className="text-[11px] text-ink-muted">Skip the queue — packed and waiting</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid Section */}
      <section id="categories" className="max-w-7xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-heading text-ink">
              Shop by Category
            </h2>
            <p className="text-xs text-ink-muted">
              Choose from our complete grocery sections
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.slug}`}
              className="group flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-surface hover:border-leaf/50 hover:shadow-xs transition-all text-center"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: c.tint || "#EBF2ED" }}
              >
                <CategoryIcon iconKey={c.iconKey} size={24} className="text-leaf" />
              </div>
              <span className="font-semibold text-xs text-ink group-hover:text-leaf transition-colors line-clamp-1">
                {c.name}
              </span>
              <span className="text-[10px] text-ink-muted mt-0.5">
                {c.productCount} {c.productCount === 1 ? "item" : "items"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Carousel / Grid */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-leaf uppercase tracking-wider">
                <Sparkle size={12} weight="fill" />
                Special Picks
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-heading text-ink">
                Featured Groceries
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Daily Staples Grid */}
      <section className="max-w-7xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-heading text-ink">
              Daily Kitchen Staples (அத்தியாவசிய பொருட்கள்)
            </h2>
            <p className="text-xs text-ink-muted">
              Pappu, ponni rice, gingelly oil, mustard, chili & spices
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {stapleProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* WhatsApp Grocery List Helper Banner */}
      <section className="max-w-7xl mx-auto px-4 pb-4">
        <div className="rounded-2xl border border-border bg-turmeric/10 p-5 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
              <WhatsappLogo size={28} weight="fill" />
            </div>
            <div>
              <h3 className="font-bold text-base text-ink">
                Prefer to send your grocery list on WhatsApp?
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Take a photo of your handwritten paper list or send a voice note. We will pack it for you!
              </p>
            </div>
          </div>

          {shopSettings?.whatsapp && (
            <a
              href={`https://wa.me/${shopSettings.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                "வணக்கம் பாண்டியா ஸ்டோர்! மளிகை பட்டியல் அனுப்ப விரும்புகிறேன்."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs active:scale-95"
            >
              <WhatsappLogo size={18} weight="fill" />
              <span>Send Grocery List</span>
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
