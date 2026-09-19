"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AppointmentStatusBadgeProps {
  status: string;
  className?: string;
}

export function AppointmentStatusBadge({
  status,
  className,
}: AppointmentStatusBadgeProps) {
  const normalized = (status || "").toLowerCase();

  switch (normalized) {
    case "confirmed":
      return (
        <Badge
          className={cn(
            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium",
            className
          )}
        >
          Confirmed
        </Badge>
      );
    case "completed":
      return (
        <Badge
          variant="secondary"
          className={cn(
            "bg-primary/15 text-primary border-primary/20 font-medium",
            className
          )}
        >
          Completed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="destructive"
          className={cn(
            "bg-destructive/15 text-destructive border-destructive/20 font-medium",
            className
          )}
        >
          Cancelled
        </Badge>
      );
    case "pending":
    case "pending_approval":
    case "pending approval":
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 font-medium",
            className
          )}
        >
          Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={cn("font-medium", className)}>
          {status || "Unknown"}
        </Badge>
      );
  }
}

interface PaymentStatusBadgeProps {
  status: string;
  paymentType?: string;
  className?: string;
}

export function PaymentStatusBadge({
  status,
  className,
}: PaymentStatusBadgeProps) {
  const normalized = (status || "").toLowerCase();

  switch (normalized) {
    case "paid":
    case "completed":
      return (
        <Badge
          className={cn(
            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium",
            className
          )}
        >
          Paid
        </Badge>
      );
    case "pending_verification":
    case "pending":
      return (
        <Badge
          className={cn(
            "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 font-medium",
            className
          )}
        >
          Pending Verification
        </Badge>
      );
    case "failed":
    case "rejected":
      return (
        <Badge
          variant="destructive"
          className={cn(
            "bg-destructive/15 text-destructive border-destructive/20 font-medium",
            className
          )}
        >
          Failed / Rejected
        </Badge>
      );
    case "unpaid":
    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-muted text-muted-foreground border-border font-medium",
            className
          )}
        >
          Unpaid
        </Badge>
      );
  }
}
