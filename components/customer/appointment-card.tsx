"use client";

import Link from "next/link";
import {
  IconCalendar,
  IconClock,
  IconUserCheck,
  IconBuildingStore,
  IconRefresh,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CustomerAppointmentItem } from "@/types/customer-appointment";

interface AppointmentCardProps {
  appointment: CustomerAppointmentItem;
  isUpcoming?: boolean;
  onCancelClick?: (appointment: CustomerAppointmentItem) => void;
  onRescheduleClick?: (appointment: CustomerAppointmentItem) => void;
}

export function AppointmentCard({
  appointment,
  isUpcoming = false,
  onCancelClick,
  onRescheduleClick,
}: AppointmentCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Confirmed</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/20">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/20">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20">Pending</Badge>;
    }
  };

  const formattedDate = appointment.date
    ? new Date(appointment.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <Card className="hover:shadow-md transition-shadow border-border/60 bg-card text-card-foreground">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-base sm:text-lg text-foreground">
                {appointment.serviceName}
              </h3>
              {getStatusBadge(appointment.appointmentStatus)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <IconCalendar className="w-4 h-4 text-primary shrink-0" />
                <span>{formattedDate || appointment.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <IconClock className="w-4 h-4 text-primary shrink-0" />
                <span>{appointment.time}</span>
              </div>
              {appointment.staffName && (
                <div className="flex items-center gap-2">
                  <IconUserCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>Specialist: {appointment.staffName}</span>
                </div>
              )}
              {appointment.businessName && (
                <div className="flex items-center gap-2">
                  <IconBuildingStore className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>Business: {appointment.businessName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-4 sm:pt-0 gap-3">
            <div className="text-left sm:text-right">
              <span className="text-xs text-muted-foreground block">Total Amount</span>
              <span className="text-lg font-bold text-foreground">
                {appointment.businessCurrencySymbol || "$"}{Number(appointment.servicePrice || 0).toFixed(2)}
              </span>
            </div>

            {isUpcoming ? (
              <div className="flex flex-wrap items-center gap-2">
                {appointment.canReschedule && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRescheduleClick?.(appointment)}
                    className="text-xs"
                  >
                    Reschedule
                  </Button>
                )}
                {appointment.canCancel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelClick?.(appointment)}
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Cancel Booking
                  </Button>
                )}
              </div>
            ) : (
              <Button asChild size="sm" variant="default" className="text-xs gap-1.5">
                <Link href={`/appointments/${appointment.businessSlug || "booking"}`}>
                  <IconRefresh className="w-3.5 h-3.5" />
                  Book Again
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
