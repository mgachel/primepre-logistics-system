import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "pending" | "inactive" | "delivered" | "in-transit" | "delayed" | "completed";
  className?: string;
}

const statusConfig = {
  active: { label: "Active", className: "status-active" },
  pending: { label: "Pending", className: "status-pending" },
  inactive: { label: "Inactive", className: "status-inactive" },
  delivered: { label: "Delivered", className: "status-active" },
  "in-transit": { label: "In Transit", className: "bg-secondary/10 text-secondary" },
  delayed: { label: "Delayed", className: "bg-destructive/10 text-destructive" },
  completed: { label: "Completed", className: "status-active" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn("status-badge", config.className, className)}>
      {config.label}
    </span>
  );
}