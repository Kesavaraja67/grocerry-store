import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import { requireOwner } from "@/server/auth";
import { recordAuditLog } from "@/server/audit";
import { Decimal } from "decimal.js";
import {
  OrderStatus,
  FulfilmentType,
  assertLegalTransition,
  canTransitionOrder,
  calculateOrderTotals,
  generateWhatsAppMessage,
} from "@/server/domain/orders";

export interface GetAdminOrdersParams {
  status?: OrderStatus | "ALL";
  query?: string;
  fulfilment?: FulfilmentType | "ALL";
  page?: number;
  pageSize?: number;
}

export interface AdminOrdersResult {
  orders: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    fulfilment: FulfilmentType;
    customerName: string;
    customerPhone: string;
    addressLine: string | null;
    area: string | null;
    pincode: string | null;
    subtotal: Decimal;
    deliveryFee: Decimal;
    total: Decimal;
    rejectedReason: string | null;
    cancelReason: string | null;
    placedAt: Date;
    itemCount: number;
    itemsSummary: string;
    items: Array<{
      id: string;
      productName: string;
      quantity: Decimal;
      unitLabel: string;
      unitPrice: Decimal;
      lineTotal: Decimal;
    }>;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts: Record<string, number>;
}

/**
 * Lists orders for admin portal with search, status filtering, pagination, and status tab counts.
 */
export async function getAdminOrders(
  params: GetAdminOrdersParams = {}
): Promise<AdminOrdersResult> {
  await requireOwner();

  const {
    status = "ALL",
    query = "",
    fulfilment = "ALL",
    page = 1,
    pageSize = 20,
  } = params;

  const where: Prisma.OrderWhereInput = {};

  if (status !== "ALL") {
    where.status = status;
  }

  if (fulfilment !== "ALL") {
    where.fulfilment = fulfilment;
  }

  if (query.trim()) {
    const q = query.trim();
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * pageSize;

  const [orders, total, countsByStatus] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        items: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            unitLabel: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {
    ALL: 0,
    PLACED: 0,
    ACCEPTED: 0,
    PROCESSING: 0,
    READY: 0,
    COMPLETED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  };

  let allCount = 0;
  for (const group of countsByStatus) {
    statusCounts[group.status] = group._count.id;
    allCount += group._count.id;
  }
  statusCounts.ALL = allCount;

  const formattedOrders = orders.map((o) => {
    const itemsSummary = o.items
      .slice(0, 3)
      .map((i) => `${i.productName} (${new Decimal(i.quantity).toString()} ${i.unitLabel})`)
      .join(", ") + (o.items.length > 3 ? ` +${o.items.length - 3} more` : "");

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status as OrderStatus,
      fulfilment: o.fulfilment as FulfilmentType,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      addressLine: o.addressLine,
      area: o.area,
      pincode: o.pincode,
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      total: o.total,
      rejectedReason: o.rejectedReason,
      cancelReason: o.cancelReason,
      placedAt: o.placedAt,
      itemCount: o.items.length,
      itemsSummary,
      items: o.items,
    };
  });

  return {
    orders: formattedOrders,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
    statusCounts,
  };
}

/**
 * Fetches single order by ID for admin detail view.
 */
export async function getAdminOrderById(orderId: string) {
  await requireOwner();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              nameTamil: true,
              stockQty: true,
              cost: true,
            },
          },
          cost: true,
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return order;
}

/**
 * Accepts order (PLACED -> ACCEPTED).
 * Validates inventory for each item, decrements stock, records StockMovement,
 * snapshots unit cost into OrderItemCost, updates status to ACCEPTED, and logs OrderEvent.
 */
