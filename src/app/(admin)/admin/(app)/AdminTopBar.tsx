"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  MagnifyingGlass,
  Eye,
  EyeSlash,
  SignOut,
  List,
  X,
  House,
  ClipboardText,
  Receipt,
  Package,
  Storefront,
  Stack,
  CurrencyInr,
  SquaresFour,
  ChartBar,
  Gear,
  ArrowLeft,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface AdminTopBarProps {
  userEmail?: string | null;
}

const MOBILE_NAV_LINKS = [
  { label: "Dashboard", href: "/admin", icon: House },
  { label: "Orders", href: "/admin/orders", icon: ClipboardText },
  { label: "Purchases", href: "/admin/purchases", icon: Receipt },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Wholesale Stores", href: "/admin/suppliers", icon: Storefront },
  { label: "Inventory", href: "/admin/inventory", icon: Stack },
  { label: "Pricing", href: "/admin/pricing", icon: CurrencyInr },
  { label: "Categories", href: "/admin/categories", icon: SquaresFour },
  { label: "Reports", href: "/admin/reports", icon: ChartBar },
  { label: "Settings", href: "/admin/settings", icon: Gear },
];

export function AdminTopBar({ userEmail }: AdminTopBarProps) {
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("pandian-privacy-mode");
    if (saved === "true") {
      setPrivacyMode(true);
      document.documentElement.classList.add("privacy-masked");
    }
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const togglePrivacyMode = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    localStorage.setItem("pandian-privacy-mode", String(next));
    if (next) {
      document.documentElement.classList.add("privacy-masked");
    } else {
      document.documentElement.classList.remove("privacy-masked");
    }
    window.dispatchEvent(new Event("pandian-privacy-change"));
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-surface border-b border-border px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3 shadow-xs">
        {/* Mobile Menu Toggle */}
        <Button
          type="button"
          variant="outline"
          size="iconSm"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="md:hidden h-10 w-10 shrink-0"
        >
          {menuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
        </Button>

        {/* Global Search (Section 10) */}
        <div className="flex-1 max-w-md min-w-0">
          <form action="/admin/search" method="GET" className="relative w-full">
            <input
              type="text"
              name="q"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stores, products, bills..."
              className="w-full h-10 pl-9 pr-3 rounded-md bg-page border border-border text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-leaf focus:bg-surface transition-all"
            />
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-3 text-muted pointer-events-none"
            />
          </form>
        </div>

        {/* Right controls: View Store + Privacy Mode + Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            href="/"
            title="Go to customer storefront"
            className="inline-flex items-center gap-1.5 h-10 px-2.5 sm:px-3 rounded-md border border-border bg-page hover:bg-leaf-light hover:text-leaf hover:border-leaf/30 text-xs font-semibold text-ink transition-colors shrink-0"
          >
            <Storefront size={16} weight="bold" className="text-leaf" />
            <span className="hidden sm:inline">View Store</span>
            <span className="sm:hidden">Shop</span>
          </Link>

          <Button
            type="button"
            variant={privacyMode ? "turmeric" : "outline"}
            size="sm"
            onClick={togglePrivacyMode}
            title={
              privacyMode
                ? "Turn off privacy mode"
                : "Turn on privacy mode to mask wholesale costs"
            }
            className="flex items-center gap-1.5 text-xs h-10 min-h-[40px] px-2.5 sm:px-3"
          >
            {privacyMode ? (
              <>
                <EyeSlash size={16} weight="bold" />
                <span className="hidden sm:inline">Costs masked</span>
              </>
            ) : (
              <>
                <Eye size={16} />
                <span className="hidden sm:inline">Privacy mode</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            title={`Log out (${userEmail || "Owner"})`}
            className="h-10 w-10 text-muted hover:text-red hover:bg-red-light"
          >
            <SignOut size={18} />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {menuOpen && (
        <div className="md:hidden bg-surface border-b border-border shadow-md px-3 py-3 space-y-2">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <img
                src="/images/logo.png"
                alt="Pandian Stores"
                className="h-8 w-auto object-contain shrink-0"
              />
              <div>
                <p className="text-sm font-bold text-leaf leading-tight">Pandian Store Admin</p>
                {userEmail && <p className="text-[11px] text-muted">{userEmail}</p>}
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-leaf hover:underline px-2 py-1.5"
            >
              <ArrowLeft size={14} />
              <span>Storefront</span>
            </Link>
          </div>
          <nav aria-label="Mobile Admin Drawer" className="grid grid-cols-2 gap-1.5">
            {MOBILE_NAV_LINKS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-medium min-h-[44px] transition-colors ${
                    isActive
                      ? "bg-leaf text-white"
                      : "bg-page text-ink hover:bg-leaf-light hover:text-leaf"
                  }`}
                >
                  <Icon size={17} weight={isActive ? "fill" : "regular"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
