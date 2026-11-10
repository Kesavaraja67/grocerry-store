"use server";

import "server-only";
import { Decimal } from "decimal.js";
import { prisma } from "@/server/db";
import { requireOwner } from "@/server/auth";

export interface SupplierReportRow {
  supplierId: string;
  supplierName: string;
  phone: string | null;
  area: string | null;
  billCount: number;
  totalSpent: number;
  lastPurchaseDate: string | null;
}

export interface ProductPurchaseReportRow {
  productId: string;
  productName: string;
  productNameTamil: string | null;
  categoryName: string;
  baseUnitSymbol: string;
  totalQtyBought: number;
  totalSpent: number;
  lowestRate: number;
  highestRate: number;
  avgRate: number;
}

export interface CategoryValuationRow {
  categoryId: string;
  categoryName: string;
  productCount: number;
  costValuation: number;
  retailValuation: number;
  potentialProfit: number;
}

export interface StockAlertRow {
  productId: string;
  productName: string;
  productNameTamil: string | null;
  categoryName: string;
  stockQty: number;
  lowStockAt: number;
  baseUnitSymbol: string;
  unitCost: number | null;
  sellingPrice: number | null;
  status: "OUT_OF_STOCK" | "LOW_STOCK";
}

export interface OrdersReportSummary {
  totalOrders: number;
  placedOrders: number;
  acceptedOrders: number;
  processingOrders: number;
  readyOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  totalSales: number;
  averageOrderValue: number;
}

/**
 * Returns aggregated reports across suppliers, products, category valuation, low stock, and orders.
 */
