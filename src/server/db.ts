import { Prisma, PrismaClient } from "@prisma/client";

const TRANSIENT_ERROR_CODES = new Set(["P1001", "P1008", "P1017", "P2024"]);

function isTransientConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  if (typeof code === "string" && TRANSIENT_ERROR_CODES.has(code)) {
    return true;
  }
  const message = err instanceof Error ? err.message : String(err);
  if (
    message.includes("Transaction already closed") ||
    message.includes("current transaction is aborted")
  ) {
    return false;
  }
  return (
    message.includes("kind: Closed") ||
    message.includes("closed the connection") ||
    message.includes("Can't reach database server") ||
    message.includes("Connection terminated") ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    message.includes("EPIPE") ||
    message.includes("socket hang up")
  );
}

const globalForPrisma = globalThis as unknown as {
  basePrisma: PrismaClient | undefined;
  prisma: PrismaClient | undefined;
  reconnectPromise: Promise<void> | undefined;
};

const basePrisma =
  globalForPrisma.basePrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

async function resetConnection(): Promise<void> {
  if (!globalForPrisma.reconnectPromise) {
    globalForPrisma.reconnectPromise = (async () => {
      try {
        await basePrisma.$disconnect().catch(() => {});
        await basePrisma.$connect().catch(() => {});
      } finally {
        globalForPrisma.reconnectPromise = undefined;
      }
    })();
  }
  return globalForPrisma.reconnectPromise;
}

const extendedPrisma = basePrisma.$extends(
  Prisma.defineExtension({
    name: "neon-resilient-retry",
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const maxRetries = 3;
          let lastErr: unknown;
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              return await query(args);
            } catch (err) {
              lastErr = err;
              if (!isTransientConnectionError(err) || attempt === maxRetries) {
                throw err;
              }
              await resetConnection();
              await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
            }
          }
          throw lastErr;
        },
      },
    },
  })
) as unknown as PrismaClient;

export const prisma = globalForPrisma.prisma ?? extendedPrisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.basePrisma = basePrisma;
  globalForPrisma.prisma = prisma;
}

export default prisma;
