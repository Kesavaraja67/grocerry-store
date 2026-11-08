"use server";

import "server-only";
import { requireOwner } from "@/server/auth";
import { prisma } from "@/server/db";

export async function getUnits() {
  await requireOwner();

  const units = await prisma.unit.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return units.map((u) => ({
    id: u.id,
    code: u.code,
    label: u.label,
    symbol: u.symbol,
    dimension: u.dimension,
    factorToBase: u.factorToBase ? Number(u.factorToBase) : null,
    isBaseable: u.isBaseable,
  }));
}

export async function getBaseUnits() {
  await requireOwner();

  const baseUnits = await prisma.unit.findMany({
    where: { isBaseable: true },
    orderBy: { sortOrder: "asc" },
  });

  return baseUnits.map((u) => ({
    id: u.id,
    code: u.code,
    label: u.label,
    symbol: u.symbol,
    dimension: u.dimension,
    factorToBase: u.factorToBase ? Number(u.factorToBase) : null,
    isBaseable: u.isBaseable,
  }));
}

export async function getCompatibleUnits(baseUnitId: string) {
  await requireOwner();

  const baseUnit = await prisma.unit.findUnique({
    where: { id: baseUnitId },
  });

  if (!baseUnit) {
    throw new Error("Base unit not found.");
  }

  // Compatible units:
  // 1. Same unit
  // 2. Units in the same dimension (e.g. g for kg, ml for litre, dozen for COUNT)
  // 3. PACK units (box, carton, bag, can, case) which require unitsPerPack
  const units = await prisma.unit.findMany({
    where: {
      OR: [
        { dimension: baseUnit.dimension },
        { dimension: "PACK" },
      ],
    },
    orderBy: { sortOrder: "asc" },
  });

  return units.map((u) => ({
    id: u.id,
    code: u.code,
    label: u.label,
    symbol: u.symbol,
    dimension: u.dimension,
    factorToBase: u.factorToBase ? Number(u.factorToBase) : null,
    isBaseable: u.isBaseable,
    isPack: u.dimension === "PACK",
  }));
}
