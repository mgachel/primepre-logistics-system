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
  // Optional overrides for icon and background color (CSS color string)
  iconColor?: string;
  bgColor?: string;
}

export function MetricCard({ title, value, change, icon: Icon, className, iconColor, bgColor }: MetricCardProps) {
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
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: bgColor }}
          >
            <Icon className="h-6 w-6" style={{ color: iconColor }} />
          </div>
        )}
      </div>
    </div>
  );
}