"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, Loader2, RotateCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { customerRescheduleAppointmentAction } from "@/actions/customer-appointment";

interface RescheduleAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  serviceTitle: string;
  businessId: string;
  serviceId: string;
  staffId: string;
  currentDate: string;
  currentTime: string;
  onSuccess: () => void;
}

export function RescheduleAppointmentDialog({
  isOpen,
  onClose,
  appointmentId,
  serviceTitle,
  businessId,
  serviceId,
  staffId,
  currentDate,
  currentTime,
  onSuccess,
}: RescheduleAppointmentDialogProps) {
  const [selectedDate, setSelectedDate] = useState(currentDate || "");
  const [selectedSlot, setSelectedSlot] = useState(currentTime || "");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!selectedDate || !businessId || !serviceId) return;

    let isMounted = true;
    async function fetchSlots() {
      try {
        setIsLoadingSlots(true);
        const res = await fetch(
          `/api/slots?businessId=${businessId}&serviceId=${serviceId}&staffId=${staffId}&date=${selectedDate}`
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.slots)) {
            setAvailableSlots(data.slots.map((s: { time?: string; label?: string } | string) => 
              typeof s === 'string' ? s : s.time || s.label || ''
            ).filter(Boolean));
          }
        }
      } catch (e) {
        console.error("Failed to fetch slots", e);
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    }

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, businessId, serviceId, staffId]);

  const handleReschedule = async () => {
    if (!selectedDate) {
      toast.error("Please select a new date.");
      return;
    }
    if (!selectedSlot) {
      toast.error("Please select a time slot.");
      return;
    }

    try {
      setIsPending(true);
      const res = await customerRescheduleAppointmentAction({
        appointmentId,
        newDate: selectedDate,
        newTime: selectedSlot,
        newStaffId: staffId,
      });

      if (res?.error) {
        toast.error(res.error || "Failed to reschedule appointment.");
      } else {
        toast.success(res?.message || "Appointment rescheduled successfully!");
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while rescheduling.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Reschedule Appointment</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                {serviceTitle} (Current: {currentDate} {currentTime})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reschedule-date" className="text-xs font-medium">
              Select New Date
            </Label>
            <div className="relative">
              <CalendarIcon className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                id="reschedule-date"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-9"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center justify-between">
              <span>Available Time Slots</span>
              {isLoadingSlots && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
            </Label>

            {isLoadingSlots ? (
              <div className="py-8 flex justify-center text-muted-foreground text-sm">
                Loading available slots...
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="py-6 text-center border border-dashed rounded-lg text-muted-foreground text-sm">
                No slots available on this date.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    variant={selectedSlot === slot ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSlot(slot)}
                    className="text-xs"
                    disabled={isPending}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {slot}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={isPending || !selectedDate || !selectedSlot}
            className="gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isPending ? "Rescheduling..." : "Confirm Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
