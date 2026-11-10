import React from "react";
import Link from "next/link";
import { Phone, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { getPublicShopSettings } from "@/server/public/shop";
import { copy } from "@/lib/copy";
import { CartProvider } from "@/context/CartContext";
import { StoreHeader, MobileBottomNav } from "@/components/store/StoreHeader";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let shopSettings = null;
  try {
    shopSettings = await getPublicShopSettings();
  } catch (err) {
    console.error("[StorefrontLayout] Failed to load shopSettings:", err);
  }

  const settings = {
    shopName: shopSettings?.shopName || copy.shop.name,
    phone: shopSettings?.phone || "9842100000",
    whatsapp: shopSettings?.whatsapp || "9842100000",
    hoursText: shopSettings?.hoursText || "Mon–Sat: 7:00 AM – 9:30 PM",
    deliveryNote: shopSettings?.deliveryNote || "Free home delivery for orders above ₹500",
    isAcceptingOrders: shopSettings?.acceptingOrders ?? true,
    addressLine: shopSettings?.addressLine || "14 West Street",
    area: shopSettings?.area || "Near Bus Stand",
    city: shopSettings?.city || "",
    pincode: shopSettings?.pincode || "600001",
  };

  return (
    <CartProvider>
      <div className="flex min-h-[100dvh] flex-col bg-page">
        {/* Top Header */}
        <StoreHeader shopSettings={settings} />

        {/* Main Content */}
        <main className="flex-1 pb-20 md:pb-12">{children}</main>

        {/* Footer */}
        <footer className="bg-surface border-t border-border mt-auto pt-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-ink-muted">
            <div>
              <h4 className="font-semibold text-ink text-base mb-2 font-heading">
                {settings.shopName}
              </h4>
              <p className="text-xs text-ink-muted mb-2 font-tamil">
                பாண்டியன் ஸ்டோர் — உங்கள் குடும்பத்துக்கான தரமான மளிகை கடை
              </p>
              <p className="text-xs leading-relaxed">
                {[settings.addressLine, settings.area, settings.city]
                  .filter(Boolean)
                  .join(", ")}{" "}
                – {settings.pincode}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-ink mb-2">Shop Hours & Delivery</h4>
              <p className="text-xs leading-relaxed mb-1">{settings.hoursText}</p>
              <p className="text-xs text-leaf font-medium">{settings.deliveryNote}</p>
            </div>
            <div>
              <h4 className="font-semibold text-ink mb-2">Need Help?</h4>
              <div className="flex flex-col gap-1.5 text-xs">
                <a
                  href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`}
                  className="flex items-center gap-1.5 hover:text-ink transition-colors"
                >
                  <Phone size={14} className="text-leaf" />
                  <span>Call {settings.phone}</span>
                </a>
                {settings.whatsapp && (
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[#25D366] hover:underline"
                  >
                    <WhatsappLogo size={14} weight="fill" />
                    <span>WhatsApp shop</span>
                  </a>
                )}
                <Link href="/contact" className="hover:text-ink transition-colors mt-1 underline">
                  Store contact details & directions
                </Link>
                <Link href="/admin" className="hover:text-ink transition-colors underline text-ink-muted">
                  Owner Admin Portal
                </Link>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-2">
            <p>{copy.shop.taxInclusiveNote}</p>
            <p>© {new Date().getFullYear()} {settings.shopName}. All rights reserved.</p>
          </div>
        </footer>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav />
      </div>
    </CartProvider>
  );
}
