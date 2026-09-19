'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconCalendar,
  IconClock,
  IconLoader2,
  IconAlertCircle,
  IconCalendarTime,
  IconUser,
} from '@tabler/icons-react';
import { rescheduleAppointment } from '@/actions/appointment-query';
import type { StaffFilterOption } from './appointment-table-filters';

interface AppointmentRescheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  appointmentNumber: string;
  customerName: string;
  serviceName: string;
  currentDate: string;
  currentTime: string;
  currentStaffId?: string;
  staffName?: string;
  staffList?: StaffFilterOption[];
  businessId?: string;
  serviceId?: string;
  onSuccess?: () => void;
}

const COMMON_SLOTS = [
  '09:00 - 09:30',
  '09:30 - 10:00',
  '10:00 - 10:30',
  '10:30 - 11:00',
  '11:00 - 11:30',
  '11:30 - 12:00',
  '12:00 - 12:30',
  '14:00 - 14:30',
  '14:30 - 15:00',
  '15:00 - 15:30',
  '15:30 - 16:00',
  '16:00 - 16:30',
  '16:30 - 17:00',
  '17:00 - 17:30',
];

export function AppointmentRescheduleDialog({
  isOpen,
  onClose,
  appointmentId,
  appointmentNumber,
  customerName,
  serviceName,
  currentDate,
  currentTime,
  currentStaffId,
  staffName,
  staffList = [],
  businessId,
  serviceId,
  onSuccess,
}: AppointmentRescheduleDialogProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(currentDate || '');
  const [selectedTime, setSelectedTime] = useState(currentTime || '');
  const [selectedStaffId, setSelectedStaffId] = useState(currentStaffId || '');
  const [availableSlots, setAvailableSlots] = useState<string[]>(COMMON_SLOTS);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch slots from API if businessId and serviceId are provided
  useEffect(() => {
    if (!isOpen || !selectedDate || !businessId || !serviceId) {
      return;
    }

    let isMounted = true;
    async function fetchSlots() {
      try {
        setIsLoadingSlots(true);
        const queryStaff = selectedStaffId || currentStaffId || '';
        const res = await fetch(
          `/api/slots?businessId=${businessId}&serviceId=${serviceId}&date=${selectedDate}${queryStaff ? `&staffId=${queryStaff}` : ''}`
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (Array.isArray(data.slots) && data.slots.length > 0) {
              const formatted = data.slots.map(
                (s: { formattedTime?: string; time?: string; label?: string } | string) =>
                  typeof s === 'string' ? s : s.formattedTime || s.time || s.label || ''
              ).filter(Boolean);
              setAvailableSlots(formatted.length > 0 ? formatted : COMMON_SLOTS);
            } else {
              setAvailableSlots(COMMON_SLOTS);
            }
          }
        } else {
          if (isMounted) setAvailableSlots(COMMON_SLOTS);
        }
      } catch (err) {
        console.error('Failed to fetch available slots', err);
        if (isMounted) setAvailableSlots(COMMON_SLOTS);
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    }

    fetchSlots();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDate, selectedStaffId, businessId, serviceId, currentStaffId]);

  const handleReschedule = async () => {
    if (!selectedDate) {
      setErrorMessage('Please select a valid new date.');
      return;
    }
    if (!selectedTime || !selectedTime.trim()) {
      setErrorMessage('Please select or specify a time slot (e.g. 11:00 - 11:30).');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await rescheduleAppointment({
        appointmentId,
        newDate: selectedDate,
        newTime: selectedTime.trim(),
        newStaffId: selectedStaffId || undefined,
      });

      if (res.success) {
        toast.success(res.message || 'Appointment rescheduled successfully!');
        if (onSuccess) onSuccess();
        router.refresh();
        onClose();
      } else {
        const errorMsg =
          res.error || 'The requested slot is already booked or outside working hours.';
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error(err);
      const msg = 'Failed to reschedule appointment. Please check availability and try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <IconCalendarTime size={20} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight">
                Reschedule Appointment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {appointmentNumber} &bull; {customerName} &bull; {serviceName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Current Info Banner */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-muted-foreground">Current Schedule</span>
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <IconClock size={13} className="text-primary" />
              <span>{currentDate} &bull; {currentTime}</span>
            </div>
          </div>
          {staffName && (
            <div className="text-right space-y-0.5">
              <span className="text-muted-foreground">Specialist</span>
              <div className="font-medium text-foreground">{staffName}</div>
            </div>
          )}
        </div>

        {/* Conflict / Error Banner */}
        {errorMessage && (
          <div
            id="reschedule-error-banner"
            className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2 animate-in fade-in duration-200"
          >
            <IconAlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Date Picker */}
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-date-input" className="text-xs font-semibold">
              New Appointment Date
            </Label>
            <div className="relative">
              <IconCalendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                id="reschedule-date-input"
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setErrorMessage(null);
                }}
                className="pl-9 h-10 cursor-pointer"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Specialist Select (if available) */}
          {staffList.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-staff-select" className="text-xs font-semibold">
                Assigned Specialist
              </Label>
              <Select
                value={selectedStaffId}
                onValueChange={(val) => {
                  setSelectedStaffId(val);
                  setErrorMessage(null);
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="reschedule-staff-select" className="h-10 cursor-pointer">
                  <div className="flex items-center gap-2 truncate">
                    <IconUser size={15} className="text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Select specialist" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((st) => (
                    <SelectItem key={st.id} value={st.id} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: st.colorCode || '#CEEDC1' }}
                        />
                        <span>{st.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time Slot Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Select Time Slot
              </Label>
              {isLoadingSlots && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <IconLoader2 size={12} className="animate-spin text-primary" />
                  <span>Checking slots...</span>
                </div>
              )}
            </div>

            {/* Quick Slot Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1 rounded-md border border-border bg-muted/20">
              {availableSlots.map((slot) => (
                <Button
                  key={slot}
                  type="button"
                  size="sm"
                  variant={selectedTime === slot ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedTime(slot);
                    setErrorMessage(null);
                  }}
                  disabled={isSubmitting}
                  className="h-8 text-xs font-mono justify-center cursor-pointer transition-colors"
                >
                  <IconClock size={12} className="mr-1 shrink-0" />
                  <span className="truncate">{slot}</span>
                </Button>
              ))}
            </div>

            {/* Direct Time Slot Input */}
            <div className="pt-1">
              <Label htmlFor="manual-slot-input" className="text-[11px] text-muted-foreground">
                Or enter custom slot time (e.g. 11:00 - 11:30)
              </Label>
              <Input
                id="manual-slot-input"
                type="text"
                placeholder="HH:mm - HH:mm"
                value={selectedTime}
                onChange={(e) => {
                  setSelectedTime(e.target.value);
                  setErrorMessage(null);
                }}
                className="h-9 text-xs font-mono mt-1"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleReschedule}
            disabled={isSubmitting || !selectedDate || !selectedTime}
            className="cursor-pointer gap-2"
          >
            {isSubmitting && <IconLoader2 size={16} className="animate-spin" />}
            <span>{isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
