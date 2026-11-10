"use server";

import { Decimal } from "decimal.js";
import { prisma } from "@/server/db";
import { verifyCart } from "./cart";
import { checkoutOrderSchema, type CheckoutOrderInput } from "@/server/domain/validators";

export interface CreateOrderResult {
  success: boolean;
  orderNumber: string;
  orderId: string;
  total: number;
}

/**
 * Creates a new customer order request from the guest checkout flow.
 * Idempotent, server-validated, and tamper-proof.
 */
export async function createCustomerOrder(data: CheckoutOrderInput): Promise<CreateOrderResult> {
  // 1. Honeypot check: reject bots
  if (data.website && data.website.trim().length > 0) {
    throw new Error("Invalid submission.");
  }

  const validated = checkoutOrderSchema.parse(data);

  return await prisma.$transaction(async (tx) => {
    // 2. Check Idempotency Key
    const existing = await tx.order.findUnique({
      where: { idempotencyKey: validated.idempotencyKey },
    });
    if (existing) {
      return {
        success: true,
        orderNumber: existing.orderNumber,
        orderId: existing.id,
        total: existing.total.toNumber(),
      };
    }

    // 3. Check shop settings
    const shopSettings = await tx.shopSettings.findFirst({
      where: { id: 1 },
    });
    if (shopSettings && !shopSettings.acceptingOrders) {
      throw new Error(
        "We are currently closed for orders right now. Please try again during shop opening hours."
      );
    }

    // 4. Verify & re-price cart strictly server-side
    const verified = await verifyCart(validated.items);
    if (verified.hasErrors || verified.items.length === 0) {
      throw new Error(
        verified.errorMessages[0] || "Some items in your cart are no longer available. Please review your cart."
      );
    }

    if (verified.subtotal < verified.minOrderAmount) {
      throw new Error(
        `Minimum order amount is ₹${verified.minOrderAmount}. Current subtotal is ₹${verified.subtotal}.`
      );
    }

    // 5. Generate Order Number (PS-1001, PS-1002...)
    const lastOrder = await tx.order.findFirst({
      orderBy: { placedAt: "desc" },
      select: { orderNumber: true },
    });

    let nextNum = 1001;
    if (lastOrder && lastOrder.orderNumber.startsWith("PS-")) {
      const parsed = parseInt(lastOrder.orderNumber.replace("PS-", ""), 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }
    const orderNumber = `PS-${nextNum}`;

    // 6. Create Order record
    const subtotalDec = new Decimal(verified.subtotal);
    const deliveryFeeDec = new Decimal(verified.deliveryFee);
    const totalDec = subtotalDec.plus(deliveryFeeDec);

    const customerNotesWithWa = [
      validated.customerNotes,
      validated.whatsapp ? `WhatsApp: ${validated.whatsapp}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const order = await tx.order.create({
      data: {
        orderNumber,
        idempotencyKey: validated.idempotencyKey,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone,
        fulfilment: validated.fulfilment,
        addressLine: validated.fulfilment === "DELIVERY" ? validated.addressLine || null : null,
        area: validated.fulfilment === "DELIVERY" ? validated.area || null : null,
        landmark: validated.fulfilment === "DELIVERY" ? validated.landmark || null : null,
        pincode: validated.fulfilment === "DELIVERY" ? validated.pincode || null : null,
        notes: customerNotesWithWa || null,
        subtotal: subtotalDec,
        deliveryFee: deliveryFeeDec,
        total: totalDec,
        status: "PLACED",
        items: {
          create: verified.items.map((item) => ({
            productId: item.productId,
            productName: item.name,
            unitLabel: item.baseUnitSymbol,
            unitPrice: new Decimal(item.unitPrice),
            quantity: new Decimal(item.quantity),
            lineTotal: new Decimal(item.lineAmount),
          })),
        },
        events: {
          create: {
            status: "PLACED",
            note: "Order placed by customer via web storefront",
          },
        },
      },
    });

    return {
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      total: totalDec.toNumber(),
    };
  });
}

/**
 * Retrieves public order tracking information using Order Number + Phone number.
 */
export async function getPublicOrderTracking(orderNumber: string, phone: string) {
  const cleanOrderNo = orderNumber.trim().toUpperCase();
  const cleanPhone = phone.trim().replace(/\D/g, "");

  const order = await prisma.order.findUnique({
    where: { orderNumber: cleanOrderNo },
    include: {
      items: true,
      events: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    return null;
  }

  // Verify phone matches (last 10 digits check)
  const orderPhoneClean = order.customerPhone.replace(/\D/g, "");
  if (!orderPhoneClean.endsWith(cleanPhone) && !cleanPhone.endsWith(orderPhoneClean)) {
    return null;
  }

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.placedAt.toISOString(),
    customerName: order.customerName,
    fulfilment: order.fulfilment,
    addressLine: order.addressLine,
    area: order.area,
    pincode: order.pincode,
    subtotal: order.subtotal.toNumber(),
    deliveryFee: order.deliveryFee.toNumber(),
    total: order.total.toNumber(),
    rejectedReason: order.rejectedReason,
    cancelReason: order.cancelReason,
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity.toNumber(),
      unitLabel: i.unitLabel,
      unitPrice: i.unitPrice.toNumber(),
      lineTotal: i.lineTotal.toNumber(),
    })),
    events: order.events.map((e) => ({
      status: e.status,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
