'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  IconCheck,
  IconCalendar,
  IconMapPin,
  IconUser,
  IconCut,
  IconSearch,
  IconRefresh,
  IconCopy,
  IconCalendarPlus,
  IconPrinter,
  IconBrandGoogle,
  IconBrandApple,
  IconMail,
  IconChevronDown,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  downloadIcsFile,
  type CalendarEventDetails,
} from '@/lib/calendar-link';
import { AppointmentReceiptDialog } from './appointment-receipt-dialog';

export interface ConfirmedBookingDetails {
  appointmentNumber: string;
  businessSlug: string;
  businessName: string;
  serviceName: string;
  staffName: string;
  locationName: string;
  date: string;
  time: string;
  customerName: string;
  customerEmail: string;
  price: number;
  currencySymbol: string;
}

export interface BookingConfirmationDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  details: ConfirmedBookingDetails;
  onReset?: () => void;
  onBookAnother?: () => void;
}

export function BookingConfirmationDialog({
  open,
  isOpen,
  onOpenChange,
  onClose,
  details,
  onReset,
  onBookAnother,
}: BookingConfirmationDialogProps) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const isDialogOpen = open !== undefined ? open : isOpen !== undefined ? isOpen : false;

  const handleClose = () => {
    onOpenChange?.(false);
    onClose?.();
  };

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(details.appointmentNumber);
      toast.success('Appointment number copied to clipboard!');
    } catch {
      toast.error('Failed to copy appointment number.');
    }
  };

  const calEvent: CalendarEventDetails = {
    title: `Appointment: ${details.serviceName || 'Service'} at ${details.businessName || 'Business'}`,
    description: `Appointment Number: ${details.appointmentNumber}\nSpecialist: ${details.staffName || 'Staff'}\nLocation: ${details.locationName || 'Location'}`,
    location: details.locationName || 'Main Location',
    dateStr: details.date || new Date().toISOString().split('T')[0],
    timeSlot: details.time || '10:00 - 11:00',
    appointmentNumber: details.appointmentNumber,
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={(val) => !val && handleClose()}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-border/80 bg-card text-card-foreground">
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <IconCheck className="h-8 w-8 stroke-[2.5]" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Booking Confirmed!
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Thank you, <span className="font-medium text-foreground">{details.customerName || 'Customer'}</span>. Your appointment has been scheduled.
            </DialogDescription>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Appointment Number
                </span>
                <p className="text-lg font-mono font-bold text-foreground">
                  {details.appointmentNumber}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyNumber}
                className="gap-1.5 text-xs"
              >
                <IconCopy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2.5 rounded-md border border-border/60 p-3 bg-card">
                <IconCut className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground block">Service</span>
                  <span className="font-semibold text-foreground">{details.serviceName || 'Service'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-md border border-border/60 p-3 bg-card">
                <IconUser className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground block">Specialist</span>
                  <span className="font-semibold text-foreground">{details.staffName || 'Assigned Staff'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-md border border-border/60 p-3 bg-card">
                <IconCalendar className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground block">Date & Time</span>
                  <span className="font-semibold text-foreground">
                    {details.date || 'Scheduled Date'} {details.time ? `(${details.time})` : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-md border border-border/60 p-3 bg-card">
                <IconMapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground block">Location</span>
                  <span className="font-semibold text-foreground">{details.locationName || 'Main Location'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total Paid / Due</span>
              <span className="text-lg font-bold text-foreground">
                {details.currencySymbol || '$'}{Number(details.price || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border bg-muted/20 px-6 py-4">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <IconCalendarPlus className="h-3.5 w-3.5 text-primary" />
                    Add to Calendar
                    <IconChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={() => window.open(getGoogleCalendarUrl(calEvent), '_blank')}
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <IconBrandGoogle className="h-3.5 w-3.5" />
                    Google Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => window.open(getOutlookCalendarUrl(calEvent), '_blank')}
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <IconMail className="h-3.5 w-3.5" />
                    Outlook Web
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => downloadIcsFile(calEvent)}
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <IconBrandApple className="h-3.5 w-3.5" />
                    iCal / Apple (.ics)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setReceiptOpen(true)}
                className="gap-1.5 text-xs"
              >
                <IconPrinter className="h-3.5 w-3.5" />
                View Receipt
              </Button>
            </div>

            <div className="flex gap-2 ml-auto w-full sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                asChild
                className="gap-1.5 text-xs"
              >
                <Link href={`/find-appointment/${details.appointmentNumber}`}>
                  <IconSearch className="h-3.5 w-3.5" />
                  Track Booking
                </Link>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  handleClose();
                  onReset?.();
                  onBookAnother?.();
                }}
                className="gap-1.5 text-xs"
              >
                <IconRefresh className="h-3.5 w-3.5" />
                Book Another
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppointmentReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        details={{
          appointmentNumber: details.appointmentNumber,
          businessSlug: details.businessSlug || '',
          businessName: details.businessName || '',
          serviceName: details.serviceName || '',
          staffName: details.staffName || '',
          locationName: details.locationName || '',
          date: details.date || '',
          time: details.time || '',
          customerName: details.customerName || '',
          customerEmail: details.customerEmail || '',
          price: details.price || 0,
          currencySymbol: details.currencySymbol || '$',
        }}
      />
    </>
  );
}
