import { prisma } from "./db";

/**
 * Database-backed rate limiter using the RateLimit table.
 * Returns true if request is within rate limit, false if limit is exceeded.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  const now = new Date();

  try {
    const existing = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (!existing || existing.resetAt <= now) {
      // First request in this window or window expired -> reset
      const resetAt = new Date(now.getTime() + windowMs);
      await prisma.rateLimit.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          resetAt,
        },
        update: {
          count: 1,
          resetAt,
        },
      });
      return true;
    }

    if (existing.count >= maxRequests) {
      // Rate limit exceeded
      return false;
    }

    // Increment count
    await prisma.rateLimit.update({
      where: { key },
      data: {
        count: { increment: 1 },
      },
    });

    return true;
  } catch (error) {
    // If DB fails transiently, fail open in development or log error
    console.error("Rate limit check error:", error);
    return true;
  }
}
