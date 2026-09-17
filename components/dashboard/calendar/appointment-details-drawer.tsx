'use client';

import React, { useTransition } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconUser,
  IconMail,
  IconPhone,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconCreditCard,
  IconLoader2,
  IconSparkles,
  IconCash,
  IconReceipt,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { updateAppointmentStatusAction } from '@/actions/appointment-management';
import type { CalendarEvent } from '@/types/appointment-query';

interface AppointmentDetailsDrawerProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated: (appointmentId: string, newStatus: string) => void;
}

function formatCustomerType(type?: string): string {
  if (!type) return 'Guest';
  if (type === 'new-user') return 'New Customer';
  if (type === 'existing-user') return 'Registered';
  if (type === 'guest-user') return 'Guest';
  return type;
}

export function AppointmentDetailsDrawer({
  event,
  open,
  onOpenChange,
  onStatusUpdated,
}: AppointmentDetailsDrawerProps) {
  const [isPending, startTransition] = useTransition();

  if (!event) return null;

  const { extendedProps } = event;
  const currentStatus = extendedProps.status || 'Pending';

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus) return;

    startTransition(async () => {
      const res = await updateAppointmentStatusAction(
        event.id,
        newStatus as 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
      );

      if (res.success) {
        toast.success(`Appointment status updated to ${newStatus}.`);
        onStatusUpdated(event.id, newStatus);
      } else {
        toast.error(res.error || 'Failed to update status.');
      }
    });
  };

  const paymentStatusVariant: 'default' | 'secondary' | 'outline' | 'destructive' =
    extendedProps.paymentStatus === 'paid' || extendedProps.paymentStatus === 'completed'
      ? 'default'
      : extendedProps.paymentStatus === 'refunded' || extendedProps.paymentStatus === 'failed'
        ? 'destructive'
        : 'outline';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-theme="company"
        side="right"
        className="w-full sm:max-w-md p-0 overflow-y-auto bg-card border-border flex flex-col"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-border bg-muted/20">
          <SheetHeader className="p-0 text-left">
            <div className="flex items-center justify-between gap-3 pr-6">
              <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                {extendedProps.appointmentNumber || `#APP-${event.id.slice(-6)}`}
              </span>
              <Badge
                variant={
                  currentStatus.toLowerCase() === 'confirmed'
                    ? 'default'
                    : currentStatus.toLowerCase() === 'completed'
                      ? 'secondary'
                      : currentStatus.toLowerCase() === 'cancelled'
                        ? 'destructive'
                        : 'outline'
                }
                className="capitalize font-semibold rounded-lg text-xs"
              >
                {currentStatus}
              </Badge>
            </div>

            <SheetTitle className="text-xl font-bold text-foreground mt-1">
              {extendedProps.serviceName || event.title}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Booked for {extendedProps.customerName}
            </SheetDescription>
          </SheetHeader>

          {/* Quick Status Selector */}
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-foreground">Booking Status:</span>
            <div className="flex items-center gap-2">
              {isPending && <IconLoader2 size={15} className="animate-spin text-primary" />}
              <Select
                value={currentStatus}
                onValueChange={handleStatusChange}
                disabled={isPending}
              >
                <SelectTrigger className="h-8 w-36 text-xs rounded-xl bg-background border-border shadow-2xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-theme="company">
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 text-xs">
          {/* Customer Information */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <IconUser size={14} />
                <span>Customer Information</span>
              </h4>
              <Badge variant="outline" className="text-[10px] rounded-md py-0 font-medium">
                {formatCustomerType(extendedProps.customerType)}
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2.5">
              <div className="font-bold text-sm text-foreground">
                {extendedProps.customerName}
              </div>

              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <IconMail size={14} className="text-muted-foreground/70 shrink-0" />
                  <a
                    href={`mailto:${extendedProps.customerEmail}`}
                    className="hover:underline hover:text-foreground text-xs truncate"
                  >
                    {extendedProps.customerEmail}
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <IconPhone size={14} className="text-muted-foreground/70 shrink-0" />
                  <a
                    href={`tel:${extendedProps.customerContact}`}
                    className="hover:underline hover:text-foreground text-xs"
                  >
                    {extendedProps.customerContact || 'No contact provided'}
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Schedule & Specialist Details */}
          <section className="space-y-3">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <IconCalendar size={14} />
              <span>Schedule & Assignment</span>
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Date & Time */}
              <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground uppercase">Date & Time</div>
                <div className="font-bold text-foreground text-xs">
                  {extendedProps.date || event.start.split('T')[0]}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <IconClock size={12} />
                  <span>{extendedProps.time || `${event.start.split('T')[1]?.slice(0, 5)} - ${event.end.split('T')[1]?.slice(0, 5)}`}</span>
                </div>
                {extendedProps.durationMinutes && (
                  <div className="text-[10px] text-muted-foreground pt-0.5">
                    Duration: {extendedProps.durationMinutes} mins
                  </div>
                )}
              </div>

              {/* Specialist */}
              <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground uppercase">Assigned Staff</div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span
                    className="size-3 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: extendedProps.staffColor }}
                  />
                  <span className="font-bold text-foreground text-xs truncate">
                    {extendedProps.staffName}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                  <IconSparkles size={12} />
                  <span>Specialist</span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <IconMapPin size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-medium text-muted-foreground">Branch Location</div>
                <div className="font-bold text-xs text-foreground truncate">
                  {extendedProps.locationName || 'Main Studio / Branch'}
                </div>
              </div>
            </div>
          </section>

          {/* Payment Information */}
          <section className="space-y-3">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <IconCreditCard size={14} />
              <span>Payment Details</span>
            </h4>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconReceipt size={16} className="text-muted-foreground" />
                  <span className="font-medium text-foreground">Service Total</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  ${extendedProps.price?.toFixed(2) ?? '0.00'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {extendedProps.paymentType?.toLowerCase().includes('cash') ? (
                    <IconCash size={15} />
                  ) : (
                    <IconCreditCard size={15} />
                  )}
                  <span>Payment Method</span>
                </div>
                <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  {extendedProps.paymentType || 'Cash'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-muted-foreground">Payment Status</span>
                <Badge variant={paymentStatusVariant} className="rounded-md text-[10px] font-bold uppercase tracking-wider py-0">
                  {extendedProps.paymentStatus || 'unpaid'}
                </Badge>
              </div>
            </div>
          </section>

          {/* Notes if present */}
          {extendedProps.notes && (
            <section className="space-y-2">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Booking Notes
              </h4>
              <div className="p-3 rounded-xl border border-border bg-muted/20 text-foreground whitespace-pre-wrap text-xs leading-relaxed">
                {extendedProps.notes}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2 mt-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-medium"
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