export async function acceptOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  await requireOwner();

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                cost: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    try {
      assertLegalTransition(order.status as OrderStatus, "ACCEPTED");
    } catch (e: any) {
      return { success: false, error: e.message };
    }

    // Check stock for all items first
    for (const item of order.items) {
      const currentStock = new Decimal(item.product.stockQty);
      const requestedQty = new Decimal(item.quantity);

      if (currentStock.lt(requestedQty)) {
        return {
          success: false,
          error: `Cannot accept order: Insufficient stock for "${item.productName}". Available: ${currentStock.toString()} ${item.unitLabel}, requested: ${requestedQty.toString()} ${item.unitLabel}. Please adjust quantities or update stock first.`,
        };
      }
    }

    // Deduct stock, record StockMovement, and snapshot OrderItemCost
    for (const item of order.items) {
      const currentStock = new Decimal(item.product.stockQty);
      const requestedQty = new Decimal(item.quantity);
      const newStock = currentStock.minus(requestedQty);

      // Decrement product stock
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: newStock },
      });

      // Log stock movement
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "ORDER_ACCEPTED",
          quantityChange: requestedQty.negated(),
          stockAfter: newStock,
          refType: "order",
          refId: order.id,
          note: `Order ${order.orderNumber} accepted`,
        },
      });

      // Snapshot cost into OrderItemCost
      const productCost = item.product.cost;
      const activeCost =
        productCost?.costBasis === "AVERAGE"
          ? productCost.avgCost ?? productCost.lastCost
          : productCost?.lastCost ?? productCost?.avgCost;

      await tx.orderItemCost.upsert({
        where: { orderItemId: item.id },
        update: { unitCost: activeCost },
        create: {
          orderItemId: item.id,
          unitCost: activeCost,
        },
      });
    }

    // Update order status
    await tx.order.update({
      where: { id: orderId },
      data: { status: "ACCEPTED" },
    });

    // Record order event
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: "ACCEPTED",
        note: "Order accepted by shop owner. Stock reserved.",
      },
    });

    await recordAuditLog(
      {
        action: "ORDER_ACCEPTED",
        entity: "Order",
        entityId: order.id,
        data: {
          orderNumber: order.orderNumber,
          itemCount: order.items.length,
          total: order.total.toString(),
        },
      },
      tx
    );

    return { success: true };
  });
}

/**
 * Transitions order status along legal path:
 * ACCEPTED -> PROCESSING
 * PROCESSING -> READY
 * READY -> COMPLETED
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  await requireOwner();

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    try {
      assertLegalTransition(order.status as OrderStatus, newStatus);
    } catch (e: any) {
      return { success: false, error: e.message };
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    const defaultNotes: Partial<Record<OrderStatus, string>> = {
      PROCESSING: "Order is now being packed and weighed.",
      READY:
        order.fulfilment === "DELIVERY"
          ? "Order is packed and out for delivery."
          : "Order is packed and ready for store pickup.",
      COMPLETED: "Order fulfilled and completed.",
    };

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: newStatus,
        note: note?.trim() || defaultNotes[newStatus] || `Status updated to ${newStatus}`,
      },
    });

    await recordAuditLog(
      {
        action: "ORDER_STATUS_UPDATED",
        entity: "Order",
        entityId: order.id,
        data: {
          fromStatus: order.status,
          toStatus: newStatus,
          note: note ?? null,
        },
      },
      tx
    );

    return { success: true };
  });
}

/**
 * Cancels or rejects an order.
 * If rejected from PLACED: sets rejectedReason, no inventory restoration needed.
 * If cancelled from ACCEPTED, PROCESSING, or READY: restores stock for each item and creates ORDER_RESTORED movements.
 */
export async function cancelOrRejectOrder(
  orderId: string,
  action: "CANCEL" | "REJECT",
  reason: string
): Promise<{ success: boolean; error?: string }> {
  await requireOwner();

  if (!reason.trim()) {
    return { success: false, error: "Please provide a reason." };
  }

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    if (action === "REJECT") {
      if (order.status !== "PLACED") {
        return {
          success: false,
          error: "Only new requests in PLACED status can be rejected. Once accepted, use Cancel.",
        };
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "REJECTED",
          rejectedReason: reason.trim(),
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: "REJECTED",
          note: `Order request rejected: ${reason.trim()}`,
        },
      });

      await recordAuditLog(
        {
          action: "ORDER_REJECTED",
          entity: "Order",
          entityId: order.id,
          data: {
            orderNumber: order.orderNumber,
            reason: reason.trim(),
          },
        },
        tx
      );

      return { success: true };
    }

    // Cancel action
    if (!canTransitionOrder(order.status as OrderStatus, "CANCELLED")) {
      return {
        success: false,
        error: `Cannot cancel order from ${order.status} status.`,
      };
    }

    // If order was already accepted, stock was deducted and must be restored
    const stockWasDeducted = ["ACCEPTED", "PROCESSING", "READY"].includes(order.status);

    if (stockWasDeducted) {
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          const restoredStock = new Decimal(product.stockQty).plus(new Decimal(item.quantity));
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: restoredStock },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: "ORDER_RESTORED",
              quantityChange: new Decimal(item.quantity),
              stockAfter: restoredStock,
              refType: "order",
              refId: order.id,
              note: `Order ${order.orderNumber} cancelled: ${reason.trim()}`,
            },
          });
        }
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelReason: reason.trim(),
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: "CANCELLED",
        note: `Order cancelled: ${reason.trim()}${stockWasDeducted ? " (Stock restored)" : ""}`,
      },
    });

    await recordAuditLog(
      {
        action: "ORDER_CANCELLED",
        entity: "Order",
        entityId: order.id,
        data: {
          orderNumber: order.orderNumber,
          reason: reason.trim(),
          stockRestored: stockWasDeducted,
        },
      },
      tx
    );

    return { success: true };
  });
}

