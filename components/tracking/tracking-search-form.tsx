'use client';

import React, { useState, useTransition, useEffect, useCallback } from 'react';
import {
  IconSearch,
  IconMail,
  IconHash,
  IconLoader2,
  IconAlertCircle,
  IconSparkles,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  getAppointmentTracking,
  type TrackingDetails,
} from '@/actions/appointment';
import { AppointmentStatusCard } from './appointment-status-card';

export interface TrackingSearchFormProps {
  initialNumber?: string;
  initialEmail?: string;
}

export function TrackingSearchForm({
  initialNumber = '',
  initialEmail = '',
}: TrackingSearchFormProps) {
  const [appointmentNumber, setAppointmentNumber] = useState(initialNumber);
  const [email, setEmail] = useState(initialEmail);
  const [isPending, startTransition] = useTransition();

  const [appointment, setAppointment] = useState<TrackingDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback((overrideNumber?: string, overrideEmail?: string) => {
    const searchNumber = (overrideNumber !== undefined ? overrideNumber : appointmentNumber).trim();
    const searchEmail = (overrideEmail !== undefined ? overrideEmail : email).toLowerCase().trim();

    if (!searchNumber) {
      toast.error('Please enter an appointment tracking number.');
      return;
    }

    if (!searchEmail) {
      toast.error('Please enter the customer email address.');
      return;
    }

    setErrorMessage(null);
    setAppointment(null);
    setHasSearched(true);

    startTransition(async () => {
      try {
        const result = await getAppointmentTracking(searchNumber, searchEmail);

        if (result.success && result.appointment) {
          setAppointment(result.appointment);
          toast.success('Appointment details retrieved.');
        } else {
          const msg =
            result.error ||
            'No appointment found matching this tracking number and email.';
          setErrorMessage(msg);
          setAppointment(null);
        }
      } catch {
        const fallback = 'Failed to retrieve appointment details. Please try again.';
        setErrorMessage(fallback);
        toast.error(fallback);
      }
    });
  }, [appointmentNumber, email]);

  // Auto-search if initial parameters were provided in URL
  useEffect(() => {
    if (!initialNumber || !initialEmail) return;

    let isMounted = true;

    async function autoFetch() {
      try {
        const result = await getAppointmentTracking(
          initialNumber.trim(),
          initialEmail.toLowerCase().trim()
        );
        if (isMounted) {
          setHasSearched(true);
          if (result.success && result.appointment) {
            setAppointment(result.appointment);
          } else {
            setErrorMessage(
              result.error || 'No appointment found matching this tracking number and email.'
            );
          }
        }
      } catch {
        if (isMounted) {
          setHasSearched(true);
          setErrorMessage('Failed to retrieve appointment details. Please try again.');
        }
      }
    }

    autoFetch();

    return () => {
      isMounted = false;
    };
  }, [initialNumber, initialEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleFillDemo = () => {
    setAppointmentNumber('#APP0001');
    setEmail('john.doe@example.com');
    handleSearch('#APP0001', 'john.doe@example.com');
  };

  return (
    <div className="space-y-8">
      {/* Search Input Card */}
      <Card className="border-border/70 shadow-lg shadow-black/5 overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <IconSearch className="text-primary" size={22} />
                <span>Search Booking Status</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your appointment confirmation number and email address to view live scheduling and payment updates.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 1: Appointment Number */}
              <div className="space-y-1.5">
                <Label htmlFor="app-num" className="text-xs font-semibold">
                  Appointment Number <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <IconHash
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="app-num"
                    placeholder="e.g., #APP0001"
                    value={appointmentNumber}
                    onChange={(e) => setAppointmentNumber(e.target.value)}
                    className="pl-9 h-11 font-mono uppercase text-sm rounded-xl"
                  />
                </div>
              </div>

              {/* Field 2: Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="app-email" className="text-xs font-semibold">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <IconMail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="app-email"
                    type="email"
                    placeholder="e.g., john.doe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11 text-sm rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              {/* Demo Helper Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFillDemo}
                className="text-xs text-muted-foreground hover:text-primary gap-1.5 order-2 sm:order-1 cursor-pointer"
              >
                <IconSparkles size={14} className="text-primary" />
                <span>Try Demo Query (#APP0001)</span>
              </Button>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 px-6 rounded-xl flex items-center gap-2 font-medium shadow-sm w-full sm:w-auto order-1 sm:order-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <IconLoader2 size={16} className="animate-spin" />
                    <span>Searching Status...</span>
                  </>
                ) : (
                  <>
                    <IconSearch size={16} />
                    <span>Find Appointment</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Alert Display */}
      {errorMessage && (
        <div className="p-5 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-3 animate-in fade-in-50 duration-200">
          <IconAlertCircle size={22} className="shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold">Appointment Not Found</h3>
            <p className="text-xs text-destructive/90 mt-1 leading-relaxed">
              {errorMessage}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              Double-check that you entered the exact appointment reference number (including prefix e.g. <span className="font-mono font-semibold">#APP0001</span>) and the matching email address.
            </p>
          </div>
        </div>
      )}

      {/* Success Result Card */}
      {appointment && <AppointmentStatusCard appointment={appointment} />}

      {/* Initial Empty Guide */}
      {!hasSearched && !appointment && (
        <div className="p-8 border border-dashed rounded-2xl bg-muted/20 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <IconSearch size={24} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Self-Service Lookup</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Need to check the status or schedule of an existing appointment? Enter your tracking details above.
          </p>
        </div>
      )}
    </div>
  );
}
