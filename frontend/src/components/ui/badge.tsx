import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useAuthStore } from '@/stores/authStore'

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[color:var(--pp-primary)] text-[color:var(--pp-primary-foreground)] hover:opacity-90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  const { user } = useAuthStore();
  // Default to customer/blue when there's no logged in user (login/signup pages)
  const isCustomer = !user || user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;
  const ADMIN_GREEN = '#00703D';
  const primary = isCustomer ? '#1EA6D6' : ADMIN_GREEN;

  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={{ ['--pp-primary' as any]: primary, ['--pp-primary-foreground' as any]: '#FFFFFF' }}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