/**
 * Modifies items in a PLACED order before owner acceptance.
 * Allows quantity adjustments or item removals.
 * Recalculates subtotal, delivery fee, and total using shop settings.
 */
export async function modifyOrderItemsBeforeAccept(
  orderId: string,
  modifications: Array<{ itemId: string; quantity: number | string }>,
  itemIdsToRemove: string[]
): Promise<{ success: boolean; error?: string }> {
  await requireOwner();

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    if (order.status !== "PLACED") {
      return {
        success: false,
        error: "Items can only be modified before order acceptance (while in PLACED status).",
      };
    }

    // Delete requested removals
    if (itemIdsToRemove.length > 0) {
      await tx.orderItem.deleteMany({
        where: {
          id: { in: itemIdsToRemove },
          orderId: order.id,
        },
      });
    }

    // Apply quantity adjustments
    for (const mod of modifications) {
      if (itemIdsToRemove.includes(mod.itemId)) continue;

      const item = order.items.find((i) => i.id === mod.itemId);
      if (!item) continue;

      const newQty = new Decimal(mod.quantity);
      if (newQty.lte(0)) {
        await tx.orderItem.delete({ where: { id: item.id } });
        continue;
      }

      const unitPrice = new Decimal(item.unitPrice);
      const lineTotal = newQty.times(unitPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          quantity: newQty,
          lineTotal,
        },
      });
    }

    // Fetch remaining items
    const remainingItems = await tx.orderItem.findMany({
      where: { orderId: order.id },
    });

    if (remainingItems.length === 0) {
      return {
        success: false,
        error: "Cannot remove all items. If the customer does not want any items, reject the order instead.",
      };
    }

    // Fetch shop settings for delivery fee calculation
    const settings = await tx.shopSettings.findFirst({ where: { id: 1 } });
    const deliveryFeeConfig = settings?.deliveryFee ?? new Decimal(0);
    const freeDeliveryAbove = settings?.freeDeliveryAbove ?? null;

    const totals = calculateOrderTotals(
      remainingItems.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      order.fulfilment as FulfilmentType,
      deliveryFeeConfig,
      freeDeliveryAbove
    );

    // Update order totals
    await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        total: totals.total,
      },
    });

    // Record event
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: "PLACED",
        note: `Order items adjusted by shop. New total: ₹${totals.total.toFixed(2)}`,
      },
    });

    await recordAuditLog(
      {
        action: "ORDER_ITEMS_MODIFIED",
        entity: "Order",
        entityId: order.id,
        data: {
          orderNumber: order.orderNumber,
          itemCount: remainingItems.length,
          newTotal: totals.total.toString(),
        },
      },
      tx
    );

    return { success: true };
  });
}

/**
 * Builds WhatsApp chat link for direct communication with customer about this order.
 */
export async function getOrderWhatsAppUrl(orderId: string): Promise<string | null> {
  await requireOwner();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) return null;

  const itemSummaries = order.items.map(
    (i) => `${i.productName} (${new Decimal(i.quantity).toString()} ${i.unitLabel}) - ₹${new Decimal(i.lineTotal).toFixed(2)}`
  );

  const encodedText = generateWhatsAppMessage(
    order.orderNumber,
    order.customerName,
    order.status as OrderStatus,
    order.total,
    itemSummaries
  );

  const cleanPhone = order.customerPhone.replace(/\D/g, "");
  const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  return `https://wa.me/${phoneWithCountry}?text=${encodedText}`;
}
