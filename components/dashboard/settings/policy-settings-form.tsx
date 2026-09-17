"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconCalendarTime,
  IconClock,
  IconHash,
  IconUsers,
  IconLoader2,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateAppointmentPolicyAction } from "@/actions/settings";
import type { BusinessSettingsDTO } from "@/types/settings";

interface PolicySettingsFormProps {
  initialData: BusinessSettingsDTO;
}

export function PolicySettingsForm({ initialData }: PolicySettingsFormProps) {
  const router = useRouter();
  const [appointmentPrefix, setAppointmentPrefix] = useState(
    initialData.appointmentPrefix || "#APP000"
  );
  const [maximumSlot, setMaximumSlot] = useState(initialData.maximumSlot ?? 1);
  const [reminderHours, setReminderHours] = useState(
    initialData.appointmentReminderHours ?? 24
  );
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsPending(true);
      const res = await updateAppointmentPolicyAction({
        appointmentPrefix: appointmentPrefix.trim() || undefined,
        maximumSlot: Number(maximumSlot) || 1,
        appointmentReminderHours: Number(reminderHours) || 24,
      });

      if (res.success) {
        toast.success(res.message || "Booking policy updated successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update booking policy.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving booking policies.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card text-card-foreground shadow-xs">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <IconCalendarTime className="w-5 h-5 text-primary" />
          Appointment Booking Policies
        </CardTitle>
        <CardDescription className="text-xs">
          Manage booking reference formatting, concurrent slot capacities, and automated notification timing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Appointment Reference Prefix */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="policy-prefix" className="text-xs font-semibold">
                Appointment Reference Prefix
              </Label>
              <div className="relative">
                <IconHash className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="policy-prefix"
                  value={appointmentPrefix}
                  onChange={(e) => setAppointmentPrefix(e.target.value)}
                  placeholder="e.g. #APP000, BGO-, VIP-"
                  maxLength={10}
                  className="pl-9 h-9 text-xs font-mono"
                  disabled={isPending}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Appended to generated booking numbers (e.g., <span className="font-mono">{appointmentPrefix}1024</span>).
              </p>
            </div>

            {/* Maximum Slots Capacity */}
            <div className="space-y-1.5">
              <Label htmlFor="policy-max-slots" className="text-xs font-semibold">
                Maximum Concurrent Slots Per Window
              </Label>
              <div className="relative">
                <IconUsers className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="policy-max-slots"
                  type="number"
                  min={1}
                  max={100}
                  value={maximumSlot}
                  onChange={(e) => setMaximumSlot(Number(e.target.value))}
                  className="pl-9 h-9 text-xs"
                  disabled={isPending}
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Total bookings allowed simultaneously for the same time window.
              </p>
            </div>

            {/* Reminder Hours */}
            <div className="space-y-1.5">
              <Label htmlFor="policy-reminder-hours" className="text-xs font-semibold">
                Automated Reminder Window (Hours)
              </Label>
              <div className="relative">
                <IconClock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="policy-reminder-hours"
                  type="number"
                  min={1}
                  max={168}
                  value={reminderHours}
                  onChange={(e) => setReminderHours(Number(e.target.value))}
                  className="pl-9 h-9 text-xs"
                  disabled={isPending}
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Hours before appointment when automated reminder email/SMS triggers.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="text-xs h-9 gap-1.5"
            >
              {isPending ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <IconDeviceFloppy className="w-4 h-4" />
              )}
              {isPending ? "Saving..." : "Save Booking Policies"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
