import Link from "next/link";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconClock,
} from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AppointmentListItem } from "@/types/appointment-query";

interface RecentAppointmentsCardProps {
  appointments?: AppointmentListItem[];
  currencySymbol?: string;
}

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getStatusBadgeVariant(status: string) {
  const s = status.toLowerCase();
  if (s === "confirmed") {
    return {
      variant: "outline" as const,
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium",
    };
  }
  if (s === "pending") {
    return {
      variant: "outline" as const,
      className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium",
    };
  }
  if (s === "completed") {
    return {
      variant: "outline" as const,
      className: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium",
    };
  }
  if (s === "cancelled") {
    return {
      variant: "outline" as const,
      className: "border-destructive/30 bg-destructive/10 text-destructive font-medium",
    };
  }
  return {
    variant: "secondary" as const,
    className: "font-medium",
  };
}

export function RecentAppointmentsCard({
  appointments = [],
  currencySymbol = "$",
}: RecentAppointmentsCardProps) {
  const recentList = appointments.slice(0, 5);

  return (
    <Card className="rounded-2xl border border-border/60 bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 p-5">
        <div>
          <CardTitle className="text-base font-bold text-foreground">
            Recent Appointments
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Latest 5 customer bookings and requested services
          </CardDescription>
        </div>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-xs font-semibold text-primary hover:text-primary gap-1 cursor-pointer"
        >
          <Link href="/dashboard/appointments">
            <span>View All</span>
            <IconArrowRight size={14} />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        {recentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
              <IconCalendarEvent size={24} />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No appointments booked yet
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              New client bookings will appear here as soon as they are submitted.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {recentList.map((apt) => {
              const badgeStyle = getStatusBadgeVariant(apt.status);
              const formattedPrice = `${currencySymbol}${(apt.servicePrice ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;

              return (
                <div
                  key={apt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/20"
                >
                  {/* Customer details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-10 shrink-0 border border-border/50">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {getInitials(apt.customerName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {apt.customerName}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {apt.appointmentNumber}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/80 truncate">
                          {apt.serviceName}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <IconClock size={12} />
                          {apt.date} at {apt.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status and Price */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-13 sm:pl-0">
                    <Badge
                      variant={badgeStyle.variant}
                      className={`text-[11px] px-2.5 py-0.5 capitalize ${badgeStyle.className}`}
                    >
                      {apt.status}
                    </Badge>

                    <span className="text-xs font-bold text-foreground min-w-[60px] text-right">
                      {formattedPrice}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
