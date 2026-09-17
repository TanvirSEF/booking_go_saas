'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { DayScheduleRow } from './day-schedule-row';
import { updateBusinessHoursAction } from '@/actions/business-hours';
import type { BusinessHourDTO } from '@/types/business-hours';
import {
  IconCheck,
  IconLoader2,
  IconAlertCircle,
  IconRotateClockwise,
  IconInfoCircle,
} from '@tabler/icons-react';

interface BusinessHoursFormProps {
  initialHours: BusinessHourDTO[];
}

const DEFAULT_HOURS: BusinessHourDTO[] = [
  { dayName: 'Monday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
  { dayName: 'Tuesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
  { dayName: 'Wednesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
  { dayName: 'Thursday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
  { dayName: 'Friday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
  { dayName: 'Saturday', isOpen: false, startTime: '09:00', endTime: '18:00', breakHours: [] },
  { dayName: 'Sunday', isOpen: false, startTime: '09:00', endTime: '18:00', breakHours: [] },
];

export function BusinessHoursForm({ initialHours }: BusinessHoursFormProps) {
  // Ensure we have all 7 days represented
  const mergedHours = DEFAULT_HOURS.map((def) => {
    const found = initialHours.find((h) => h.dayName === def.dayName);
    return found ? { ...found, breakHours: found.breakHours || [] } : def;
  });

  const [hours, setHours] = useState<BusinessHourDTO[]>(mergedHours);
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRowChange = (index: number, updated: BusinessHourDTO) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setHours((prev) => prev.map((item, i) => (i === index ? updated : item)));
  };

  const handleApplyToAllWeekdays = () => {
    const monday = hours.find((h) => h.dayName === 'Monday');
    if (!monday) return;

    setHours((prev) =>
      prev.map((item) => {
        if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(item.dayName)) {
          return {
            ...item,
            isOpen: monday.isOpen,
            startTime: monday.startTime,
            endTime: monday.endTime,
            breakHours: monday.breakHours.map((b) => ({ ...b })),
          };
        }
        return item;
      })
    );
    setSuccessMessage('Monday schedule and breaks applied to all weekdays (Mon-Fri).');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    // Validate times
    for (const h of hours) {
      if (h.isOpen) {
        if (h.startTime >= h.endTime) {
          setErrorMessage(
            `${h.dayName}: Opening time (${h.startTime}) must be strictly earlier than closing time (${h.endTime}).`
          );
          return;
        }
        for (const brk of h.breakHours) {
          if (brk.start < h.startTime || brk.end > h.endTime) {
            setErrorMessage(
              `${h.dayName}: Break window (${brk.start} - ${brk.end}) must fall within operating hours (${h.startTime} - ${h.endTime}).`
            );
            return;
          }
        }
      }
    }

    startTransition(async () => {
      const res = await updateBusinessHoursAction(hours);
      if (res.success && res.data) {
        setHours(res.data.businessHours);
        setSuccessMessage('Business operating hours and breaks successfully saved.');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(res.error || 'Failed to update business hours.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informational banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-primary/20 bg-primary/5 text-xs text-foreground">
        <div className="flex items-center gap-2.5">
          <IconInfoCircle size={18} className="text-primary shrink-0" />
          <span className="leading-relaxed">
            Operating hours determine customer booking time slots in real time. Break windows automatically block appointments.
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleApplyToAllWeekdays}
          className="rounded-xl text-xs font-semibold gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <IconRotateClockwise size={14} />
          <span>Copy Monday to Weekdays</span>
        </Button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3 text-xs text-destructive">
          <IconAlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="font-semibold leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3 text-xs text-emerald-600 dark:text-emerald-400">
          <IconCheck size={18} className="shrink-0 mt-0.5" />
          <div className="font-semibold leading-relaxed">{successMessage}</div>
        </div>
      )}

      {/* 7 Days Schedule List */}
      <div className="space-y-3">
        {hours.map((schedule, index) => (
          <DayScheduleRow
            key={schedule.dayName}
            schedule={schedule}
            onChange={(updated) => handleRowChange(index, updated)}
          />
        ))}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xl">
        <p className="text-xs text-muted-foreground hidden sm:block">
          Changes will immediately take effect on the customer booking calendar and slot calculation engine.
        </p>

        <Button
          type="submit"
          disabled={isPending}
          className="rounded-xl font-bold px-6 shadow-md gap-2 ml-auto"
        >
          {isPending ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <IconCheck size={16} />
              <span>Save Operating Hours</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
