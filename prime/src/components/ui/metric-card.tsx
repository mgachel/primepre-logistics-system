import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: "increase" | "decrease" | "neutral";
  };
  icon?: LucideIcon;
  className?: string;
}

export function MetricCard({ title, value, change, icon: Icon, className }: MetricCardProps) {
  return (
    <div className={cn("logistics-card p-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
          {change && (
            <p className={cn(
              "text-sm mt-1 flex items-center",
              change.type === "increase" && "text-success",
              change.type === "decrease" && "text-destructive",
              change.type === "neutral" && "text-muted-foreground"
            )}>
              {change.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}