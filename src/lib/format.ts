import { Decimal } from "decimal.js";
import { formatINR as domainFormatINR } from "@/server/domain/money";
import { formatQuantity as domainFormatQuantity } from "@/server/domain/units";

export function formatINR(amount: Decimal | number | string | null | undefined, includeSymbol: boolean = true): string {
  return domainFormatINR(amount, includeSymbol);
}

export function formatQuantity(
  quantity: Decimal | number | string,
  unitCode: string,
  unitSymbol: string
): string {
  return domainFormatQuantity(quantity, unitCode, unitSymbol);
}

/**
 * Format date in Indian English format (e.g., 08 Nov 2026, 8:30 PM).
 * Timezone: Asia/Kolkata
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  includeTime: boolean = false
): string {
  if (!date) return "—";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";

  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  };

  if (includeTime) {
    options.hour = "numeric";
    options.minute = "2-digit";
    options.hour12 = true;
  }

  return new Intl.DateTimeFormat("en-IN", options).format(d);
}

export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return formatDate(d);
}

