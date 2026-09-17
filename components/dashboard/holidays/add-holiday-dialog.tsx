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
  IconCalendarPlus,
  IconCalendar,
  IconCalendarEvent,
  IconCheck,
  IconLoader2,
  IconAlertCircle,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  addBusinessHolidayAction,
  addBusinessHolidayRangeAction,
} from '@/actions/business-holidays';
import type { BusinessHolidayDTO } from '@/types/business-hours';

interface AddHolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHolidayAdded: (updatedHolidays: BusinessHolidayDTO[]) => void;
}

export function AddHolidayDialog({
  open,
  onOpenChange,
  onHolidayAdded,
}: AddHolidayDialogProps) {
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick preset shortcuts
  const handleSetToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (mode === 'single') {
      setSingleDate(todayStr);
    } else {
      setStartDate(todayStr);
    }
  };

  const resetForm = () => {
    setSingleDate('');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setError(null);
  };

  const handleOpenChangeInternal = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'single') {
      if (!singleDate) {
        setError('Please choose a holiday date.');
        return;
      }
    } else {
      if (!startDate || !endDate) {
        setError('Please select both a start and end date for the holiday range.');
        return;
      }
      if (startDate > endDate) {
        setError('Start date must be earlier than or equal to the end date.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === 'single') {
        const res = await addBusinessHolidayAction({
          date: singleDate,
          description: description.trim(),
        });

        if (res.success && res.data) {
          toast.success(`Holiday on ${singleDate} added successfully.`);
          onHolidayAdded(res.data);
          handleOpenChangeInternal(false);
        } else {
          setError(res.error || 'Failed to add holiday.');
          toast.error(res.error || 'Failed to add holiday.');
        }
      } else {
        const res = await addBusinessHolidayRangeAction({
          startDate,
          endDate,
          description: description.trim(),
        });

        if (res.success && res.data) {
          toast.success(`Holiday range (${startDate} to ${endDate}) registered successfully.`);
          onHolidayAdded(res.data);
          handleOpenChangeInternal(false);
        } else {
          setError(res.error || 'Failed to add holiday range.');
          toast.error(res.error || 'Failed to add holiday range.');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeInternal}>
      <DialogContent
        data-theme="company"
        className="w-full max-w-lg sm:max-w-lg rounded-2xl border-border bg-card p-6 shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader className="p-0 text-left">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <IconCalendarPlus size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Add Business Holiday / Off-Day
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Declare closed dates. Public booking slots will be blocked automatically.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Type Selector (Single vs Range) */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/60 border border-border">
            <button
              type="button"
              onClick={() => {
                setMode('single');
                setError(null);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'single'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconCalendar size={14} />
              <span>Single Date</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('range');
                setError(null);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'range'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconCalendarEvent size={14} />
              <span>Date Range (Vacation/Shutdown)</span>
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2.5 text-xs text-destructive">
              <IconAlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Date Picker Section */}
          {mode === 'single' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Holiday Date <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                  Set Today
                </button>
              </div>
              <Input
                type="date"
                value={singleDate}
                onChange={(e) => {
                  setSingleDate(e.target.value);
                  setError(null);
                }}
                className="h-10 text-xs rounded-xl bg-background border-border shadow-2xs"
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Start Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setError(null);
                  }}
                  className="h-10 text-xs rounded-xl bg-background border-border shadow-2xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  End Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setError(null);
                  }}
                  className="h-10 text-xs rounded-xl bg-background border-border shadow-2xs"
                  required
                />
              </div>
            </div>
          )}

          {/* Title / Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Reason / Occasion Title
            </label>
            <Input
              type="text"
              placeholder="e.g. National Independence Day, Annual Maintenance, Eid Holiday"
              value={description}
              maxLength={100}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 text-xs rounded-xl bg-background border-border shadow-2xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Optional name shown internally on the business calendar.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-3 flex flex-row items-center justify-end border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleOpenChangeInternal(false)}
              className="rounded-xl font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-xl font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <IconCheck size={16} />
                  <span>Register Holiday</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
