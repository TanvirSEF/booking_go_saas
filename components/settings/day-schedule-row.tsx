'use client';

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BreakHoursDialog } from './break-hours-dialog';
import {
  IconCoffee,
  IconAlertCircle,
  IconMoon,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { BreakHourDTO, BusinessHourDTO } from '@/types/business-hours';

interface DayScheduleRowProps {
  schedule: BusinessHourDTO;
  onChange: (updated: BusinessHourDTO) => void;
}

export function DayScheduleRow({ schedule, onChange }: DayScheduleRowProps) {
  const [isBreakDialogOpen, setIsBreakDialogOpen] = useState(false);

  const handleToggleOpen = (isOpen: boolean) => {
    onChange({
      ...schedule,
      isOpen,
    });
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    onChange({
      ...schedule,
      [field]: value,
    });
  };

  const handleBreaksSave = (newBreaks: BreakHourDTO[]) => {
    onChange({
      ...schedule,
      breakHours: newBreaks,
    });
  };

  const isInvalidRange =
    schedule.isOpen && schedule.startTime >= schedule.endTime;

  return (
    <>
      <div
        className={cn(
          'flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-200',
          schedule.isOpen
            ? 'bg-card border-border hover:border-primary/30 shadow-xs'
            : 'bg-muted/20 border-dashed border-border/60 opacity-80'
        )}
      >
        {/* Day identity & toggle */}
        <div className="flex items-center gap-4 min-w-[200px]">
          <Switch
            checked={schedule.isOpen}
            onCheckedChange={handleToggleOpen}
            aria-label={`Toggle open status for ${schedule.dayName}`}
          />

          <div className="flex flex-col">
            <span
              className={cn(
                'text-sm font-semibold tracking-tight transition-colors',
                schedule.isOpen ? 'text-foreground' : 'text-muted-foreground line-through decoration-muted-foreground/40'
              )}
            >
              {schedule.dayName}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {schedule.isOpen ? (
                <span className="text-primary font-semibold">Open for bookings</span>
              ) : (
                'Closed'
              )}
            </span>
          </div>
        </div>

        {/* Operating hours input or Closed state */}
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {schedule.isOpen ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">From</span>
                  <Input
                    type="time"
                    value={schedule.startTime}
                    onChange={(e) => handleTimeChange('startTime', e.target.value)}
                    className={cn(
                      'h-9 w-36 px-3 text-xs font-semibold rounded-xl bg-background border-border shadow-2xs',
                      isInvalidRange && 'border-destructive text-destructive'
                    )}
                  />
                </div>

                <span className="text-xs text-muted-foreground font-bold">—</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">To</span>
                  <Input
                    type="time"
                    value={schedule.endTime}
                    onChange={(e) => handleTimeChange('endTime', e.target.value)}
                    className={cn(
                      'h-9 w-36 px-3 text-xs font-semibold rounded-xl bg-background border-border shadow-2xs',
                      isInvalidRange && 'border-destructive text-destructive'
                    )}
                  />
                </div>

                {isInvalidRange && (
                  <span className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1 sm:mt-0">
                    <IconAlertCircle size={13} />
                    Invalid range
                  </span>
                )}
              </div>

              {/* Breaks section */}
              <div className="flex items-center gap-2 flex-wrap">
                {schedule.breakHours && schedule.breakHours.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {schedule.breakHours.map((brk, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="rounded-lg text-[11px] font-semibold py-1 px-2.5 bg-muted text-muted-foreground border border-border/80 flex items-center gap-1"
                      >
                        <IconCoffee size={12} className="text-primary" />
                        <span>{brk.start} – {brk.end}</span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No breaks</span>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBreakDialogOpen(true)}
                  className="rounded-xl h-8 px-3 text-xs font-medium border-border hover:bg-muted text-foreground gap-1.5 shadow-2xs"
                >
                  <IconCoffee size={14} className="text-muted-foreground" />
                  <span>Manage Breaks</span>
                  {schedule.breakHours && schedule.breakHours.length > 0 && (
                    <span className="ml-0.5 size-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                      {schedule.breakHours.length}
                    </span>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <Badge variant="outline" className="rounded-lg text-xs font-medium border-border/70 text-muted-foreground bg-muted/40 py-1 px-2.5">
                <IconMoon size={12} className="mr-1 opacity-70" />
                Closed for full day
              </Badge>
              <span className="text-[11px]">Customers cannot book appointments on this day.</span>
            </div>
          )}
        </div>
      </div>

      {/* Break Hours Dialog */}
      <BreakHoursDialog
        open={isBreakDialogOpen}
        onOpenChange={setIsBreakDialogOpen}
        dayName={schedule.dayName}
        startTime={schedule.startTime}
        endTime={schedule.endTime}
        breaks={schedule.breakHours || []}
        onSave={handleBreaksSave}
      />
    </>
  );
}
