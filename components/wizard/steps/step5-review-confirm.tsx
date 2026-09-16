'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  IconChecklist,
  IconMapPin,
  IconCut,
  IconUser,
  IconCalendar,
  IconClock,
  IconCreditCard,
  IconCash,
  IconAlertTriangle,
  IconShieldCheck,
  IconArrowLeft,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { useWizard } from '../wizard-context';
import { createAppointment } from '@/actions/appointment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookingConfirmationDialog,
  type ConfirmedBookingDetails,
} from '../booking-confirmation-dialog';

export function Step5ReviewConfirm() {
  const { state, business, catalog, setStep, resetWizard, setIsSubmitting } = useWizard();
  const {
    selectedLocationId,
    selectedServiceId,
    selectedStaffId,
    selectedDate,
    selectedTimeSlot,
    customer,
    paymentType,
  } = state;

  const [isPending, startTransition] = useTransition();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [confirmationDetails, setConfirmationDetails] = useState<ConfirmedBookingDetails | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  // Resolved entities
  const selectedLocation = useMemo(() => {
    return catalog.locations.find((l) => l.id === selectedLocationId);
  }, [catalog.locations, selectedLocationId]);

  const selectedService = useMemo(() => {
    return catalog.services.find((s) => s.id === selectedServiceId);
  }, [catalog.services, selectedServiceId]);

  const selectedStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return catalog.staff.find((stf) => stf.id === selectedStaffId);
  }, [catalog.staff, selectedStaffId]);

  // Formatted date string
  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      // Fallback
    }
    return selectedDate;
  }, [selectedDate]);

  // Auto-resolve staff if "Any Specialist" was chosen
  const effectiveStaffId = useMemo(() => {
    if (selectedStaffId) return selectedStaffId;
    // Find first staff offering this service and at this location
    const matched = catalog.staff.find((stf) => {
      const matchLoc =
        !selectedLocationId ||
        !stf.locationIds ||
        stf.locationIds.length === 0 ||
        stf.locationIds.includes(selectedLocationId);
      const matchSrv =
        !selectedServiceId ||
        !stf.serviceIds ||
        stf.serviceIds.length === 0 ||
        stf.serviceIds.includes(selectedServiceId);
      return matchLoc && matchSrv;
    });
    return matched?.id || catalog.staff[0]?.id || '';
  }, [catalog.staff, selectedStaffId, selectedLocationId, selectedServiceId]);

  const handleConfirmBooking = () => {
    if (!selectedService || !selectedLocation || !selectedDate || !selectedTimeSlot) {
      toast.error('Missing required booking details. Please review your choices.');
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);

    startTransition(async () => {
      try {
        const slotTime = `${selectedTimeSlot.start} - ${selectedTimeSlot.end}`;

        const result = await createAppointment({
          businessId: business.id,
          serviceId: selectedService.id,
          staffId: effectiveStaffId,
          locationId: selectedLocation.id,
          date: selectedDate,
          time: slotTime,
          customerType: customer.customerType,
          name: customer.name,
          email: customer.email,
          contact: customer.contact,
          password: customer.password,
          gender: customer.gender,
          dob: customer.dob,
          notes: customer.notes,
          paymentType: paymentType || 'Manually',
          customFields: customer.customFields,
        });

        if (result.success && result.appointmentNumber) {
          toast.success(result.message || 'Appointment booked successfully!');
          setConfirmationDetails({
            appointmentNumber: result.appointmentNumber,
            businessSlug: business.slug,
            businessName: business.name,
            serviceName: selectedService.name,
            staffName: selectedStaff ? selectedStaff.name : 'First Available Specialist',
            locationName: selectedLocation.name,
            date: formattedDate,
            time: `${selectedTimeSlot.start} - ${selectedTimeSlot.end}`,
            customerName: customer.name,
            customerEmail: customer.email,
            price: selectedService.price || 0,
            currencySymbol: business.currencySymbol || '$',
          });
          setIsConfirmationOpen(true);
        } else {
          const errorMsg =
            result.error ||
            'Slot is fully booked for this staff member. Please select another slot.';
          setSubmissionError(errorMsg);
          toast.error(errorMsg);
        }
      } catch {
        const fallbackError = 'An unexpected server error occurred. Please try again.';
        setSubmissionError(fallbackError);
        toast.error(fallbackError);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <IconChecklist className="text-primary" size={22} />
          <span>Review & Confirm Booking</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Please verify your appointment details before placing your confirmation.
        </p>
      </div>

      {/* Submission Error Alert */}
      {submissionError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start justify-between gap-3 animate-in shake duration-300">
          <div className="flex items-start gap-2.5">
            <IconAlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Booking Slot Conflict</p>
              <p className="mt-0.5 leading-relaxed">{submissionError}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setStep(3)}
            className="text-xs shrink-0 border-destructive/40 hover:bg-destructive/15 cursor-pointer font-medium"
          >
            <IconArrowLeft size={13} className="mr-1" />
            <span>Pick Another Slot</span>
          </Button>
        </div>
      )}

      {/* Main Review Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Service & Booking Summary Card (7 cols) */}
        <div className="lg:col-span-7 bg-card rounded-2xl border p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <IconCut size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {selectedService?.name || 'Selected Service'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedLocation?.name || 'Main Branch'}
                </p>
              </div>
            </div>

            <div className="text-right">
              {selectedService?.isFree ? (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  Free
                </Badge>
              ) : (
                <span className="text-base font-bold text-foreground">
                  {business.currencySymbol || '$'}
                  {selectedService?.price.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Key Appointment Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Location */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold uppercase tracking-wider">
                <IconMapPin size={13} className="text-primary" />
                <span>Location</span>
              </span>
              <p className="font-semibold text-foreground">{selectedLocation?.name}</p>
              {selectedLocation?.address && (
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {selectedLocation.address}
                </p>
              )}
            </div>

            {/* Specialist */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold uppercase tracking-wider">
                <IconUser size={13} className="text-primary" />
                <span>Specialist</span>
              </span>
              <p className="font-semibold text-foreground">
                {selectedStaff ? selectedStaff.name : 'Any Specialist (First Available)'}
              </p>
              <p className="text-[11px] text-muted-foreground">Assigned professional</p>
            </div>

            {/* Date */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold uppercase tracking-wider">
                <IconCalendar size={13} className="text-primary" />
                <span>Date</span>
              </span>
              <p className="font-semibold text-foreground">{formattedDate}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{selectedDate}</p>
            </div>

            {/* Time Slot & Duration */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold uppercase tracking-wider">
                <IconClock size={13} className="text-primary" />
                <span>Time & Duration</span>
              </span>
              <p className="font-semibold text-foreground font-mono">
                {selectedTimeSlot ? `${selectedTimeSlot.start} - ${selectedTimeSlot.end}` : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {selectedService?.durationMinutes} minutes session
              </p>
            </div>
          </div>

          {/* Customer Details Summary */}
          <div className="pt-3 border-t text-xs space-y-2">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
              Customer Information
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Name</span>
                <span className="font-medium text-foreground">{customer.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Email</span>
                <span className="font-medium text-foreground truncate block">{customer.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Phone</span>
                <span className="font-medium text-foreground">{customer.contact}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Account Type</span>
                <span className="font-medium text-foreground capitalize">
                  {customer.customerType.replace('-', ' ')}
                </span>
              </div>
            </div>
            {customer.notes && (
              <div className="mt-2 p-2.5 rounded-lg bg-muted/20 border text-[11px]">
                <span className="font-semibold text-foreground">Notes: </span>
                <span className="text-muted-foreground">{customer.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Payment Method & Terms (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Payment Method Selector */}
          <div className="bg-card rounded-2xl border p-5 shadow-xs space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
              <IconCreditCard size={14} className="text-primary" />
              <span>Payment Method</span>
            </label>

            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <IconCash size={18} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground">
                    Pay at Counter / Manually
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Pay upon arrival at the salon or branch
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold">
                Default
              </Badge>
            </div>
          </div>

          {/* Pricing Total Summary */}
          <div className="bg-card rounded-2xl border p-5 shadow-xs space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Service Subtotal</span>
              <span className="font-medium text-foreground">
                {business.currencySymbol || '$'}
                {selectedService?.price.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Booking Fee</span>
              <span className="text-emerald-600 font-medium">Free</span>
            </div>
            <div className="pt-2.5 border-t flex items-center justify-between text-sm font-bold text-foreground">
              <span>Total Payable</span>
              <span className="text-base text-primary">
                {business.currencySymbol || '$'}
                {selectedService?.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Guarantee / Security Notice */}
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
            <IconShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Instant Reservation</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Your appointment request is transmitted directly into the scheduling calendar.
              </p>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(4)}
              disabled={isPending}
              className="h-11 px-4 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5"
            >
              <IconArrowLeft size={14} />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              onClick={handleConfirmBooking}
              disabled={isPending}
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all text-sm cursor-pointer"
            >
              {isPending ? 'Confirming Appointment...' : 'Confirm Appointment'}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <BookingConfirmationDialog
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        details={confirmationDetails}
        onReset={resetWizard}
      />
    </div>
  );
}
