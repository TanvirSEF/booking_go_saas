import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subValue?: string | number;
  icon: ReactNode;
  variant?: "primary" | "secondary" | "accent" | "muted";
  className?: string;
}

export function KpiMetricCard({
  title,
  value,
  subtitle,
  subValue,
  icon,
  variant = "primary",
  className,
}: KpiMetricCardProps) {
  const variantStyles = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",
    muted: "bg-muted text-muted-foreground",
  };

  const bubbleStyles = {
    primary: "bg-primary/10",
    secondary: "bg-secondary/50",
    accent: "bg-accent/60",
    muted: "bg-muted/60",
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md",
        className
      )}
    >
      {/* Decorative decorative bubbles matching design-super-admin */}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -bottom-6 size-24 rounded-full opacity-60",
          bubbleStyles[variant]
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute top-4 right-16 size-8 rounded-full opacity-40",
          bubbleStyles[variant]
        )}
      />

      <CardContent className="relative flex flex-col justify-between p-0">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-xl",
              variantStyles[variant]
            )}
          >
            {icon}
          </div>
          <span className="text-3xl font-bold tracking-tight text-card-foreground">
            {value}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
          {(subtitle || subValue !== undefined) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {subtitle && <span>{subtitle}</span>}
              {subValue !== undefined && (
                <span className="font-medium text-foreground">{subValue}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
