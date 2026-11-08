import { Decimal } from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type OrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "PROCESSING"
  | "READY"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type FulfilmentType = "DELIVERY" | "PICKUP";

export const LEGAL_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const CUSTOMER_STATUS_LABELS: Record<
  OrderStatus,
  { label: string; description: string }
> = {
  PLACED: {
    label: "Request received",
    description: "Your order request has been received. Waiting for shop confirmation.",
  },
  ACCEPTED: {
    label: "Confirmed",
    description: "The shop has confirmed your order and reserved your items.",
  },
  PROCESSING: {
    label: "Being packed",
    description: "Your items are being weighed, packed, and checked.",
  },
  READY: {
    label: "Ready for pickup / Out for delivery",
    description: "Your order is ready to be collected or out for delivery.",
  },
  COMPLETED: {
    label: "Completed",
    description: "Order completed. Thank you for shopping with Pandian Store!",
  },
  REJECTED: {
    label: "Not accepted",
    description: "The shop could not accept this order at this time.",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This order has been cancelled.",
  },
};

/**
 * Validates whether a status transition is permitted by the state machine.
 */
export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = LEGAL_TRANSITIONS[from];
  return allowed.includes(to);
}

/**
 * Enforces valid transition; throws error if illegal.
 */
export function assertLegalTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new Error(
      `Cannot change order status from ${from} to ${to}. Allowed transitions: ${
        LEGAL_TRANSITIONS[from].length > 0
          ? LEGAL_TRANSITIONS[from].join(", ")
          : "none (order is in final status)"
      }.`
    );
  }
}

export interface OrderItemCalculationInput {
  productId: string;
  productName: string;
  quantity: Decimal | number | string;
  sellingPrice: Decimal | number | string;
  sellStep: Decimal | number | string;
  minQty: Decimal | number | string;
  maxQty: Decimal | number | string;
  stockQty: Decimal | number | string;
  isPublished: boolean;
  isArchived: boolean;
}

export interface CalculatedOrderItem {
  productId: string;
  productName: string;
  quantity: Decimal;
  unitPrice: Decimal;
  lineTotal: Decimal;
}

export interface OrderTotals {
  subtotal: Decimal;
  deliveryFee: Decimal;
  total: Decimal;
  itemCount: number;
}

/**
 * Validates a single order item quantity against sellStep, minQty, and maxQty.
 */
export function validateItemQuantity(
  quantity: Decimal | number | string,
  sellStep: Decimal | number | string = 1,
  minQty: Decimal | number | string = 1,
  maxQty: Decimal | number | string = 50
): { isValid: boolean; error?: string } {
  const q = new Decimal(quantity);
  const step = new Decimal(sellStep);
  const min = new Decimal(minQty);
  const max = new Decimal(maxQty);

  if (q.lte(0)) {
    return { isValid: false, error: "Quantity must be greater than zero." };
  }

  if (q.lt(min)) {
    return {
      isValid: false,
      error: `Minimum order quantity is ${min.toString()}.`,
    };
  }

  if (q.gt(max)) {
    return {
      isValid: false,
      error: `Maximum allowed quantity per order is ${max.toString()}.`,
    };
  }

  // Check multiple of sellStep
  // e.g. q = 0.5, step = 0.25 -> 0.5 / 0.25 = 2 (integer) -> OK
  // q = 0.3, step = 0.25 -> 0.3 / 0.25 = 1.2 -> Not integer
  const divided = q.dividedBy(step);
  const isMultiple = divided.minus(divided.floor()).abs().lt(1e-6);

  if (!isMultiple) {
    return {
      isValid: false,
      error: `Quantity must be a multiple of ${step.toString()}.`,
    };
  }

  return { isValid: true };
}

/**
 * Calculates server-side verified order line totals and overall order total.
 * Ignores any browser-sent prices or totals.
 */
export function calculateOrderTotals(
  items: Array<{
    quantity: Decimal | number | string;
    unitPrice: Decimal | number | string;
  }>,
  fulfilment: FulfilmentType,
  deliveryFeeConfig: Decimal | number | string = 0,
  freeDeliveryAbove?: Decimal | number | string | null
): OrderTotals {
  let subtotal = new Decimal(0);
  let itemCount = 0;

  for (const item of items) {
    const qty = new Decimal(item.quantity);
    const price = new Decimal(item.unitPrice);
    const lineTotal = qty.times(price).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    subtotal = subtotal.plus(lineTotal);
    itemCount += 1;
  }

  subtotal = subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  let deliveryFee = new Decimal(0);
  if (fulfilment === "DELIVERY") {
    const fee = new Decimal(deliveryFeeConfig);
    if (freeDeliveryAbove !== null && freeDeliveryAbove !== undefined) {
      const threshold = new Decimal(freeDeliveryAbove);
      if (threshold.gt(0) && subtotal.gte(threshold)) {
        deliveryFee = new Decimal(0);
      } else {
        deliveryFee = fee.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      }
    } else {
      deliveryFee = fee.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }
  }

  const total = subtotal.plus(deliveryFee).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    subtotal,
    deliveryFee,
    total,
    itemCount,
  };
}

/**
 * Generates pre-filled WhatsApp message for customer or owner communication.
 * No external API required; used directly with wa.me/phone?text=...
 */
export function generateWhatsAppMessage(
  orderNumber: string,
  customerName: string,
  status: OrderStatus,
  total: Decimal | number | string,
  itemSummaries: string[]
): string {
  const statusInfo = CUSTOMER_STATUS_LABELS[status];
  const itemsText = itemSummaries.join("\n- ");

  return encodeURIComponent(
    `Hello ${customerName}!\n\n` +
      `Regarding your Pandian Store Order *${orderNumber}*:\n` +
      `Status: *${statusInfo.label}*\n` +
      `Total: *₹${new Decimal(total).toFixed(2)}*\n\n` +
      `Items:\n- ${itemsText}\n\n` +
      `Thank you for choosing Pandian Store!`
  );
}
