'use client';

import React from 'react';
import {
  IconClock,
  IconCheck,
  IconCalendarOff,
} from '@tabler/icons-react';
import type { TimeSlotSelection } from '@/types/wizard';

export interface CalculatedSlotItem {
  start: string;
  end: string;
  formattedTime?: string;
  serviceId?: string;
  durationMinutes?: number;
  availableStaffIds?: string[];
}

export interface SlotGridProps {
  slots: CalculatedSlotItem[];
  selectedSlot: TimeSlotSelection | null;
  onSelectSlot: (slot: TimeSlotSelection) => void;
  selectedDate: string;
}

export function SlotGrid({
  slots,
  selectedSlot,
  onSelectSlot,
  selectedDate,
}: SlotGridProps) {
  if (slots.length === 0) {
    return (
      <div className="p-8 border border-dashed rounded-2xl bg-muted/20 text-center space-y-2.5">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <IconCalendarOff size={20} />
        </div>
        <p className="text-sm font-semibold text-foreground">
          No slots available for this date. Please pick another day.
        </p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          All appointment times are fully booked or the business is closed on this date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <IconClock size={14} className="text-primary" />
          <span>Available Time Windows ({slots.length})</span>
        </label>
        <span className="text-[11px] text-muted-foreground font-mono">
          {selectedDate}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
        {slots.map((slot) => {
          const isSelected =
            selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;

          const label = slot.formattedTime || `${slot.start} - ${slot.end}`;

          return (
            <button
              key={`${slot.start}-${slot.end}`}
              type="button"
              onClick={() => onSelectSlot({ start: slot.start, end: slot.end })}
              className={`group relative py-2.5 px-3 rounded-xl border text-center transition-all duration-200 cursor-pointer flex items-center justify-between text-xs font-medium ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30 scale-[1.02]'
                  : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <IconClock
                  size={13}
                  className={isSelected ? 'text-primary-foreground' : 'text-primary'}
                />
                <span className="font-semibold tracking-tight truncate">{label}</span>
              </div>

              {isSelected && (
                <IconCheck size={14} className="stroke-[3] shrink-0 text-primary-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
