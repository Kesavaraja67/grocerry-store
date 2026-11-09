import React from "react";
import Link from "next/link";
import {
  House,
  SquaresFour,
  ShoppingCartSimple,
  ClockCounterClockwise,
  Phone,
  WhatsappLogo,
  MagnifyingGlass,
  MapPin,
  Clock,
} from "@phosphor-icons/react/dist/ssr";
import { copy } from "@/lib/copy";
import { shopSeedConfig } from "../../../config/shop.seed";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-page">
      {/* 1. Desktop Top Utility Strip */}
      <header className="hidden md:block bg-leaf-hover text-white/90 text-xs py-2 px-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-turmeric" />
              <span>{shopSeedConfig.hoursText}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-turmeric" />
              <span>{shopSeedConfig.deliveryNote}</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`tel:${shopSeedConfig.phone.replace(/[^0-9+]/g, "")}`}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone size={14} className="text-turmeric" />
              <span>{shopSeedConfig.phone}</span>
            </a>
            <Link
              href="/admin/login"
              className="text-white/60 hover:text-white/90 transition-colors ml-2 text-[11px]"
            >
              Owner Portal
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Desktop Main Bar */}
      <div className="sticky top-0 z-40 bg-leaf text-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo / Wordmark */}
          <Link href="/" className="flex flex-col shrink-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {copy.shop.name}
            </span>
            <span className="text-[10px] sm:text-xs text-white/70 -mt-1 font-tamil">
              பாண்டியன் ஸ்டோர்
            </span>
          </Link>

          {/* Large Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4">
            <form action="/search" method="GET" className="relative w-full">
              <input
                type="text"
                name="q"
                placeholder={copy.storefront.searchPlaceholder}
                className="w-full h-11 pl-4 pr-11 rounded-md bg-surface text-ink placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-turmeric transition-all"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-1 top-1 h-9 w-9 bg-turmeric text-ink rounded-md flex items-center justify-center hover:bg-turmeric-hover transition-colors"
              >
                <MagnifyingGlass size={18} weight="bold" />
              </button>
            </form>
          </div>

          {/* Quick Links & Cart */}
          <div className="flex items-center gap-3">
            <Link
              href="/track"
              className="hidden lg:flex items-center gap-1.5 text-xs text-white/90 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <ClockCounterClockwise size={16} />
              <span>Track order</span>
            </Link>

            <Link
              href="/cart"
              className="flex items-center gap-2 bg-turmeric text-ink px-3.5 py-2 rounded-md font-semibold text-sm hover:bg-turmeric-hover transition-colors min-h-[44px]"
            >
              <ShoppingCartSimple size={20} weight="bold" />
              <span className="hidden sm:inline">Cart</span>
            </Link>
          </div>
        </div>

        {/* Mobile Sticky Search Field */}
        <div className="md:hidden px-3 pb-2.5">
          <form action="/search" method="GET" className="relative w-full">
            <input
              type="text"
              name="q"
              placeholder="Search groceries..."
              className="w-full h-10 pl-3.5 pr-10 rounded-md bg-surface text-ink placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-turmeric"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-1 top-1 h-8 w-8 bg-turmeric text-ink rounded flex items-center justify-center"
            >
              <MagnifyingGlass size={16} weight="bold" />
            </button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-12">{children}</main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border mt-auto pt-8 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted">
          <div>
            <h4 className="font-semibold text-ink text-base mb-2">{copy.shop.name}</h4>
            <p className="text-xs text-muted mb-2 font-tamil">பாண்டியன் ஸ்டோர் — உங்கள் குடும்பத்துக்கான மளிகை கடை</p>
            <p className="text-xs leading-relaxed">
              {shopSeedConfig.addressLine}, {shopSeedConfig.area}, {shopSeedConfig.city} – {shopSeedConfig.pincode}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-ink mb-2">Shop hours & Delivery</h4>
            <p className="text-xs leading-relaxed mb-1">{shopSeedConfig.hoursText}</p>
            <p className="text-xs text-leaf font-medium">{shopSeedConfig.deliveryNote}</p>
          </div>
          <div>
            <h4 className="font-semibold text-ink mb-2">Need help?</h4>
            <div className="flex flex-col gap-1.5 text-xs">
              <a
                href={`tel:${shopSeedConfig.phone.replace(/[^0-9+]/g, "")}`}
                className="flex items-center gap-1.5 hover:text-ink transition-colors"
              >
                <Phone size={14} className="text-leaf" />
                <span>Call {shopSeedConfig.phone}</span>
              </a>
              {shopSeedConfig.whatsapp && (
                <a
                  href={`https://wa.me/${shopSeedConfig.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#25D366] hover:underline"
                >
                  <WhatsappLogo size={14} weight="fill" />
                  <span>WhatsApp shop</span>
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-muted gap-2">
          <p>{copy.shop.taxInclusiveNote}</p>
          <p>© {new Date().getFullYear()} Pandian Store. All rights reserved.</p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Section 11) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex items-center justify-around py-1.5 safe-area-bottom shadow-lg"
      >
        <Link
          href="/"
          className="flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] text-xs text-muted hover:text-leaf transition-colors"
        >
          <House size={20} />
          <span className="text-[11px] mt-0.5">Home</span>
        </Link>
        <Link
          href="/#categories"
          className="flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] text-xs text-muted hover:text-leaf transition-colors"
        >
          <SquaresFour size={20} />
          <span className="text-[11px] mt-0.5">Categories</span>
        </Link>
        <Link
          href="/cart"
          className="flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] text-xs text-muted hover:text-leaf transition-colors relative"
        >
          <ShoppingCartSimple size={20} />
          <span className="text-[11px] mt-0.5">Cart</span>
        </Link>
        <Link
          href="/track"
          className="flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] text-xs text-muted hover:text-leaf transition-colors"
        >
          <ClockCounterClockwise size={20} />
          <span className="text-[11px] mt-0.5">Track</span>
        </Link>
      </nav>
    </div>
  );
}

