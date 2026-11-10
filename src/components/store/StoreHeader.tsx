"use client";

import Link from "next/link";
import {
  ShoppingCartSimple,
  ClockCounterClockwise,
  House,
  SquaresFour,
  UserCircle,
} from "@phosphor-icons/react";
import { useCart } from "@/context/CartContext";
import { StoreSearchInput } from "./StoreSearchInput";

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
      {/* 1. Closed Order Notice (only shown if shop temporarily paused orders) */}
      {!shopSettings.isAcceptingOrders && (
        <div className="bg-turmeric text-ink text-xs font-bold py-1.5 px-4 text-center">
          Currently not accepting new orders — opening soon!
        </div>
      )}

      {/* 2. Main Storefront Navbar */}
      <div className="sticky top-0 z-40 bg-leaf text-white shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 min-w-0">
            <div className="bg-[#FAF5F1] rounded-lg px-2 py-1 shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/images/logo.png"
                alt={shopSettings.shopName}
                className="h-9 sm:h-11 w-auto object-contain"
              />
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white font-heading leading-tight">
                {shopSettings.shopName}
              </span>
              <span className="text-[11px] text-white/75 mt-0.5 leading-none font-tamil">
                பாண்டியன் ஸ்டோர்
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar with Live Suggestions */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4">
            <StoreSearchInput />
          </div>

          {/* Actions: Owner Portal / Admin, Track order & Cart */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <Link
              href="/track"
              className="hidden md:flex items-center gap-1.5 text-xs text-white/90 hover:text-white px-2.5 py-2 rounded-md hover:bg-white/10 transition-colors font-medium min-h-[44px]"
            >
              <ClockCounterClockwise size={16} />
              <span>Track order</span>
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 px-3 py-2 rounded-md font-semibold text-xs min-h-[44px] transition-colors active:scale-95"
              aria-label="Owner Admin Portal"
            >
              <UserCircle size={18} weight="bold" />
              <span className="md:hidden">Admin</span>
              <span className="hidden md:inline">Owner Portal</span>
            </Link>

            <Link
              href="/cart"
              className="flex items-center gap-2 bg-turmeric text-ink px-3.5 sm:px-4 py-2 rounded-md font-bold text-sm hover:bg-turmeric-hover transition-colors min-h-[44px] shadow-xs active:scale-95"
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border grid grid-cols-4 h-16 items-center safe-area-bottom shadow-lg"
    >
      <Link
        href="/"
        className="flex flex-col items-center justify-center py-1 min-h-[44px] text-xs text-ink-muted hover:text-leaf transition-colors"
      >
        <House size={20} />
        <span className="text-[11px] mt-1 leading-none">Home</span>
      </Link>
      <Link
        href="/#categories"
        className="flex flex-col items-center justify-center py-1 min-h-[44px] text-xs text-ink-muted hover:text-leaf transition-colors"
      >
        <SquaresFour size={20} />
        <span className="text-[11px] mt-1 leading-none">Categories</span>
      </Link>
      <Link
        href="/cart"
        className="flex flex-col items-center justify-center py-1 min-h-[44px] text-xs text-ink-muted hover:text-leaf transition-colors relative"
      >
        <div className="relative">
          <ShoppingCartSimple size={20} />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-leaf text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </div>
        <span className="text-[11px] mt-1 leading-none">Cart</span>
      </Link>
      <Link
        href="/track"
        className="flex flex-col items-center justify-center py-1 min-h-[44px] text-xs text-ink-muted hover:text-leaf transition-colors"
      >
        <ClockCounterClockwise size={20} />
        <span className="text-[11px] mt-1 leading-none">Track</span>
      </Link>
    </nav>
  );
}

