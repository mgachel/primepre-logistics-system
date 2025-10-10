import { cn } from "@/lib/utils";
import { useAuthStore } from '@/stores/authStore'

interface StatusBadgeProps {
  status: "active" | "pending" | "inactive" | "delivered" | "in-transit" | "delayed" | "completed" | "demurrage" | "risk" | "error" | "failed" |
          "PENDING" | "READY_FOR_SHIPPING" | "READY_FOR_DELIVERY" | "FLAGGED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  className?: string;
}

function lighten(hex: string, percent: number) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.floor((num >> 16) * (1 + percent)));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) * (1 + percent)));
  const b = Math.min(255, Math.floor((num & 0x0000FF) * (1 + percent)));
  return `rgb(${r}, ${g}, ${b})`;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { user } = useAuthStore();
  const isCustomer = user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;
  const ADMIN_GREEN = '#00703D';
  const primary = isCustomer ? '#2563eb' : ADMIN_GREEN;

  const defaults: Record<string, { label: string; style: any }> = {
    active: { label: 'Active', style: { backgroundColor: 'rgba(16,185,129,0.12)', color: '#065f46' } },
    delivered: { label: 'Delivered', style: { backgroundColor: 'rgba(16,185,129,0.12)', color: '#065f46' } },
    completed: { label: 'Completed', style: { backgroundColor: 'rgba(16,185,129,0.12)', color: '#065f46' } },
    pending: { label: 'Pending', style: { backgroundColor: '#f1f5f9', color: '#334155' } },
    inactive: { label: 'Inactive', style: { backgroundColor: '#f1f5f9', color: '#334155' } },
    'in-transit': { label: 'In Transit', style: { backgroundColor: lighten(primary, 0.85), color: primary } },
    delayed: { label: 'Delayed', style: { backgroundColor: '#fffbeb', color: '#92400e' } },
    demurrage: { label: 'Demurrage', style: { backgroundColor: '#fffbeb', color: '#92400e' } },
    risk: { label: 'Risk', style: { backgroundColor: '#fffbeb', color: '#92400e' } },
    error: { label: 'Error', style: { backgroundColor: '#fee2e2', color: '#991b1b' } },
    failed: { label: 'Failed', style: { backgroundColor: '#fee2e2', color: '#991b1b' } },
    // Warehouse-specific statuses
    'PENDING': { label: 'Pending', style: { backgroundColor: '#f1f5f9', color: '#334155' } },
    'READY_FOR_SHIPPING': { label: 'Ready for Shipping', style: { backgroundColor: lighten(primary, 0.85), color: primary } },
    'READY_FOR_DELIVERY': { label: 'Ready for Delivery', style: { backgroundColor: lighten(primary, 0.85), color: primary } },
    'FLAGGED': { label: 'Flagged', style: { backgroundColor: '#fffbeb', color: '#92400e' } },
    'SHIPPED': { label: 'Shipped', style: { backgroundColor: 'rgba(16,185,129,0.12)', color: '#065f46' } },
    'DELIVERED': { label: 'Delivered', style: { backgroundColor: 'rgba(16,185,129,0.12)', color: '#065f46' } },
    'CANCELLED': { label: 'Cancelled', style: { backgroundColor: '#fee2e2', color: '#991b1b' } },
  };

  const config = defaults[status] || { label: status || 'Unknown', style: { backgroundColor: '#f3f4f6', color: '#111827' } };

  return (
    <span className={cn('status-badge', className)} style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, ...config.style }}>
      {config.label}
    </span>
  );
}