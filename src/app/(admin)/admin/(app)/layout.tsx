import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import {
  House,
  ClipboardText,
  Package,
  SquaresFour,
  Storefront,
  Receipt,
  Stack,
  CurrencyInr,
  ChartBar,
  Gear,
} from "@phosphor-icons/react/dist/ssr";
import { AdminTopBar } from "./AdminTopBar";

export const dynamic = "force-dynamic";

export default async function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const navItems = [
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

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-page text-ink">
      {/* Desktop Sidebar (Section 10) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-surface shrink-0">
        <div className="p-3.5 border-b border-border flex items-center justify-between gap-2">
          <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
            <img
              src="/images/logo.png"
              alt="Pandian Stores"
              className="h-10 w-auto object-contain shrink-0"
            />
            <div className="min-w-0">
              <span className="font-bold text-sm text-leaf leading-tight block truncate">Pandian Store</span>
              <span className="text-[11px] text-muted font-tamil block truncate">உரிமையாளர் பகுதி</span>
            </div>
          </Link>
          <span className="text-[10px] bg-leaf-light text-leaf px-2 py-0.5 rounded-full font-semibold border border-[#D5E3DA] shrink-0">
            Admin
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-ink/80 hover:text-leaf hover:bg-leaf-light transition-colors min-h-[44px]"
              >
                <Icon size={18} weight="regular" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-2.5 text-xs text-muted">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md border border-border bg-page hover:bg-leaf-light hover:text-leaf hover:border-leaf/30 font-semibold text-ink transition-colors min-h-[40px]"
          >
            <Storefront size={16} weight="bold" className="text-leaf" />
            <span>View Customer Store</span>
          </Link>
          <div className="px-1">
            <p className="truncate font-medium text-ink">{session.user.name}</p>
            <p className="truncate text-[11px]">{session.user.email}</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with Search and Privacy Mode */}
        <AdminTopBar userEmail={session.user.email} />

        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation (Section 10) */}
        <nav
          aria-label="Admin Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border grid grid-cols-5 h-16 items-center safe-area-bottom shadow-lg"
        >
          <Link
            href="/admin"
            className="flex flex-col items-center justify-center p-1 text-xs text-muted hover:text-leaf min-h-[44px]"
          >
            <House size={20} />
            <span className="text-[10px] mt-1 leading-none">Home</span>
          </Link>
          <Link
            href="/admin/orders"
            className="flex flex-col items-center justify-center p-1 text-xs text-muted hover:text-leaf min-h-[44px]"
          >
            <ClipboardText size={20} />
            <span className="text-[10px] mt-1 leading-none">Orders</span>
          </Link>
          <Link
            href="/admin/purchases/new"
            className="flex flex-col items-center justify-center p-1 min-h-[44px] text-xs font-semibold text-ink"
          >
            <div className="w-10 h-10 rounded-full bg-turmeric flex items-center justify-center shadow-xs -mt-4 border-2 border-surface">
              <Receipt size={20} weight="bold" />
            </div>
            <span className="text-[10px] mt-0.5 leading-none font-bold text-leaf">Buy</span>
          </Link>
          <Link
            href="/admin/inventory"
            className="flex flex-col items-center justify-center p-1 text-xs text-muted hover:text-leaf min-h-[44px]"
          >
            <Stack size={20} />
            <span className="text-[10px] mt-1 leading-none">Stock</span>
          </Link>
          <Link
            href="/admin/products"
            className="flex flex-col items-center justify-center p-1 text-xs text-muted hover:text-leaf min-h-[44px]"
          >
            <Package size={20} />
            <span className="text-[10px] mt-1 leading-none">Products</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}

