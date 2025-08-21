// src/lib/date.ts

// Format a date into something like "01/21/2025"
export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

// Format relative time, e.g., "2 days ago" or "in 3 hours"
export function formatRelative(date: Date): string {
  const now = new Date();
  const diff = (date.getTime() - now.getTime()) / 1000; // seconds
  const absDiff = Math.abs(diff);

  if (absDiff < 60) return diff < 0 ? "just now" : "in a moment";
  if (absDiff < 3600) return diff < 0 
    ? `${Math.floor(absDiff / 60)} minutes ago` 
    : `in ${Math.floor(absDiff / 60)} minutes`;
  if (absDiff < 86400) return diff < 0 
    ? `${Math.floor(absDiff / 3600)} hours ago` 
    : `in ${Math.floor(absDiff / 3600)} hours`;
  return diff < 0 
    ? `${Math.floor(absDiff / 86400)} days ago` 
    : `in ${Math.floor(absDiff / 86400)} days`;
}

// Check if a date is overdue (before now)
export function isOverdue(date: Date): boolean {
  return date.getTime() < new Date().getTime();
}

// Calculate how many days late
export function daysLate(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
}
