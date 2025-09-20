import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "pending" | "inactive" | "delivered" | "in-transit" | "delayed" | "completed" | "demurrage" | "risk" | "error" | "failed" |
          "PENDING" | "READY_FOR_SHIPPING" | "READY_FOR_DELIVERY" | "FLAGGED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  className?: string;
}

const statusConfig: Record<StatusBadgeProps["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pending", className: "bg-slate-100 text-slate-700" },
  inactive: { label: "Inactive", className: "bg-slate-100 text-slate-700" },
  "in-transit": { label: "In Transit", className: "bg-blue-100 text-blue-700" },
  delayed: { label: "Delayed", className: "bg-yellow-100 text-yellow-800" },
  demurrage: { label: "Demurrage", className: "bg-yellow-100 text-yellow-800" },
  risk: { label: "Risk", className: "bg-yellow-100 text-yellow-800" },
  error: { label: "Error", className: "bg-red-100 text-red-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
  // Warehouse-specific statuses
  "PENDING": { label: "Pending", className: "bg-slate-100 text-slate-700" },
  "READY_FOR_SHIPPING": { label: "Ready for Shipping", className: "bg-blue-100 text-blue-700" },
  "READY_FOR_DELIVERY": { label: "Ready for Delivery", className: "bg-blue-100 text-blue-700" },
  "FLAGGED": { label: "Flagged", className: "bg-yellow-100 text-yellow-800" },
  "SHIPPED": { label: "Shipped", className: "bg-emerald-100 text-emerald-700" },
  "DELIVERED": { label: "Delivered", className: "bg-emerald-100 text-emerald-700" },
  "CANCELLED": { label: "Cancelled", className: "bg-red-100 text-red-800" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status || "Unknown", className: "bg-gray-100 text-gray-700" };
  
  return (
    <span className={cn("status-badge", config.className, className)}>
      {config.label}
    </span>
  );
}