"use server";

import { Decimal } from "decimal.js";
import { prisma } from "@/server/db";
import { validateItemQuantity } from "@/server/domain/orders";

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface VerifiedCartLine {
  productId: string;
  slug: string;
  name: string;
  nameTamil: string | null;
  sizeLabel: string | null;
  baseUnitSymbol: string;
  sellStep: number;
  minQty: number;
  maxQty: number;
  unitPrice: number;
  mrp: number | null;
  quantity: number;
  lineAmount: number;
  inStock: boolean;
  imageUrl: string | null;
  error?: string;
}

export interface VerifiedCartSummary {
  items: VerifiedCartLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  isAcceptingOrders: boolean;
  minOrderAmount: number;
  freeDeliveryThreshold: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  hasErrors: boolean;
  errorMessages: string[];
}

/**
 * Validates and re-prices cart items server-side.
 * Never trusts prices sent from the browser.
 */
export async function verifyCart(cartItems: CartItemInput[]): Promise<VerifiedCartSummary> {
  const shopSettings = await prisma.shopSettings.findFirst({
    where: { id: 1 },
  });

  const isAcceptingOrders = shopSettings ? shopSettings.acceptingOrders : true;
  const deliveryEnabled = shopSettings ? shopSettings.deliveryEnabled : true;
  const pickupEnabled = shopSettings ? shopSettings.pickupEnabled : true;
  const minOrderAmount = shopSettings ? shopSettings.minOrderAmount.toNumber() : 0;
  const deliveryFee = shopSettings ? shopSettings.deliveryFee.toNumber() : 0;
  const freeDeliveryThreshold = 500; // Free delivery threshold in INR

  if (!cartItems || cartItems.length === 0) {
    return {
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      total: 0,
      isAcceptingOrders,
      minOrderAmount,
      freeDeliveryThreshold,
      deliveryEnabled,
      pickupEnabled,
      hasErrors: false,
      errorMessages: [],
    };
  }

  const productIds = cartItems.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isArchived: false,
      isPublished: true,
      sellingPrice: { not: null },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      nameTamil: true,
      sizeLabel: true,
      sellStep: true,
      minQty: true,
      maxQty: true,
      sellingPrice: true,
      mrp: true,
      stockQty: true,
      baseUnit: {
        select: { symbol: true },
      },
      images: {
        select: { url: true },
        take: 1,
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const verifiedLines: VerifiedCartLine[] = [];
  const errorMessages: string[] = [];

  let subtotalDec = new Decimal(0);

  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product || !product.sellingPrice) {
      errorMessages.push(`One of the items in your cart is no longer available.`);
      continue;
    }

    const inStock = product.stockQty.toNumber() > 0;
    const sellStep = product.sellStep.toNumber();
    const minQty = product.minQty.toNumber();
    const maxQty = product.maxQty.toNumber();
    const unitPrice = product.sellingPrice.toNumber();
    const mrp = product.mrp ? product.mrp.toNumber() : null;

    let qty = item.quantity;
    let lineError: string | undefined = undefined;

    if (!inStock) {
      lineError = "Out of stock";
      errorMessages.push(`${product.name} is currently out of stock.`);
    } else {
      // Validate step
      const stepCheck = validateItemQuantity(qty, sellStep, minQty, maxQty);
      if (!stepCheck.isValid) {
        lineError = stepCheck.error || "Invalid quantity";
        errorMessages.push(stepCheck.error || `Invalid quantity for ${product.name}`);
        qty = Math.max(minQty, Math.min(maxQty, qty));
      }
    }

    const lineAmount = Math.round(qty * unitPrice * 100) / 100;
    if (inStock) {
      subtotalDec = subtotalDec.plus(new Decimal(lineAmount));
    }

    verifiedLines.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      nameTamil: product.nameTamil,
      sizeLabel: product.sizeLabel,
      baseUnitSymbol: product.baseUnit.symbol,
      sellStep,
      minQty,
      maxQty,
      unitPrice,
      mrp,
      quantity: qty,
      lineAmount,
      inStock,
      imageUrl: product.images[0]?.url || null,
      error: lineError,
    });
  }

  const subtotal = subtotalDec.toNumber();
  const computedDeliveryFee = subtotal >= freeDeliveryThreshold || subtotal === 0 ? 0 : deliveryFee;
  const total = subtotal + computedDeliveryFee;

  return {
    items: verifiedLines,
    subtotal,
    deliveryFee: computedDeliveryFee,
    total,
    isAcceptingOrders,
    minOrderAmount,
    freeDeliveryThreshold,
    deliveryEnabled,
    pickupEnabled,
    hasErrors: errorMessages.length > 0,
    errorMessages,
  };
}

