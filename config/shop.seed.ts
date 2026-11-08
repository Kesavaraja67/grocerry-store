/**
 * Shop configuration seed file.
 * The owner can update all of these settings at any time in the Admin Settings portal.
 * Placeholders are clearly marked as required by Section 16 of the specification.
 */

export interface ShopSeedConfig {
  shopName: string;
  tagline: string;
  phone: string; // Placeholder to be replaced by owner
  whatsapp: string; // Placeholder to be replaced by owner
  addressLine: string; // Placeholder to be replaced by owner
  area: string;
  city: string;
  pincode: string;
  hoursText: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryNote: string;
  minOrderAmount: number;
  deliveryFee: number;
  freeDeliveryAbove: number;
  acceptingOrders: boolean;
  roundingMode: "NONE" | "NEAREST_HALF" | "NEAREST_1" | "UP_1";
}

export const shopSeedConfig: ShopSeedConfig = {
  shopName: "Pandian Store",
  tagline: "Your Neighbourhood Fresh Grocery Store",
  phone: "+91 90000 00000", // Clearly marked placeholder
  whatsapp: "+91 90000 00000", // Clearly marked placeholder
  addressLine: "Shop No. 12, Main Bazaar Road", // Clearly marked placeholder
  area: "Town Centre",
  city: "Madurai",
  pincode: "625001",
  hoursText: "Monday – Sunday: 7:00 AM – 9:30 PM",
  deliveryEnabled: true,
  pickupEnabled: true,
  deliveryNote: "We deliver within 3 km of our shop. Pay on delivery by cash or UPI.",
  minOrderAmount: 100, // ₹100 minimum order
  deliveryFee: 20, // ₹20 standard delivery fee
  freeDeliveryAbove: 500, // Free delivery on orders ₹500 and above
  acceptingOrders: true,
  roundingMode: "UP_1",
};

export const INITIAL_OWNER = {
  email: process.env.OWNER_EMAIL || "owner@pandianstore.local",
  password: process.env.OWNER_INITIAL_PASSWORD || "Pandian@2026",
  name: "Pandian (Shop Owner)",
};
