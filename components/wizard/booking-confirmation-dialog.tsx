'use client';

import React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconCheck,
  IconCalendar,
  IconMapPin,
  IconUser,
  IconCut,
  IconSearch,
  IconRefresh,
  IconCopy,
} from '@tabler/icons-react';
import { toast } from 'sonner';

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: ConfirmedBookingDetails | null;
  onReset: () => void;
}

export function BookingConfirmationDialog({
  open,
  onOpenChange,
  details,
  onReset,
}: BookingConfirmationDialogProps) {
  if (!details) return null;

  const handleCopyAppointmentNumber = () => {
    if (details.appointmentNumber) {
      navigator.clipboard.writeText(details.appointmentNumber);
      toast.success('Appointment number copied to clipboard!');
    }
  };

  const handleBookAnother = () => {
    onOpenChange(false);
    onReset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/70 shadow-2xl">
        {/* Header Banner */}
        <div className="bg-emerald-600 text-white p-6 text-center relative">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 text-white ring-4 ring-white/30">
            <IconCheck size={28} className="stroke-[3]" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-white">
            Appointment Confirmed!
          </DialogTitle>
          <DialogDescription className="text-xs text-white/90 mt-1 max-w-sm mx-auto">
            Your booking request has been confirmed. A confirmation receipt has been scheduled.
          </DialogDescription>
        </div>

        {/* Confirmation Content */}
        <div className="p-6 space-y-5">
          {/* Appointment Reference Box */}
          <div className="p-4 rounded-xl bg-muted/40 border flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Appointment Reference
              </span>
              <span className="text-lg font-mono font-bold text-foreground">
                {details.appointmentNumber}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyAppointmentNumber}
              className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
            >
              <IconCopy size={13} />
              <span>Copy</span>
            </Button>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <IconCut size={14} className="text-primary" />
                <span>Service</span>
              </span>
              <span className="font-semibold text-foreground">{details.serviceName}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <IconUser size={14} className="text-primary" />
                <span>Specialist</span>
              </span>
              <span className="font-medium text-foreground">{details.staffName}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <IconMapPin size={14} className="text-primary" />
                <span>Location</span>
              </span>
              <span className="font-medium text-foreground">{details.locationName}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <IconCalendar size={14} className="text-primary" />
                <span>Date & Time</span>
              </span>
              <div className="flex items-center gap-1 font-semibold text-foreground">
                <span>{details.date}</span>
                <span className="text-muted-foreground">@</span>
                <Badge variant="outline" className="font-mono text-[11px] font-bold">
                  {details.time}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Client Name</span>
              <span className="font-medium text-foreground">{details.customerName}</span>
            </div>
          </div>
        </div>

        {/* Dialog Footer Actions */}
        <DialogFooter className="p-6 pt-0 bg-card flex flex-col-reverse sm:flex-row gap-2 sm:justify-between border-t border-border/40 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleBookAnother}
            className="flex items-center gap-1.5 text-xs font-medium cursor-pointer w-full sm:w-auto"
          >
            <IconRefresh size={14} />
            <span>Book Another</span>
          </Button>

          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 text-xs font-medium w-full sm:w-auto shadow-sm"
          >
            <Link
              href={`/find-appointment/${details.businessSlug}?number=${encodeURIComponent(details.appointmentNumber)}&email=${encodeURIComponent(details.customerEmail)}`}
            >
              <IconSearch size={14} />
              <span>Track Appointment</span>
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
