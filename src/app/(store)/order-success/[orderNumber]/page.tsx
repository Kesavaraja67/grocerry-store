import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle,
  WhatsappLogo,
  Phone,
  ClockCounterClockwise,
  ArrowRight,
  Storefront,
  Truck,
} from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/server/db";
import { formatINR, formatDate } from "@/lib/format";

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { orderNumber } = await params;
  return {
    title: `Order Received #${orderNumber} — Pandian Store`,
  };
}

export default async function OrderSuccessPage({ params }: PageProps) {
  const { orderNumber } = await params;

  const [order, shopSettings] = await Promise.all([
    prisma.order.findUnique({
      where: { orderNumber: orderNumber.toUpperCase() },
      include: {
        items: true,
      },
    }),
    prisma.shopSettings.findFirst({ where: { id: 1 } }),
  ]);

  if (!order) {
    notFound();
  }

  const shopPhone = shopSettings?.phone || "9842100000";
  const shopWhatsapp = shopSettings?.whatsapp || shopPhone;

  const whatsappMessage = encodeURIComponent(
    `வணக்கம் பாண்டியா ஸ்டோர்! I placed order ${order.orderNumber} for ₹${order.total.toNumber()}. Customer: ${order.customerName}.`
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Top Success Banner */}
      <div className="rounded-2xl border border-leaf/30 bg-leaf/5 p-6 sm:p-8 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-leaf text-white flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle size={36} weight="bold" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold text-leaf uppercase tracking-wider">
            Order Request Placed Successfully
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-heading">
            Thank You, {order.customerName}!
          </h1>
          <p className="text-xs text-ink-muted font-tamil">
            உங்கள் மளிகை ஆர்டர் வெற்றிகரமாக பதிவு செய்யப்பட்டது!
          </p>
        </div>

        {/* Order Number Badge */}
        <div className="pt-2">
          <div className="inline-block rounded-xl border border-border bg-surface px-6 py-3 shadow-2xs">
            <div className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">
              Your Order Number
            </div>
            <div className="text-2xl font-black font-mono text-leaf tracking-wider">
              {order.orderNumber}
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp & Call Direct Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={`https://wa.me/${shopWhatsapp.replace(/[^0-9]/g, "")}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-all shadow-xs"
        >
          <WhatsappLogo size={20} weight="fill" />
          <span>Confirm on WhatsApp</span>
        </a>

        <a
          href={`tel:${shopPhone.replace(/[^0-9+]/g, "")}`}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-border bg-surface hover:bg-page text-ink text-xs font-bold transition-all shadow-xs"
        >
          <Phone size={18} className="text-leaf" />
          <span>Call Shop ({shopPhone})</span>
        </a>
      </div>

      {/* Order Summary & Details */}
      <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink border-b border-border pb-3">
          Order Items ({order.items.length})
        </h2>

        <div className="divide-y divide-border/60 text-xs">
          {order.items.map((item) => (
            <div key={item.id} className="py-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-ink text-sm">{item.productName}</div>
                <div className="text-ink-muted text-[11px] mt-0.5">
                  {item.quantity.toNumber()} {item.unitLabel} × {formatINR(item.unitPrice.toNumber())}
                </div>
              </div>
              <div className="text-right font-mono font-bold text-sm text-ink">
                {formatINR(item.lineTotal.toNumber())}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border space-y-1.5 text-xs">
          <div className="flex justify-between text-ink-muted">
            <span>Subtotal:</span>
            <span className="font-mono text-ink">{formatINR(order.subtotal.toNumber())}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Delivery:</span>
            <span className="font-mono text-ink">
              {order.deliveryFee.toNumber() === 0 ? "FREE" : formatINR(order.deliveryFee.toNumber())}
            </span>
          </div>
          <div className="pt-2 border-t border-border flex justify-between text-base font-bold text-ink">
            <span>Total Payable:</span>
            <span className="font-mono text-xl text-leaf font-extrabold">
              {formatINR(order.total.toNumber())}
            </span>
          </div>
        </div>

        {/* Fulfilment info */}
        <div className="pt-4 border-t border-border/80 text-xs text-ink-muted space-y-1 bg-page/40 p-3 rounded-xl">
          <div className="font-bold text-ink flex items-center gap-1.5">
            {order.fulfilment === "DELIVERY" ? (
              <>
                <Truck size={16} className="text-leaf" />
                <span>Home Delivery Address:</span>
              </>
            ) : (
              <>
                <Storefront size={16} className="text-leaf" />
                <span>Store Pickup:</span>
              </>
            )}
          </div>
          {order.fulfilment === "DELIVERY" ? (
            <p>
              {order.addressLine}, {order.area} – {order.pincode}
            </p>
          ) : (
            <p>
              Pandian Store, 14 West Masi Street, Madurai (Ready for pickup in 30 mins)
            </p>
          )}
          <p className="text-[11px]">Contact Mobile: +91 {order.customerPhone}</p>
        </div>
      </div>

      {/* Track link */}
      <div className="text-center">
        <Link
          href={`/track?orderNumber=${order.orderNumber}&phone=${order.customerPhone}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-leaf hover:underline"
        >
          <ClockCounterClockwise size={16} />
          <span>Track live status of this order →</span>
        </Link>
      </div>
    </div>
  );
}

