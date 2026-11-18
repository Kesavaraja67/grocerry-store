import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import {
  House,
  ClipboardText,
  ShoppingCart,
  Package,
  Storefront,
} from "@phosphor-icons/react/dist/ssr";
import { AdminTopBar } from "./AdminTopBar";
import { LanguageProvider } from "@/context/LanguageContext";

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
    { label: "Home", href: "/admin", icon: House },
    { label: "Orders", href: "/admin/orders", icon: ClipboardText },
    { label: "Buy", href: "/admin/buy", icon: ShoppingCart },
    { label: "Items", href: "/admin/items", icon: Package },
    { label: "Shops", href: "/admin/shops", icon: Storefront },
  ];

  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] flex flex-col md:flex-row bg-page text-ink">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border bg-surface shrink-0">
          <div className="p-3 border-b border-border flex items-center gap-2.5">
            <Link href="/admin" className="flex items-center gap-2 min-w-0">
              <img
                src="/images/logo.png"
                alt="Pandian Stores"
                className="h-9 w-auto object-contain shrink-0"
              />
              <div className="min-w-0">
                <span className="font-bold text-sm text-leaf leading-tight block truncate">
                  Pandian Store
                </span>
                <span className="text-[11px] text-muted font-tamil block truncate">
                  உரிமையாளர் பகுதி
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
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

          <div className="p-3 border-t border-border">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md border border-border bg-page hover:bg-leaf-light hover:text-leaf hover:border-leaf/30 font-semibold text-xs text-ink transition-colors min-h-[40px]"
            >
              <Storefront size={15} weight="bold" className="text-leaf" />
              <span>Customer store</span>
            </Link>
            <div className="mt-2.5 px-1">
              <p className="truncate text-xs font-medium text-ink">
                {session.user.name}
              </p>
              <p className="truncate text-[11px] text-muted">
                {session.user.email}
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopBar userEmail={session.user.email} />

          <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6 overflow-y-auto max-w-5xl w-full mx-auto">
            {children}
          </main>

          {/* Mobile Bottom Navigation — 5 items: Home · Orders · Buy · Items · Shops */}
          <nav
            aria-label="Admin mobile navigation"
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
              href="/admin/buy"
              className="flex flex-col items-center justify-center p-1 min-h-[44px] text-xs font-semibold text-ink"
            >
              <div className="w-10 h-10 rounded-full bg-turmeric flex items-center justify-center shadow-xs -mt-4 border-2 border-surface">
                <ShoppingCart size={20} weight="bold" />
              </div>
              <span className="text-[10px] mt-0.5 leading-none font-bold text-leaf">
                Buy
              </span>
            </Link>
            <Link
              href="/admin/items"
              className="flex flex-col items-center justify-center p-1 text-xs text-muted hover:text-leaf min-h-[44px]"
            >
              <Package size={20} />
              <span className="text-[10px] mt-1 leading-none">Items</span>
            </Link>
            <Link
              href="/admin/shops"
              className="flex flex-col items-center justify-center p-1 text-xs text-muted hover:text-leaf min-h-[44px]"
            >
              <Storefront size={20} />
              <span className="text-[10px] mt-1 leading-none">Shops</span>
            </Link>
          </nav>
        </div>
      </div>
    </LanguageProvider>
  );
}
