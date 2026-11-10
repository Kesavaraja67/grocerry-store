import React from "react";
import Link from "next/link";
import {
  Storefront,
  Clock,
  Phone,
  WhatsappLogo,
  MapPin,
  Truck,
  CreditCard,
  ArrowLeft,
} from "@phosphor-icons/react/dist/ssr";
import { getPublicShopSettings } from "@/server/public/shop";
import { copy } from "@/lib/copy";

export const metadata = {
  title: "Contact & Store Location — Pandian Store",
  description:
    "Visit Pandian Store. Shop opening hours, delivery areas, phone numbers, and WhatsApp list order.",
};

export default async function ContactPage() {
  const shopSettings = await getPublicShopSettings().catch(() => null);

  const shopName = shopSettings?.shopName || copy.shop.name;
  const phone = shopSettings?.phone || "9842100000";
  const whatsapp = shopSettings?.whatsapp || phone;
  const addressLine = shopSettings?.addressLine || "14 West Street";
  const area = shopSettings?.area || "Near Bus Stand";
  const city = shopSettings?.city || "";
  const pincode = shopSettings?.pincode || "600001";
  const hoursText = shopSettings?.hoursText || "Mon–Sat: 7:00 AM – 9:30 PM, Sun: 7:00 AM – 1:30 PM";
  const deliveryNote = shopSettings?.deliveryNote || "Free home delivery for orders above ₹500";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb */}
      <div>
        <Link href="/" className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 mb-2">
          <ArrowLeft size={13} /> Back to store
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-heading">
          Store Location & Contact Information
        </h1>
        <p className="text-xs text-ink-muted mt-1 font-tamil">
          பாண்டியன் ஸ்டோர் — கடை முகவரி மற்றும் தொடர்பு விவரங்கள்
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Address Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-turmeric/20 text-leaf flex items-center justify-center">
            <Storefront size={24} weight="duotone" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink font-heading">{shopName}</h2>
            <p className="text-sm text-ink-muted mt-1 leading-relaxed">
              {addressLine},<br />
              {area},<br />
              {city} – {pincode}, Tamil Nadu, India.
            </p>
          </div>

          <div className="pt-2 border-t border-border/60">
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(`${shopName}, ${addressLine}, ${city}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-leaf hover:underline"
            >
              <MapPin size={16} />
              <span>Open in Google Maps →</span>
            </a>
          </div>
        </div>

        {/* Operating Hours Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-leaf/10 text-leaf flex items-center justify-center">
            <Clock size={24} weight="duotone" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink font-heading">Shop Timings</h2>
            <p className="text-sm text-ink-muted mt-1 leading-relaxed">
              {hoursText}
            </p>
          </div>

          <div className="pt-2 border-t border-border/60 text-xs text-ink-muted">
            <div className="flex items-center gap-1.5 text-leaf font-semibold">
              <Truck size={16} />
              <span>{deliveryNote}</span>
            </div>
          </div>
        </div>

        {/* Direct Contacts Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-turmeric/20 text-ink flex items-center justify-center">
            <Phone size={24} weight="duotone" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink font-heading">Phone & WhatsApp</h2>
            <p className="text-xs text-ink-muted mt-1">
              Call us directly for stock inquiries or send your grocery list on WhatsApp.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/60">
            <a
              href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
              className="flex items-center gap-2 text-sm font-bold text-ink hover:text-leaf transition-colors font-mono"
            >
              <Phone size={16} className="text-leaf" />
              <span>+91 {phone}</span>
            </a>

            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  "வணக்கம் பாண்டியா ஸ்டோர்! மளிகை பொருட்கள் வாங்க விரும்புகிறேன்."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-bold text-[#25D366] hover:underline"
              >
                <WhatsappLogo size={18} weight="fill" />
                <span>Chat on WhatsApp (+91 {whatsapp})</span>
              </a>
            )}
          </div>
        </div>

        {/* Accepted Payment Methods Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-page text-ink flex items-center justify-center">
            <CreditCard size={24} weight="duotone" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink font-heading">Payment Methods</h2>
            <p className="text-xs text-ink-muted mt-1">
              We accept convenient payment options upon delivery or store counter:
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs text-ink">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-leaf" />
              <span>Cash on Delivery (பணம் செலுத்துதல்)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-leaf" />
              <span>GPay / PhonePe / Paytm / UPI QR Code</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

