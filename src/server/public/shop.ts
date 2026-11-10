import { cache } from "react";
import { prisma } from "@/server/db";

/**
 * Fetches shop settings once per request across layout and pages.
 */
export const getPublicShopSettings = cache(async () => {
  return prisma.shopSettings.findFirst({
    where: { id: 1 },
  });
});
