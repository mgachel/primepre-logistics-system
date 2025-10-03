import type { CustomerSearchResponse } from "@/services/containerExcelService";

export interface CustomerOption {
  id: number;
  shippingMark: string;
  displayName: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

function normalize(value: string | undefined | null) {
  return (value ?? "").trim();
}

function toLower(value: string | undefined | null) {
  return normalize(value).toLowerCase();
}

function compact(value: string) {
  return value.replace(/[^a-z0-9]/gi, "");
}

export function mapCustomerToOption(customer: CustomerSearchResponse["customers"][number]): CustomerOption {
  const shippingMark = normalize(customer?.shipping_mark);
  const candidateName = normalize(customer?.name);
  const displayName = candidateName || shippingMark || `Client #${customer?.id ?? ""}`;

  return {
    id: customer?.id ?? 0,
    shippingMark,
    displayName,
    phone: normalize(customer?.phone) || undefined,
    email: normalize(customer?.email) || undefined,
    isActive: typeof (customer as Record<string, unknown>)?.is_active === "boolean"
      ? Boolean((customer as Record<string, unknown>).is_active)
      : undefined,
  };
}

export function rankCustomerOptions(
  customers: CustomerOption[],
  query: string,
  limit = 120
): CustomerOption[] {
  console.log(`[rankCustomerOptions] Ranking ${customers.length} customers with query: "${query}"`);
  const trimmed = normalize(query);
  const normalized = trimmed.toLowerCase();
  const compactQuery = compact(normalized);

  if (!normalized) {
    const sorted = [...customers]
      .sort((a, b) => a.shippingMark.localeCompare(b.shippingMark) || a.displayName.localeCompare(b.displayName))
      .slice(0, limit);
    console.log(`[rankCustomerOptions] No query, returning ${sorted.length} customers (sorted by shipping mark)`);
    return sorted;
  }

  const results = customers
    .map((customer) => {
      const shippingLower = toLower(customer.shippingMark);
      const shippingCompact = compact(shippingLower);
      const nameLower = toLower(customer.displayName);
      const emailLower = toLower(customer.email);
      const phoneDigits = normalize(customer.phone).replace(/[^0-9]/g, "");

      let matched = false;
      let score = 100;

      if (shippingLower === normalized) {
        score = Math.min(score, 0);
        matched = true;
      }
      if (!matched && shippingLower.startsWith(normalized)) {
        score = Math.min(score, 1);
        matched = true;
      }
      if (shippingLower.includes(normalized)) {
        score = Math.min(score, 2);
        matched = true;
      }
      if (compactQuery && shippingCompact.startsWith(compactQuery)) {
        score = Math.min(score, 2);
        matched = true;
      }
      if (compactQuery && shippingCompact.includes(compactQuery)) {
        score = Math.min(score, 3);
        matched = true;
      }
      if (compactQuery && phoneDigits.includes(compactQuery)) {
        score = Math.min(score, 4);
        matched = true;
      }
      if (nameLower.includes(normalized)) {
        score = Math.min(score, 5);
        matched = true;
      }
      if (emailLower.includes(normalized)) {
        score = Math.min(score, 6);
        matched = true;
      }

      return { customer, score, matched };
    })
    .filter((entry) => entry.matched)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      const shippingCompare = a.customer.shippingMark.localeCompare(b.customer.shippingMark);
      if (shippingCompare !== 0) return shippingCompare;
      return a.customer.displayName.localeCompare(b.customer.displayName);
    })
    .slice(0, limit)
    .map((entry) => entry.customer);

  console.log(`[rankCustomerOptions] Query "${query}" matched ${results.length} customers`);
  if (results.length > 0 && results.length <= 5) {
    results.forEach(r => console.log(`  - ${r.shippingMark} | ${r.displayName}`));
  }
  return results;
}
