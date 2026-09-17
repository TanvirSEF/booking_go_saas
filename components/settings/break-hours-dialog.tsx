'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  IconCoffee,
  IconPlus,
  IconTrash,
  IconClock,
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react';
import type { BreakHourDTO, DayName } from '@/types/business-hours';

interface BreakHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayName: DayName;
  startTime: string;
  endTime: string;
  breaks: BreakHourDTO[];
  onSave: (breaks: BreakHourDTO[]) => void;
}

interface BreakHoursFormContentProps {
  dayName: DayName;
  startTime: string;
  endTime: string;
  breaks: BreakHourDTO[];
  onSave: (breaks: BreakHourDTO[]) => void;
  onClose: () => void;
}

function BreakHoursFormContent({
  dayName,
  startTime,
  endTime,
  breaks,
  onSave,
  onClose,
}: BreakHoursFormContentProps) {
  const [localBreaks, setLocalBreaks] = useState<BreakHourDTO[]>(() =>
    breaks.map((b) => ({ ...b }))
  );
  const [error, setError] = useState<string | null>(null);

  const handleAddBreak = () => {
    setError(null);
    let newStart = '13:00';
    let newEnd = '14:00';

    if (startTime > '12:00') {
      newStart = startTime;
      newEnd = endTime;
    } else if (endTime < '14:00') {
      newStart = startTime;
      newEnd = endTime;
    }

    setLocalBreaks((prev) => [...prev, { start: newStart, end: newEnd }]);
  };

  const handleRemoveBreak = (index: number) => {
    setError(null);
    setLocalBreaks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangeBreak = (index: number, field: 'start' | 'end', value: string) => {
    setError(null);
    setLocalBreaks((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleConfirm = () => {
    for (let i = 0; i < localBreaks.length; i++) {
      const b = localBreaks[i];
      if (!b.start || !b.end) {
        setError(`Break #${i + 1} must have both start and end times.`);
        return;
      }
      if (b.start >= b.end) {
        setError(
          `Break #${i + 1} start time (${b.start}) must be strictly earlier than end time (${b.end}).`
        );
        return;
      }
      if (b.start < startTime || b.end > endTime) {
        setError(
          `Break #${i + 1} (${b.start} - ${b.end}) must be within business operating hours (${startTime} - ${endTime}).`
        );
        return;
      }
    }

    const sorted = [...localBreaks].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].end > sorted[i + 1].start) {
        setError(
          `Break times (${sorted[i].start} - ${sorted[i].end}) and (${sorted[i + 1].start} - ${sorted[i + 1].end}) overlap.`
        );
        return;
      }
    }

    onSave(localBreaks);
    onClose();
  };

  return (
    <>
      <DialogHeader className="p-0 text-left">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <IconCoffee size={20} />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-foreground">
              Manage Breaks · {dayName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Operating Hours: <span className="font-semibold text-foreground">{startTime} – {endTime}</span>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2.5 text-xs text-destructive">
          <IconAlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <div className="space-y-3 py-2 max-h-[300px] overflow-y-auto pr-1">
        {localBreaks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
            <IconCoffee className="size-7 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No lunch or rest breaks configured.</p>
            <p className="text-[11px] mt-0.5">Specialists remain bookable for the entire shift.</p>
          </div>
        ) : (
          localBreaks.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-2.5 transition-colors"
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 pl-1">
                <IconClock size={14} />
                <span className="font-medium text-[11px]">#{idx + 1}</span>
              </div>

                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">
                      Start Time
                    </label>
                    <Input
                      type="time"
                      value={item.start}
                      onChange={(e) => handleChangeBreak(idx, 'start', e.target.value)}
                      className="h-9 px-3 text-xs font-medium rounded-xl bg-background border-border shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">
                      End Time
                    </label>
                    <Input
                      type="time"
                      value={item.end}
                      onChange={(e) => handleChangeBreak(idx, 'end', e.target.value)}
                      className="h-9 px-3 text-xs font-medium rounded-xl bg-background border-border shadow-2xs"
                    />
                  </div>
                </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRemoveBreak(idx)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 mt-3"
                title="Remove break"
              >
                <IconTrash size={15} />
              </Button>
            </div>
          ))
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddBreak}
          className="w-full rounded-xl border-dashed border-border hover:border-primary/50 text-xs font-medium gap-1.5 h-9"
        >
          <IconPlus size={15} />
          <span>Add Break Window</span>
        </Button>
      </div>

      <DialogFooter className="gap-2 pt-3 flex flex-row items-center justify-end border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="rounded-xl font-medium"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          className="rounded-xl font-semibold gap-1.5"
        >
          <IconCheck size={16} />
          <span>Apply Breaks</span>
        </Button>
      </DialogFooter>
    </>
  );
}

export function BreakHoursDialog({
  open,
  onOpenChange,
  dayName,
  startTime,
  endTime,
  breaks,
  onSave,
}: BreakHoursDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-theme="company"
        className="w-full max-w-lg sm:max-w-lg rounded-2xl border-border bg-card p-6 shadow-2xl"
      >
        {open && (
          <BreakHoursFormContent
            key={`${dayName}-${open}`}
            dayName={dayName}
            startTime={startTime}
            endTime={endTime}
            breaks={breaks}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
