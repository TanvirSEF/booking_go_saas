'use client';

import React from 'react';
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconUser,
  IconCut,
  IconCheck,
  IconCash,
  IconMail,
  IconPhone,
  IconFileDescription,
  IconCopy,
  IconPrinter,
  IconCircleCheck,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { TrackingDetails } from '@/actions/appointment';

export interface AppointmentStatusCardProps {
  appointment: TrackingDetails;
}

export function AppointmentStatusCard({ appointment }: AppointmentStatusCardProps) {
  const handleCopyNumber = () => {
    if (appointment.appointmentNumber) {
      navigator.clipboard.writeText(appointment.appointmentNumber);
      toast.success('Appointment reference copied to clipboard!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Status color badge formatting
  const getStatusBadge = () => {
    const status = appointment.appointmentStatus?.toLowerCase() || 'pending';

    if (status === 'completed') {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1 flex items-center gap-1.5">
          <IconCircleCheck size={14} />
          <span>Completed</span>
        </Badge>
      );
    }

    if (status === 'confirmed') {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold px-3 py-1 flex items-center gap-1.5">
          <IconCheck size={14} className="stroke-[3]" />
          <span>Confirmed</span>
        </Badge>
      );
    }

    if (status === 'cancelled') {
      return (
        <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-xs font-semibold px-3 py-1">
          Cancelled
        </Badge>
      );
    }

    return (
      <Badge
        className="text-xs font-semibold px-3 py-1 border shadow-xs"
        style={{
          backgroundColor: `${appointment.statusColor || '#21c9b0'}20`,
          color: appointment.statusColor || '#21c9b0',
          borderColor: `${appointment.statusColor || '#21c9b0'}50`,
        }}
      >
        {appointment.appointmentStatus || 'Pending'}
      </Badge>
    );
  };

  return (
    <div className="bg-card rounded-2xl border border-border/80 shadow-lg overflow-hidden animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-card p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Appointment Reference
            </span>
            <button
              type="button"
              onClick={handleCopyNumber}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Copy number"
            >
              <IconCopy size={13} />
            </button>
          </div>
          <h2 className="text-2xl font-mono font-extrabold text-foreground tracking-tight mt-0.5">
            {appointment.appointmentNumber}
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          {getStatusBadge()}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1.5 text-xs rounded-xl print:hidden cursor-pointer"
          >
            <IconPrinter size={14} />
            <span className="hidden sm:inline">Print Receipt</span>
          </Button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="p-6 space-y-6">
        {/* Core Specs 4-Box Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Service */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IconCut size={14} className="text-primary" />
              <span>Service</span>
            </span>
            <div className="mt-2">
              <p className="font-bold text-sm text-foreground">{appointment.serviceName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {appointment.durationMinutes} minutes duration
              </p>
            </div>
          </div>

          {/* Specialist */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IconUser size={14} className="text-primary" />
              <span>Specialist</span>
            </span>
            <div className="mt-2">
              <p className="font-bold text-sm text-foreground">{appointment.staffName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Assigned Specialist</p>
            </div>
          </div>

          {/* Location */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IconMapPin size={14} className="text-primary" />
              <span>Branch Location</span>
            </span>
            <div className="mt-2">
              <p className="font-bold text-sm text-foreground">{appointment.locationName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Physical Visit</p>
            </div>
          </div>

          {/* Date & Time Window */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IconCalendar size={14} className="text-primary" />
              <span>Schedule</span>
            </span>
            <div className="mt-2">
              <p className="font-bold text-sm text-foreground font-mono">{appointment.date}</p>
              <p className="text-xs text-primary font-semibold font-mono flex items-center gap-1 mt-0.5">
                <IconClock size={12} />
                <span>{appointment.time}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown: Customer Info & Financials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Customer Information Box */}
          <div className="p-5 rounded-2xl border bg-card/60 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IconUser size={14} className="text-primary" />
              <span>Customer Details</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Name</span>
                <span className="font-semibold text-foreground">{appointment.customerName}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1">
                  <IconMail size={12} />
                  <span>Email</span>
                </span>
                <span className="font-medium text-foreground">{appointment.customerEmail}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1">
                  <IconPhone size={12} />
                  <span>Phone</span>
                </span>
                <span className="font-medium text-foreground">{appointment.customerContact}</span>
              </div>
            </div>

            {appointment.notes && (
              <div className="mt-3 p-3 rounded-xl bg-muted/30 border text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1 mb-1">
                  <IconFileDescription size={13} className="text-primary" />
                  <span>Special Notes:</span>
                </span>
                <p className="text-muted-foreground leading-relaxed">{appointment.notes}</p>
              </div>
            )}
          </div>

          {/* Payment & Status Summary Box */}
          <div className="p-5 rounded-2xl border bg-card/60 space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                <IconCash size={14} className="text-primary" />
                <span>Payment Summary</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <Badge variant="outline" className="text-[11px] font-medium">
                    {appointment.paymentType || 'Pay at Counter'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payment Status</span>
                  {appointment.paymentStatus === 'paid' ? (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-[11px]"
                    >
                      Paid
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold text-[11px]"
                    >
                      Unpaid
                    </Badge>
                  )}
                </div>

                <div className="pt-3 border-t flex items-center justify-between text-base font-bold text-foreground">
                  <span>Total Amount</span>
                  <span className="text-lg text-primary">${appointment.price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground">
              Booked on: {new Date(appointment.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
