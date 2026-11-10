"use client";

import React from "react";
import Link from "next/link";
import { Printer, ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/server/domain/money";
import { Decimal } from "decimal.js";

interface OrderSlipPrintViewProps {
  order: any;
  settings: any;
}

export function OrderSlipPrintView({ order, settings }: OrderSlipPrintViewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-page py-6 px-4 print:p-0 print:bg-white text-ink">
      {/* Top Action Controls (hidden in print) */}
      <div className="max-w-xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/admin/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink font-medium"
        >
          <ArrowLeft size={16} />
          Back to Order
        </Link>

        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handlePrint}
          className="gap-2 text-xs"
        >
          <Printer size={16} weight="bold" />
          Print Order Slip
        </Button>
      </div>

      {/* Slip Document (A5 optimized) */}
      <div className="max-w-xl mx-auto bg-white border border-border print:border-none p-6 sm:p-8 rounded-lg shadow-sm print:shadow-none font-sans">
        {/* Header: Shop Profile */}
        <div className="text-center pb-4 border-b border-dashed border-gray-300">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {settings?.shopName || "Pandian Store"}
          </h1>
          {settings?.tagline && (
            <p className="text-xs text-gray-500 italic mt-0.5">{settings.tagline}</p>
          )}
          <p className="text-xs text-gray-600 mt-1">
            {settings?.addressLine}, {settings?.area}, {settings?.city} - {settings?.pincode}
          </p>
          <p className="text-xs text-gray-600">
            Phone: {settings?.phone} {settings?.whatsapp ? `| WhatsApp: ${settings.whatsapp}` : ""}
          </p>

          <div className="mt-3 inline-block bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1 rounded uppercase tracking-wider">
            ORDER SLIP
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">(Not a Tax Invoice)</p>
        </div>

        {/* Order Meta & Customer Details */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-dashed border-gray-300 text-xs">
          <div>
            <p className="text-gray-500">Order Number:</p>
            <p className="font-bold text-gray-900 text-sm">{order.orderNumber}</p>
            <p className="text-gray-500 mt-1">Date & Time:</p>
            <p className="font-medium text-gray-800">
              {new Date(order.placedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <p className="text-gray-500 mt-1">Fulfilment:</p>
            <p className="font-semibold text-gray-900">
              {order.fulfilment === "DELIVERY" ? "Home Delivery" : "Store Pickup"}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Customer:</p>
            <p className="font-bold text-gray-900">{order.customerName}</p>
            <p className="font-medium text-gray-800">{order.customerPhone}</p>
            {order.fulfilment === "DELIVERY" && (
              <div className="mt-1 text-gray-700 leading-snug">
                {order.addressLine && <p>{order.addressLine}</p>}
                {order.landmark && <p>Near: {order.landmark}</p>}
                <p>
                  {order.area} {order.pincode ? `- ${order.pincode}` : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {order.notes && (
          <div className="py-2 border-b border-dashed border-gray-300 text-xs text-gray-700">
            <span className="font-semibold text-gray-800">Note: </span>
            {order.notes}
          </div>
        )}

        {/* Items Table */}
        <div className="py-4 border-b border-dashed border-gray-300">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase">
                <th className="py-1.5 pr-2 font-semibold w-8">#</th>
                <th className="py-1.5 px-2 font-semibold">Item</th>
                <th className="py-1.5 px-2 font-semibold text-right">Qty</th>
                <th className="py-1.5 px-2 font-semibold text-right">Rate</th>
                <th className="py-1.5 pl-2 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item: any, idx: number) => {
                const qty = new Decimal(item.quantity);
                const unitPrice = new Decimal(item.unitPrice);
                const lineTotal = new Decimal(item.lineTotal);

                return (
                  <tr key={item.id}>
                    <td className="py-2 pr-2 text-gray-400">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium text-gray-900">
                      <div>{item.productName}</div>
                      {item.product?.nameTamil && (
                        <div className="text-[11px] text-gray-500 font-tamil">
                          {item.product.nameTamil}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-800">
                      {qty.toString()} {item.unitLabel}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-600">
                      ₹{unitPrice.toFixed(2)}
                    </td>
                    <td className="py-2 pl-2 text-right tabular-nums font-semibold text-gray-900">
                      ₹{lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="py-4 border-b border-dashed border-gray-300 flex justify-end">
          <div className="w-60 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="tabular-nums font-medium text-gray-900">
                ₹{new Decimal(order.subtotal).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Charge:</span>
              <span className="tabular-nums font-medium text-gray-900">
                {new Decimal(order.deliveryFee).eq(0) ? "FREE" : `₹${new Decimal(order.deliveryFee).toFixed(2)}`}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-bold text-gray-900">
              <span>Total Payable:</span>
              <span className="tabular-nums text-base">
                ₹{new Decimal(order.total).toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 text-right pt-1">
              Payment: Cash / UPI on Delivery
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-800">நன்றி! மீண்டும் வருக!</p>
          <p>Thank you for shopping at Pandian Store!</p>
          <p className="text-[10px] text-gray-400">
            For returns or assistance, please contact {settings?.phone} within 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
