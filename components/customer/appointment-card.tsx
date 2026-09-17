"use client";

import Link from "next/link";
import {
  Calendar,
  Clock,
  UserCheck,
  Building2,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface AppointmentItem {
  id: string;
  slug?: string;
  serviceTitle: string;
  specialistName?: string;
  companyName?: string;
  companySlug?: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  price: number;
  currency?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | string;
  paymentStatus: "unpaid" | "paid" | "pending_verification" | "refunded" | string;
  receiptUrl?: string;
  isGuestBooking?: boolean;
}

interface AppointmentCardProps {
  appointment: AppointmentItem;
  isUpcoming?: boolean;
  onCancelClick?: (appointment: AppointmentItem) => void;
  onRescheduleClick?: (appointment: AppointmentItem) => void;
  onViewReceiptClick?: (appointment: AppointmentItem) => void;
}

export function AppointmentCard({
  appointment,
  isUpcoming = false,
  onCancelClick,
  onRescheduleClick,
  onViewReceiptClick,
}: AppointmentCardProps) {
  const getStatusBadge = (status: AppointmentItem["status"]) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Confirmed</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20">Cancelled</Badge>;
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
    <Card className="hover:shadow-md transition-shadow border-border/80 bg-white dark:bg-zinc-900">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-base sm:text-lg text-foreground">
                {appointment.serviceTitle}
              </h3>
              {getStatusBadge(appointment.status)}
              {appointment.isGuestBooking && (
                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                  Guest Booking
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>{appointment.startTime} - {appointment.endTime}</span>
              </div>
              {appointment.specialistName && (
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>Specialist: {appointment.specialistName}</span>
                </div>
              )}
              {appointment.companyName && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>Company: {appointment.companyName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-4 sm:pt-0 gap-3">
            <div className="text-left sm:text-right">
              <span className="text-xs text-muted-foreground block">Total Amount</span>
              <span className="text-lg font-bold text-foreground">
                {appointment.currency || "$"}{Number(appointment.price || 0).toFixed(2)}
              </span>
            </div>

            {isUpcoming ? (
              <div className="flex flex-wrap items-center gap-2">
                {appointment.receiptUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewReceiptClick?.(appointment)}
                    className="text-xs gap-1"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    Receipt
                  </Button>
                )}
                {appointment.status !== "cancelled" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRescheduleClick?.(appointment)}
                      className="text-xs"
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancelClick?.(appointment)}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                    >
                      Cancel Booking
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <Button asChild size="sm" variant="default" className="text-xs gap-1.5">
                <Link href={`/appointments/${appointment.companySlug || appointment.slug || "booking"}`}>
                  <RotateCcw className="w-3.5 h-3.5" />
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
