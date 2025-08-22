// src/lib/date.ts

type DateInput = Date | string | number | null | undefined;

function toDate(input: DateInput): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === "number") {
    // Heuristic: seconds vs milliseconds
    const ms = input < 1e12 ? input * 1000 : input;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === "string") {
    // Trim and guard against invalid strings
    const s = input.trim();
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Format a date into something like "01/21/2025"
export function formatDate(dateLike: DateInput, locale?: string): string {
  const date = toDate(dateLike);
  if (!date) return "-";
  try {
    return date.toLocaleDateString(locale);
  } catch {
    return "-";
  }
}

// Format relative time, e.g., "2 days ago" or "in 3 hours"
export function formatRelative(dateLike: DateInput): string {
  const date = toDate(dateLike);
  if (!date) return "";
  const now = new Date();
  const diff = (date.getTime() - now.getTime()) / 1000; // seconds
  const absDiff = Math.abs(diff);

  if (absDiff < 60) return diff < 0 ? "just now" : "in a moment";
  if (absDiff < 3600)
    return diff < 0
      ? `${Math.floor(absDiff / 60)} minutes ago`
      : `in ${Math.floor(absDiff / 60)} minutes`;
  if (absDiff < 86400)
    return diff < 0
      ? `${Math.floor(absDiff / 3600)} hours ago`
      : `in ${Math.floor(absDiff / 3600)} hours`;
  return diff < 0
    ? `${Math.floor(absDiff / 86400)} days ago`
    : `in ${Math.floor(absDiff / 86400)} days`;
}

// Check if a date is overdue (before now)
export function isOverdue(dateLike: DateInput): boolean {
  const date = toDate(dateLike);
  if (!date) return false;
  return date.getTime() < Date.now();
}

// Calculate how many days late
export function daysLate(dateLike: DateInput): number {
  const date = toDate(dateLike);
  if (!date) return 0;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
}
