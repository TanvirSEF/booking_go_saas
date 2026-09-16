'use client';

import React, { useState, useMemo } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import type { ClientBusinessHour, ClientHoliday } from '@/types/wizard';

export interface CalendarPickerProps {
  selectedDate: string; // 'YYYY-MM-DD'
  onSelectDate: (date: string) => void;
  businessHours?: ClientBusinessHour[];
  holidays?: ClientHoliday[];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const DAY_INDEX_MAP: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export function CalendarPicker({
  selectedDate,
  onSelectDate,
  businessHours = [],
  holidays = [],
}: CalendarPickerProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [currentYear, setCurrentYear] = useState(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) return parseInt(parts[0], 10);
    }
    return new Date().getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) return parseInt(parts[1], 10) - 1;
    }
    return new Date().getMonth();
  });

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Build matrix of calendar days for the current month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday ... 6 = Saturday
    const totalDays = lastDayOfMonth.getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isToday: boolean;
      isSelected: boolean;
      holidayReason?: string;
    }> = [];

    // Prepend empty padding for previous month's days
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        dateStr: '',
        dayNumber: 0,
        isCurrentMonth: false,
        isDisabled: true,
        isToday: false,
        isSelected: false,
      });
    }

    // Populate current month's days
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      dateObj.setHours(0, 0, 0, 0);

      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // 1. Is past date?
      const isPast = dateObj < today;

      // 2. Is closed day of week?
      const dayName = DAY_INDEX_MAP[dateObj.getDay()];
      const daySchedule = businessHours.find((bh) => bh.dayName === dayName);
      const isClosedDay = daySchedule ? !daySchedule.isOpen : false;

      // 3. Is holiday?
      const holiday = holidays.find(
        (h) => h.date === dateStr || h.date === `${dd}-${mm}-${yyyy}`
      );
      const isHoliday = Boolean(holiday);

      const isDisabled = isPast || isClosedDay || isHoliday;
      const isTodayDate = dateObj.getTime() === today.getTime();
      const isSelectedDate = selectedDate === dateStr;

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isDisabled,
        isToday: isTodayDate,
        isSelected: isSelectedDate,
        holidayReason: holiday?.description,
      });
    }

    return days;
  }, [currentYear, currentMonth, today, selectedDate, businessHours, holidays]);

  return (
    <div className="w-full bg-card rounded-2xl border p-4 sm:p-5 shadow-xs">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IconCalendar size={18} className="text-primary" />
          <h3 className="font-bold text-sm text-foreground">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <IconChevronLeft size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <IconChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Weekday Names */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {WEEKDAY_NAMES.map((name, i) => (
          <span
            key={name}
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              i === 0 ? 'text-destructive/80' : 'text-muted-foreground'
            }`}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((item, index) => {
          if (!item.isCurrentMonth) {
            return <div key={`empty-${index}`} className="h-9 w-full" />;
          }

          return (
            <button
              key={item.dateStr}
              type="button"
              disabled={item.isDisabled}
              onClick={() => onSelectDate(item.dateStr)}
              className={`group relative h-9 w-full rounded-xl flex items-center justify-center text-xs font-semibold transition-all duration-150 ${
                item.isSelected
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm scale-105 z-10'
                  : item.isDisabled
                    ? 'text-muted-foreground/35 cursor-not-allowed line-through decoration-muted-foreground/40'
                    : 'text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer'
              } ${item.isToday && !item.isSelected ? 'border border-primary/40 font-bold text-primary' : ''}`}
            >
              <span>{item.dayNumber}</span>
              {item.isToday && !item.isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
