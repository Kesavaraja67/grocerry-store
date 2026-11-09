"use server";

import "server-only";
import { requireOwner } from "@/server/auth";
import { prisma } from "@/server/db";
import { shopSettingsSchema } from "@/server/domain/validators";
import { recordAuditLog } from "@/server/audit";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getShopSettings() {
  await requireOwner();

  let settings = await prisma.shopSettings.findFirst({
    where: { id: 1 },
  });

  if (!settings) {
    // If somehow not initialized, create with defaults
    settings = await prisma.shopSettings.create({
      data: { id: 1, phone: "+91 90000 00000", addressLine: "Main Bazaar", area: "Town", city: "Madurai", pincode: "625001", hoursText: "8am - 9pm" },
    });
  }

  return {
    ...settings,
    minOrderAmount: Number(settings.minOrderAmount),
    deliveryFee: Number(settings.deliveryFee),
    freeDeliveryAbove: settings.freeDeliveryAbove ? Number(settings.freeDeliveryAbove) : null,
  };
}

export async function updateShopSettings(data: unknown) {
  const user = await requireOwner();
  const validated = shopSettingsSchema.parse(data);

  const updated = await prisma.shopSettings.upsert({
    where: { id: 1 },
    update: {
      ...validated,
    },
    create: {
      id: 1,
      ...validated,
    },
  });

  await recordAuditLog({
    action: "UPDATE_SETTINGS",
    entity: "ShopSettings",
    entityId: "1",
    data: { updatedBy: user.email, changes: validated },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout"); // Revalidate public chrome

  return {
    success: true,
    settings: {
      ...updated,
      minOrderAmount: Number(updated.minOrderAmount),
      deliveryFee: Number(updated.deliveryFee),
      freeDeliveryAbove: updated.freeDeliveryAbove ? Number(updated.freeDeliveryAbove) : null,
    },
  };
}

export async function toggleAcceptingOrders(accepting: boolean) {
  const user = await requireOwner();

  const updated = await prisma.shopSettings.update({
    where: { id: 1 },
    data: { acceptingOrders: accepting },
  });

  await recordAuditLog({
    action: "TOGGLE_ACCEPTING_ORDERS",
    entity: "ShopSettings",
    entityId: "1",
    data: { updatedBy: user.email, acceptingOrders: accepting },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");

  return { success: true, acceptingOrders: updated.acceptingOrders };
}

export async function changeOwnerPassword(currentPassword: string, newPassword: string) {
  const user = await requireOwner();

  if (!newPassword || newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    throw new Error("Owner user not found.");
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!isCurrentValid) {
    throw new Error("Current password is incorrect.");
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      forcedPasswordChange: false,
    },
  });

  await recordAuditLog({
    action: "CHANGE_PASSWORD",
    entity: "User",
    entityId: user.id,
    data: { email: user.email },
  });

  return { success: true };
}

