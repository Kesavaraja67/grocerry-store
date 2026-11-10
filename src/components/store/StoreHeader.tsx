"use client";

import Link from "next/link";
import {
  ShoppingCartSimple,
  ClockCounterClockwise,
  Phone,
  WhatsappLogo,
  MapPin,
  Clock,
  House,
  SquaresFour,
} from "@phosphor-icons/react";
import { useCart } from "@/context/CartContext";
import { StoreSearchInput } from "./StoreSearchInput";
import { copy } from "@/lib/copy";

interface Props {
  shopSettings: {
    shopName: string;
    phone: string;
    whatsapp: string | null;
    hoursText: string;
    deliveryNote: string | null;
    isAcceptingOrders: boolean;
  };
}

export function StoreHeader({ shopSettings }: Props) {
  const { itemCount } = useCart();

  return (
    <>
      {/* 1. Desktop Top Utility Strip */}
      <header className="hidden md:block bg-leaf-hover text-white/90 text-xs py-2 px-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-turmeric" />
              <span>{shopSettings.hoursText}</span>
            </span>
            {shopSettings.deliveryNote && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-turmeric" />
                <span>{shopSettings.deliveryNote}</span>
              </span>
            )}
            {!shopSettings.isAcceptingOrders && (
              <span className="bg-turmeric text-ink font-bold px-2 py-0.5 rounded text-[11px]">
                Currently not accepting new orders
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`tel:${shopSettings.phone.replace(/[^0-9+]/g, "")}`}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone size={14} className="text-turmeric" />
              <span>{shopSettings.phone}</span>
            </a>
            {shopSettings.whatsapp && (
              <a
                href={`https://wa.me/${shopSettings.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[#25D366] hover:underline"
              >
                <WhatsappLogo size={15} weight="fill" />
                <span>WhatsApp shop</span>
              </a>
            )}
            <Link
              href="/admin/login"
              className="text-white/60 hover:text-white/90 transition-colors ml-2 text-[11px]"
            >
              Owner Portal
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Storefront Navbar */}
      <div className="sticky top-0 z-40 bg-leaf text-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex flex-col shrink-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-heading">
              {shopSettings.shopName}
            </span>
            <span className="text-[10px] sm:text-xs text-white/70 -mt-1 font-tamil">
              பாண்டியன் ஸ்டோர்
            </span>
          </Link>

          {/* Desktop Search Bar with Live Suggestions */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4">
            <StoreSearchInput />
          </div>

          {/* Actions: Track order & Cart */}
          <div className="flex items-center gap-3">
            <Link
              href="/track"
              className="hidden lg:flex items-center gap-1.5 text-xs text-white/90 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors font-medium"
            >
              <ClockCounterClockwise size={16} />
              <span>Track order</span>
            </Link>

            <Link
              href="/cart"
              className="flex items-center gap-2 bg-turmeric text-ink px-4 py-2 rounded-md font-bold text-sm hover:bg-turmeric-hover transition-colors min-h-[44px] shadow-xs active:scale-95"
            >
              <div className="relative">
                <ShoppingCartSimple size={20} weight="bold" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-leaf text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Cart</span>
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-3 pb-2.5">
          <StoreSearchInput placeholder="Search dal, rice, oil, spices..." />
        </div>
      </div>
    </>
  );
}

export function MobileBottomNav() {
  const { itemCount } = useCart();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex items-center justify-around py-1.5 safe-area-bottom shadow-lg"
    >
      <Link
        href="/"
        className="flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] text-xs text-ink-muted hover:text-leaf transition-colors"
      >
        <House size={20} />
        <span className="text-[11px] mt-0.5">Home</span>
      </Link>
      <Link
        href="/#categories"
        className="flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] text-xs text-ink-muted hover:text-leaf transition-colors"
      >
        <SquaresFour size={20} />
        <span className="text-[11px] mt-0.5">Categories</span>
      </Link>
      <Link
        href="/cart"
        className="flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] text-xs text-ink-muted hover:text-leaf transition-colors relative"
      >
        <div className="relative">
          <ShoppingCartSimple size={20} />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-leaf text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </div>
        <span className="text-[11px] mt-0.5">Cart</span>
      </Link>
      <Link
        href="/track"
        className="flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] text-xs text-ink-muted hover:text-leaf transition-colors"
      >
        <ClockCounterClockwise size={20} />
        <span className="text-[11px] mt-0.5">Track</span>
      </Link>
    </nav>
  );
}

