'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  IconCalendarEvent,
  IconClock,
  IconSparkles,
  IconUser,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useWizard } from '../wizard-context';
import { CalendarPicker } from '../calendar-picker';
import { SlotGrid, type CalculatedSlotItem } from '../slot-grid';
import { SlotSkeleton } from '../slot-skeleton';
import { Badge } from '@/components/ui/badge';

export function Step3DateTimeSlots() {
  const { state, business, catalog, updateDate, updateTimeSlot } = useWizard();
  const {
    selectedDate,
    selectedTimeSlot,
    selectedServiceId,
    selectedLocationId,
    selectedStaffId,
  } = state;

  const [slots, setSlots] = useState<CalculatedSlotItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Selected service details
  const selectedService = useMemo(() => {
    return catalog.services.find((s) => s.id === selectedServiceId);
  }, [catalog.services, selectedServiceId]);

  // Selected staff details
  const selectedStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return catalog.staff.find((stf) => stf.id === selectedStaffId);
  }, [catalog.staff, selectedStaffId]);

  // Compute effective date (defaults to today if not yet selected)
  const effectiveDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [selectedDate]);

  // Live Slot Fetching Effect
  useEffect(() => {
    if (!business.id || !selectedServiceId || !effectiveDate) return;

    let isCancelled = false;

    async function loadLiveSlots() {
      setIsLoading(true);
      setFetchError(null);

      try {
        const params = new URLSearchParams({
          businessId: business.id,
          serviceId: selectedServiceId,
          date: effectiveDate,
        });

        if (selectedLocationId) params.append('locationId', selectedLocationId);
        if (selectedStaffId) params.append('staffId', selectedStaffId);

        const response = await fetch(`/api/slots?${params.toString()}`);
        const data = await response.json();

        if (!isCancelled) {
          if (data.success && Array.isArray(data.slots)) {
            setSlots(data.slots);
          } else {
            setFetchError(data.error || 'Failed to calculate available slots.');
            setSlots([]);
          }
        }
      } catch {
        if (!isCancelled) {
          setFetchError('Network error while retrieving available time slots.');
          setSlots([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadLiveSlots();

    return () => {
      isCancelled = true;
    };
  }, [
    business.id,
    selectedServiceId,
    selectedLocationId,
    selectedStaffId,
    effectiveDate,
    retryCount,
  ]);

  const handleDateSelect = (newDate: string) => {
    updateDate(newDate);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Step Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <IconCalendarEvent className="text-primary" size={22} />
            <span>Choose Date & Time</span>
          </h2>

          {/* Selected Service & Duration Summary Badge */}
          {selectedService && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="bg-primary/5 text-foreground font-semibold flex items-center gap-1">
                <IconSparkles size={13} className="text-primary" />
                <span>{selectedService.name}</span>
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 font-medium">
                <IconClock size={13} className="text-primary" />
                <span>{selectedService.durationMinutes} mins</span>
              </Badge>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Select your preferred appointment date on the calendar, then choose an available start time.
        </p>
      </div>

      {/* Specialist Notice */}
      {selectedStaff && (
        <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <IconUser size={15} className="text-primary" />
            <span>
              Booking with specialist:{' '}
              <strong className="text-foreground">{selectedStaff.name}</strong>
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Filtered availability</span>
        </div>
      )}

      {/* Main Grid: 2 Columns on Tablet/Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Date Picker (5 cols) */}
        <div className="lg:col-span-5 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            1. Select Date
          </label>
          <CalendarPicker
            selectedDate={effectiveDate}
            onSelectDate={handleDateSelect}
            businessHours={business.businessHours}
            holidays={business.holidays}
          />
        </div>

        {/* Right Column: Reactive Time Slots Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            2. Select Time Slot
          </label>

          <div className="bg-card rounded-2xl border p-4 sm:p-5 shadow-xs min-h-[300px] flex flex-col justify-center">
            {fetchError ? (
              <div className="p-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center text-xs text-destructive space-y-2">
                <IconAlertTriangle size={24} className="mx-auto" />
                <p className="font-semibold">{fetchError}</p>
                <button
                  type="button"
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="text-primary underline font-medium hover:text-primary/80 cursor-pointer"
                >
                  Retry Loading Slots
                </button>
              </div>
            ) : isLoading ? (
              <SlotSkeleton />
            ) : (
              <SlotGrid
                slots={slots}
                selectedSlot={selectedTimeSlot}
                onSelectSlot={(slot) => {
                  if (!selectedDate) {
                    updateDate(effectiveDate);
                  }
                  updateTimeSlot(slot);
                }}
                selectedDate={effectiveDate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