export async function getReportsData() {
  await requireOwner();

  const [
    suppliers,
    purchases,
    products,
    categories,
    orders,
  ] = await Promise.all([
    prisma.supplier.findMany({
      where: { isArchived: false },
      include: {
        purchases: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            total: true,
            purchaseDate: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.purchaseItem.findMany({
      where: {
        purchase: { status: "ACTIVE" },
      },
      include: {
        product: {
          include: {
            category: true,
            baseUnit: true,
          },
        },
        purchase: {
          select: { purchaseDate: true },
        },
      },
    }),
    prisma.product.findMany({
      where: { isArchived: false },
      include: {
        category: true,
        baseUnit: true,
        cost: true,
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.order.findMany({
      select: {
        id: true,
        status: true,
        total: true,
        placedAt: true,
      },
    }),
  ]);

  // 1. Supplier report
  const supplierRows: SupplierReportRow[] = suppliers.map((s) => {
    const totalSpent = s.purchases.reduce(
      (sum, p) => sum + p.total.toNumber(),
      0
    );
    const dates = s.purchases.map((p) => p.purchaseDate.getTime());
    const lastDate = dates.length > 0 ? new Date(Math.max(...dates)).toISOString().split("T")[0] : null;

    return {
      supplierId: s.id,
      supplierName: s.name,
      phone: s.phone,
      area: s.area,
      billCount: s.purchases.length,
      totalSpent: Math.round(totalSpent * 100) / 100,
      lastPurchaseDate: lastDate,
    };
  });

  // 2. Product purchase analysis
  const productPurchaseMap = new Map<
    string,
    {
      productName: string;
      productNameTamil: string | null;
      categoryName: string;
      baseUnitSymbol: string;
      totalQty: number;
      totalSpent: number;
      rates: number[];
    }
  >();

  for (const item of purchases) {
    const pid = item.productId;
    const baseQty = item.baseQty.toNumber();
    const lineAmount = item.lineAmount.toNumber();
    const unitCost = item.unitCost.toNumber();

    const existing = productPurchaseMap.get(pid);
    if (!existing) {
      productPurchaseMap.set(pid, {
        productName: item.product.name,
        productNameTamil: item.product.nameTamil,
        categoryName: item.product.category.name,
        baseUnitSymbol: item.product.baseUnit.symbol,
        totalQty: baseQty,
        totalSpent: lineAmount,
        rates: [unitCost],
      });
    } else {
      existing.totalQty += baseQty;
      existing.totalSpent += lineAmount;
      existing.rates.push(unitCost);
    }
  }

  const productPurchaseRows: ProductPurchaseReportRow[] = Array.from(
    productPurchaseMap.entries()
  ).map(([pid, data]) => {
    const lowestRate = Math.min(...data.rates);
    const highestRate = Math.max(...data.rates);
    const avgRate = data.totalQty > 0 ? data.totalSpent / data.totalQty : 0;

    return {
      productId: pid,
      productName: data.productName,
      productNameTamil: data.productNameTamil,
      categoryName: data.categoryName,
      baseUnitSymbol: data.baseUnitSymbol,
      totalQtyBought: Math.round(data.totalQty * 100) / 100,
      totalSpent: Math.round(data.totalSpent * 100) / 100,
      lowestRate: Math.round(lowestRate * 100) / 100,
      highestRate: Math.round(highestRate * 100) / 100,
      avgRate: Math.round(avgRate * 100) / 100,
    };
  });

  // 3. Category valuation
  const categoryValMap = new Map<
    string,
    { count: number; costVal: number; retailVal: number }
  >();

  for (const c of categories) {
    categoryValMap.set(c.id, { count: 0, costVal: 0, retailVal: 0 });
  }

  const lowStockRows: StockAlertRow[] = [];

  for (const p of products) {
    const stock = p.stockQty.toNumber();
    const lowThreshold = p.lowStockAt.toNumber();
    const cost = p.cost;
    const unitCost = cost
      ? (cost.costBasis === "AVERAGE"
          ? cost.avgCost?.toNumber() ?? cost.lastCost?.toNumber()
          : cost.lastCost?.toNumber() ?? cost.avgCost?.toNumber()) ?? null
      : null;
    const sellingPrice = p.sellingPrice ? p.sellingPrice.toNumber() : null;

    const catData = categoryValMap.get(p.categoryId);
    if (catData) {
      catData.count += 1;
      if (stock > 0 && unitCost !== null) {
        catData.costVal += stock * unitCost;
      }
      if (stock > 0 && sellingPrice !== null) {
        catData.retailVal += stock * sellingPrice;
      }
    }

    if (stock <= lowThreshold) {
      lowStockRows.push({
        productId: p.id,
        productName: p.name,
        productNameTamil: p.nameTamil,
        categoryName: p.category.name,
        stockQty: stock,
        lowStockAt: lowThreshold,
        baseUnitSymbol: p.baseUnit.symbol,
        unitCost,
        sellingPrice,
        status: stock <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
      });
    }
  }

  const categoryValuationRows: CategoryValuationRow[] = categories.map((c) => {
    const data = categoryValMap.get(c.id) || { count: 0, costVal: 0, retailVal: 0 };
    const costVal = Math.round(data.costVal * 100) / 100;
    const retailVal = Math.round(data.retailVal * 100) / 100;
    const potentialProfit = Math.round((retailVal - costVal) * 100) / 100;

    return {
      categoryId: c.id,
      categoryName: c.name,
      productCount: data.count,
      costValuation: costVal,
      retailValuation: retailVal,
      potentialProfit,
    };
  });

  // 4. Orders report
  let totalSales = 0;
  let completedCount = 0;
  let placedCount = 0;
  let acceptedCount = 0;
  let processingCount = 0;
  let readyCount = 0;
  let cancelledCount = 0;
  let rejectedCount = 0;

  for (const o of orders) {
    if (o.status === "COMPLETED") {
      completedCount++;
      totalSales += o.total.toNumber();
    } else if (o.status === "PLACED") placedCount++;
    else if (o.status === "ACCEPTED") acceptedCount++;
    else if (o.status === "PROCESSING") processingCount++;
    else if (o.status === "READY") readyCount++;
    else if (o.status === "CANCELLED") cancelledCount++;
    else if (o.status === "REJECTED") rejectedCount++;
  }

  const avgOrder = completedCount > 0 ? totalSales / completedCount : 0;

  const ordersSummary: OrdersReportSummary = {
    totalOrders: orders.length,
    placedOrders: placedCount,
    acceptedOrders: acceptedCount,
    processingOrders: processingCount,
    readyOrders: readyCount,
    completedOrders: completedCount,
    cancelledOrders: cancelledCount,
    rejectedOrders: rejectedCount,
    totalSales: Math.round(totalSales * 100) / 100,
    averageOrderValue: Math.round(avgOrder * 100) / 100,
  };

  return {
    suppliers: supplierRows,
    productPurchases: productPurchaseRows,
    categoryValuations: categoryValuationRows,
    lowStock: lowStockRows,
    ordersSummary,
  };
}

/**
 * Generates formatted CSV string for downloadable reports.
 */
export async function exportReportCsv(
  type: "SUPPLIERS" | "PRODUCTS" | "VALUATION" | "LOW_STOCK" | "ORDERS"
) {
  const data = await getReportsData();

  if (type === "SUPPLIERS") {
    const headers = [
      "Wholesale Store",
      "Phone",
      "Area / Market",
      "Bills Count",
      "Total Amount Spent (INR)",
      "Last Purchase Date",
    ];
    const rows = data.suppliers.map((s) => [
      `"${s.supplierName.replace(/"/g, '""')}"`,
      s.phone || "",
      `"${(s.area || "").replace(/"/g, '""')}"`,
      s.billCount,
      s.totalSpent.toFixed(2),
      s.lastPurchaseDate || "",
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  if (type === "PRODUCTS") {
    const headers = [
      "Product Name",
      "Tamil Name",
      "Category",
      "Total Quantity Bought",
      "Unit",
      "Total Spent (INR)",
      "Lowest Rate (INR)",
      "Highest Rate (INR)",
      "Average Rate (INR)",
    ];
    const rows = data.productPurchases.map((p) => [
      `"${p.productName.replace(/"/g, '""')}"`,
      `"${(p.productNameTamil || "").replace(/"/g, '""')}"`,
      `"${p.categoryName.replace(/"/g, '""')}"`,
      p.totalQtyBought.toFixed(2),
      p.baseUnitSymbol,
      p.totalSpent.toFixed(2),
      p.lowestRate.toFixed(2),
      p.highestRate.toFixed(2),
      p.avgRate.toFixed(2),
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  if (type === "VALUATION") {
    const headers = [
      "Category",
      "Products Count",
      "Cost Valuation (INR)",
      "Retail Valuation (INR)",
      "Potential Profit (INR)",
    ];
    const rows = data.categoryValuations.map((c) => [
      `"${c.categoryName.replace(/"/g, '""')}"`,
      c.productCount,
      c.costValuation.toFixed(2),
      c.retailValuation.toFixed(2),
      c.potentialProfit.toFixed(2),
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  if (type === "LOW_STOCK") {
    const headers = [
      "Product Name",
      "Tamil Name",
      "Category",
      "Current Stock",
      "Alert Threshold",
      "Unit",
      "Cost (INR)",
      "Selling Price (INR)",
      "Status",
    ];
    const rows = data.lowStock.map((item) => [
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${(item.productNameTamil || "").replace(/"/g, '""')}"`,
      `"${item.categoryName.replace(/"/g, '""')}"`,
      item.stockQty,
      item.lowStockAt,
      item.baseUnitSymbol,
      item.unitCost !== null ? item.unitCost.toFixed(2) : "",
      item.sellingPrice !== null ? item.sellingPrice.toFixed(2) : "",
      item.status === "OUT_OF_STOCK" ? "Out of Stock" : "Low Stock",
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  // ORDERS
  const headers = ["Metric", "Value"];
  const rows = [
    ["Total Orders Placed", data.ordersSummary.totalOrders],
    ["Delivered & Completed Orders", data.ordersSummary.completedOrders],
    ["Orders Pending (Placed / Processing / Ready)", data.ordersSummary.placedOrders + data.ordersSummary.acceptedOrders + data.ordersSummary.processingOrders + data.ordersSummary.readyOrders],
    ["Cancelled / Rejected Orders", data.ordersSummary.cancelledOrders + data.ordersSummary.rejectedOrders],
    ["Total Completed Revenue (INR)", data.ordersSummary.totalSales.toFixed(2)],
    ["Average Order Value (INR)", data.ordersSummary.averageOrderValue.toFixed(2)],
  ];
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

