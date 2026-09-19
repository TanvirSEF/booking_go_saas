'use client';

import React, { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';
import { cancelAppointment } from '@/actions/appointment-query';

interface AppointmentCancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  appointmentNumber: string;
  customerName: string;
  onSuccess?: () => void;
}

export function AppointmentCancelDialog({
  isOpen,
  onClose,
  appointmentId,
  appointmentNumber,
  customerName,
  onSuccess,
}: AppointmentCancelDialogProps) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      const res = await cancelAppointment(appointmentId, reason.trim() || undefined);

      if (res.success) {
        toast.success(res.message || `Appointment ${appointmentNumber} cancelled.`);
        if (onSuccess) onSuccess();
        router.refresh();
        onClose();
      } else {
        toast.error(res.error || 'Failed to cancel appointment.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred while cancelling the appointment.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isCancelling && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 border border-destructive/20">
              <IconAlertTriangle size={20} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight">
                Cancel Appointment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {appointmentNumber} &bull; {customerName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to cancel this booking? This will update the appointment status to{' '}
            <strong className="text-foreground">Cancelled</strong> and release the specialist&apos;s time slot.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason" className="text-xs font-semibold">
              Cancellation Reason (Optional)
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g., Customer requested rescheduling, emergency conflict..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isCancelling}
              className="text-xs min-h-[75px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isCancelling}
            className="cursor-pointer"
          >
            Keep Appointment
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={isCancelling}
            className="cursor-pointer gap-2"
          >
            {isCancelling && <IconLoader2 size={16} className="animate-spin" />}
            <span>{isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
