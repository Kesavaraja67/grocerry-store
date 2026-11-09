import { prisma } from "./db";
import { Prisma } from "@prisma/client";

export interface AuditLogEntry {
  action: string;
  entity: string;
  entityId: string;
  data?: Prisma.InputJsonValue;
}

/**
 * Records an entry in the AuditLog table for state transitions, price updates,
 * stock adjustments, and purchase voids.
 */
export async function recordAuditLog(
  entry: AuditLogEntry,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma;
  try {
    await client.auditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        data: entry.data ?? Prisma.DbNull,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

