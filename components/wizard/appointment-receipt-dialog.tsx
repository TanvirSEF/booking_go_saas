'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconPrinter,
  IconBuildingStore,
  IconShieldCheck,
  IconMapPin,
  IconUser,
  IconCut,
  IconCalendar,
  IconSparkles,
} from '@tabler/icons-react';
import type { ConfirmedBookingDetails } from './booking-confirmation-dialog';

export interface AppointmentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: ConfirmedBookingDetails | null;
}

export function AppointmentReceiptDialog({
  open,
  onOpenChange,
  details,
}: AppointmentReceiptDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const origin = useSyncExternalStore(
    () => () => {},
    () => (typeof window !== 'undefined' ? window.location.origin : ''),
    () => ''
  );

  const trackingUrl = details
    ? `${origin || ''}/find-appointment/${details.businessSlug}?number=${encodeURIComponent(
        details.appointmentNumber
      )}&email=${encodeURIComponent(details.customerEmail)}`
    : '';

  useEffect(() => {
    if (!trackingUrl) return;

    let isMounted = true;
    QRCode.toDataURL(trackingUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [trackingUrl]);

  if (!details) return null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-border/80 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Appointment Receipt Voucher</DialogTitle>
          <DialogDescription>
            Official printable voucher and receipt for appointment reference {details.appointmentNumber}.
          </DialogDescription>
        </DialogHeader>

        {/* Printable Ticket Wrapper */}
        <div id="printable-appointment-receipt" className="p-6 sm:p-8 bg-card text-card-foreground">

          {/* Header */}
          <div className="flex items-start justify-between border-b pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <IconBuildingStore size={26} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-base text-foreground">{details.businessName}</h3>
                  <Badge variant="secondary" className="text-[10px] text-emerald-600 bg-emerald-50">
                    <IconShieldCheck size={12} className="mr-0.5" />
                    <span>Verified</span>
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Official Appointment Voucher & Receipt
                </p>
              </div>
            </div>

            {/* Reference Badge */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Booking Reference
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-primary">
                {details.appointmentNumber}
              </span>
            </div>
          </div>

          {/* Ticket Body: Two-Column Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 py-6 border-b">
            {/* Left Specs (8 cols) */}
            <div className="sm:col-span-8 space-y-3.5 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Client Information
                </span>
                <p className="font-semibold text-foreground text-sm">{details.customerName}</p>
                <p className="text-muted-foreground font-mono text-[11px]">{details.customerEmail}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <IconCut size={12} className="text-primary" /> Service
                  </span>
                  <p className="font-bold text-foreground mt-0.5">{details.serviceName}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <IconUser size={12} className="text-primary" /> Specialist
                  </span>
                  <p className="font-bold text-foreground mt-0.5">{details.staffName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <IconMapPin size={12} className="text-primary" /> Location
                  </span>
                  <p className="font-bold text-foreground mt-0.5">{details.locationName}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <IconCalendar size={12} className="text-primary" /> Date & Time
                  </span>
                  <p className="font-bold text-foreground mt-0.5">{details.date}</p>
                  <p className="text-[11px] text-muted-foreground font-mono font-medium">
                    {details.time}
                  </p>
                </div>
              </div>
            </div>

            {/* Right QR Code Voucher Stamp (4 cols) */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/20 border border-dashed border-border text-center">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${details.appointmentNumber}`}
                  className="w-28 h-28 rounded-lg object-contain bg-white p-1 border shadow-xs"
                />
              ) : (
                <div className="w-28 h-28 rounded-lg bg-muted flex items-center justify-center animate-pulse">
                  <IconSparkles size={24} className="text-muted-foreground" />
                </div>
              )}
              <span className="text-[10px] text-muted-foreground font-medium mt-2">
                Scan for Instant Live Tracking
              </span>
            </div>
          </div>

          {/* Pricing & Guarantee Footer */}
          <div className="pt-4 flex items-center justify-between text-xs">
            <div>
              <span className="text-muted-foreground">Total Fee: </span>
              <span className="font-bold text-base text-foreground">
                {details.price === 0
                  ? 'Free'
                  : `${details.currencySymbol}${details.price.toFixed(2)}`}
              </span>
              <Badge variant="outline" className="ml-2 text-[10px] font-semibold">
                Pay at counter
              </Badge>
            </div>

            <div className="text-right text-[11px] text-muted-foreground">
              <span>Status: </span>
              <span className="text-emerald-600 font-bold">Confirmed</span>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (Hidden when printing) */}
        <DialogFooter className="no-print p-4 bg-muted/40 border-t flex flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs cursor-pointer"
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="text-xs gap-1.5 rounded-xl cursor-pointer shadow-sm"
          >
            <IconPrinter size={15} />
            <span>Print Ticket / Voucher</span>
          </Button>
        </DialogFooter>

        {/* Print Media Styling */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-appointment-receipt,
            #printable-appointment-receipt * {
              visibility: visible !important;
            }
            #printable-appointment-receipt {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 800px !important;
              margin: 0 auto !important;
              padding: 24px !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
