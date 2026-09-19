import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_LOCALE = "en-IN";

/**
 * Formats date and time in Indian Standard Time (IST):
 * e.g., "Sep 10, 06:59 PM" or "Sep 10, 2026, 06:59 PM"
 */
export function formatDateTime(
  date: Date | string | number | null | undefined,
  includeYear: boolean = false
): string {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      ...(includeYear ? { year: "numeric" } : {}),
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: DEFAULT_TIMEZONE,
    }).format(d);
  } catch {
    return "—";
  }
}

/**
 * Formats date only in Indian Standard Time (IST):
 * e.g., "Sep 10, 2026"
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  includeYear: boolean = true
): string {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      ...(includeYear ? { year: "numeric" } : {}),
      timeZone: DEFAULT_TIMEZONE,
    }).format(d);
  } catch {
    return "—";
  }
}

/**
 * Formats time only in Indian Standard Time (IST):
 * e.g., "06:59 PM"
 */
export function formatTime(
  date: Date | string | number | null | undefined
): string {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: DEFAULT_TIMEZONE,
    }).format(d);
  } catch {
    return "—";
  }
}

/**
 * Formats a veterinarian or doctor name, ensuring a single clean "Dr." prefix.
 * e.g. "Arpan Atha" -> "Dr. Arpan Atha"
 * e.g. "Dr. Arpan Atha" -> "Dr. Arpan Atha"
 * e.g. "Dr. Dr. Alpha Medic" -> "Dr. Alpha Medic"
 */
export function formatDoctorName(name?: string | null): string {
  if (!name || typeof name !== "string") return "";
  let cleaned = name.trim();
  // Strip any leading repeated "Dr." or "Dr" variants
  while (/^dr\.?\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^dr\.?\s+/i, "").trim();
  }
  return `Dr. ${cleaned}`;
}
