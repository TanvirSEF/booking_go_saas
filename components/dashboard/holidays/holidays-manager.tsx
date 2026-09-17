'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AddHolidayDialog } from './add-holiday-dialog';
import { HolidayDataTable } from './holiday-data-table';
import {
  IconCalendarPlus,
  IconInfoCircle,
} from '@tabler/icons-react';
import type { BusinessHolidayDTO } from '@/types/business-hours';

interface HolidaysManagerProps {
  initialHolidays: BusinessHolidayDTO[];
}

export function HolidaysManager({ initialHolidays }: HolidaysManagerProps) {
  const [holidays, setHolidays] = useState<BusinessHolidayDTO[]>(initialHolidays);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Informational Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-primary/20 bg-primary/5 text-xs text-foreground">
        <div className="flex items-center gap-3">
          <IconInfoCircle size={20} className="text-primary shrink-0" />
          <div>
            <p className="font-bold text-foreground">
              Official Holidays & Annual Shutdowns
            </p>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Dates registered here are automatically blocked across all specialist appointment schedules and booking wizard calendars.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setIsAddDialogOpen(true)}
          className="rounded-xl font-bold text-xs gap-1.5 shrink-0 shadow-sm"
        >
          <IconCalendarPlus size={16} />
          <span>Add Holiday</span>
        </Button>
      </div>

      {/* Holiday Data Table */}
      <HolidayDataTable
        holidays={holidays}
        onHolidaysChange={(updated) => setHolidays(updated)}
      />

      {/* Add Holiday Dialog */}
      <AddHolidayDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onHolidayAdded={(updated) => setHolidays(updated)}
      />
    </div>
  );
}
