"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { customerCancelAppointmentAction } from "@/actions/customer-appointment";

interface CancelAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  serviceTitle: string;
  onSuccess: () => void;
}

export function CancelAppointmentDialog({
  isOpen,
  onClose,
  appointmentId,
  serviceTitle,
  onSuccess,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleCancel = async () => {
    try {
      setIsPending(true);
      const res = await customerCancelAppointmentAction({
        appointmentId,
        reason: reason.trim() || undefined,
      });

      if (res?.error) {
        toast.error(res.error || "Failed to cancel appointment.");
      } else {
        toast.success(res?.message || "Appointment cancelled successfully.");
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while cancelling your appointment.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-destructive/10 text-destructive">
              <IconAlertCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Cancel Appointment</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                {serviceTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this booking? This action cannot be undone.
          </p>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-xs font-medium">
              Reason for cancellation (optional)
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Let us know why you need to cancel..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none text-sm min-h-[80px]"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Keep Appointment
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isPending}
            className="gap-2"
          >
            {isPending ? (
              <IconLoader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {isPending ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
