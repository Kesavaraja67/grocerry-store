import { z } from "zod";

// 10-digit Indian mobile number validation
export const indianPhoneRegex = /^[6-9]\d{9}$/;

export const phoneSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/[\s\-\+]/g, "")) // Remove spaces, dashes, plus
  .transform((val) => (val.startsWith("91") && val.length === 12 ? val.slice(2) : val)) // Strip leading 91
  .refine((val) => indianPhoneRegex.test(val), {
    message: "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).",
  });

// Customer checkout request schema
export const checkoutOrderSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(60, "Name cannot exceed 60 characters."),
    customerPhone: phoneSchema,
    whatsapp: z.string().trim().optional().nullable(),
    fulfilment: z.enum(["DELIVERY", "PICKUP"]),
    addressLine: z.string().trim().max(120, "Address is too long.").optional().nullable(),
    area: z.string().trim().max(60, "Area is too long.").optional().nullable(),
    landmark: z.string().trim().max(60, "Landmark is too long.").optional().nullable(),
    pincode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Pincode must be a 6-digit number.")
      .optional()
      .nullable(),
    notes: z.string().trim().max(300, "Notes cannot exceed 300 characters.").optional().nullable(),
    customerNotes: z.string().trim().max(300, "Notes cannot exceed 300 characters.").optional().nullable(),
    idempotencyKey: z.string().min(1, "Idempotency key required."),
    website: z.string().optional().nullable(), // Honeypot field
    items: z
      .array(
        z.object({
          productId: z.string().min(1, "Product is required."),
          quantity: z.number().positive("Quantity must be greater than zero."),
        })
      )
      .min(1, "Your cart is empty. Add at least one item to checkout."),
  })
  .superRefine((data, ctx) => {
    if (data.fulfilment === "DELIVERY") {
      if (!data.addressLine || data.addressLine.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["addressLine"],
          message: "Please provide a delivery address (house/street).",
        });
      }
      if (!data.area || data.area.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["area"],
          message: "Please provide an area or locality.",
        });
      }
      if (!data.pincode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pincode"],
          message: "Please provide a 6-digit postal pincode.",
        });
      }
    }
  });

export type CheckoutOrderInput = z.infer<typeof checkoutOrderSchema>;

// Supplier schema
export const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Wholesale store name must be at least 2 characters.")
    .max(100, "Store name is too long."),
  phone: z.string().trim().max(20, "Phone is too long.").optional().nullable(),
  area: z.string().trim().max(60, "Area is too long.").optional().nullable(),
  address: z.string().trim().max(200, "Address is too long.").optional().nullable(),
  notes: z.string().trim().max(500, "Notes are too long.").optional().nullable(),
});

// Category schema
export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required.").max(50),
  iconKey: z.string().trim().min(1, "Icon key is required."),
  tint: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code (e.g. #EBF2ED)").optional().nullable(),
  sortOrder: z.number().int().default(0),
  lowMarkup: z.number().min(0, "Markup cannot be negative.").max(200),
  recommendedMarkup: z.number().min(0, "Markup cannot be negative.").max(200),
  highMarkup: z.number().min(0, "Markup cannot be negative.").max(200),
});

// Product schema
export const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required.").max(100),
  nameTamil: z.string().trim().max(100).optional().nullable(),
  brand: z.string().trim().max(50).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  sizeLabel: z.string().trim().max(40).optional().nullable(),
  categoryId: z.string().min(1, "Category is required."),
  baseUnitId: z.string().min(1, "Stock unit is required."),
  sellStep: z.number().positive("Sell step must be positive.").default(1),
  minQty: z.number().positive("Minimum quantity must be positive.").default(1),
  maxQty: z.number().positive("Maximum quantity must be positive.").default(50),
  sellingPrice: z.number().positive("Price must be positive.").optional().nullable(),
  mrp: z.number().positive("MRP must be positive.").optional().nullable(),
  lowStockAt: z.number().min(0).default(5),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

// Purchase item line schema
export const purchaseLineSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  quantity: z.number().positive("Quantity must be greater than zero."),
  unitId: z.string().min(1, "Unit is required."),
  unitsPerPack: z.number().positive("Pack size must be positive.").optional().nullable(),
  lineAmount: z.number().positive("Line amount must be greater than zero."),
});

export type PurchaseLineInput = z.infer<typeof purchaseLineSchema>;

// Purchase creation schema
export const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Wholesale store is required."),
  purchaseDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Valid purchase date is required.",
  }),
  invoiceNo: z.string().trim().max(50).optional().nullable(),
  extraCharges: z.number().min(0, "Extra charges cannot be negative.").default(0),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z.array(purchaseLineSchema).min(1, "At least one purchase item is required."),
});

export type PurchaseFormInput = z.infer<typeof purchaseSchema>;

// Stock adjustment schema
export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  type: z.enum(["ADD", "REMOVE", "SET"]),
  quantity: z.number().positive("Quantity must be greater than zero."),
  reason: z.enum([
    "DAMAGED",
    "EXPIRED",
    "COUNT_CORRECTION",
    "OPENING_STOCK",
    "RETURNED",
    "OTHER",
  ]),
  note: z.string().trim().max(250).optional().nullable(),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

// Settings update schema
export const shopSettingsSchema = z.object({
  shopName: z.string().trim().min(2).max(100),
  tagline: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().min(8).max(20),
  whatsapp: z.string().trim().max(20).optional().nullable(),
  addressLine: z.string().trim().min(5).max(150),
  area: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits."),
  hoursText: z.string().trim().min(2).max(100),
  deliveryEnabled: z.boolean().default(true),
  pickupEnabled: z.boolean().default(true),
  deliveryNote: z.string().trim().max(200).optional().nullable(),
  minOrderAmount: z.number().min(0).default(0),
  deliveryFee: z.number().min(0).default(0),
  freeDeliveryAbove: z.number().min(0).optional().nullable(),
  acceptingOrders: z.boolean().default(true),
  roundingMode: z.enum(["NONE", "NEAREST_HALF", "NEAREST_1", "UP_1"]).default("UP_1"),
});

