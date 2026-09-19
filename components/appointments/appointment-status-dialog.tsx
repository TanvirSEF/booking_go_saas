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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  IconCheck,
  IconClock,
  IconLoader2,
  IconProgressCheck,
  IconX,
  IconCircleCheck,
} from '@tabler/icons-react';
import { updateAppointmentStatus } from '@/actions/appointment-query';

interface AppointmentStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  appointmentNumber: string;
  customerName: string;
  currentStatus: string;
  onSuccess?: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  Pending: {
    label: 'Pending',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    icon: IconClock,
  },
  Confirmed: {
    label: 'Confirmed',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    icon: IconCheck,
  },
  Completed: {
    label: 'Completed',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800',
    icon: IconCircleCheck,
  },
  Cancelled: {
    label: 'Cancelled',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    icon: IconX,
  },
};

export function AppointmentStatusDialog({
  isOpen,
  onClose,
  appointmentId,
  appointmentNumber,
  customerName,
  currentStatus,
  onSuccess,
}: AppointmentStatusDialogProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'Pending');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (selectedStatus === currentStatus) {
      onClose();
      return;
    }

    try {
      setIsUpdating(true);
      const res = await updateAppointmentStatus(appointmentId, selectedStatus);

      if (res.success) {
        toast.success(res.message || `Status updated to ${selectedStatus}`);
        if (onSuccess) onSuccess();
        router.refresh();
        onClose();
      } else {
        toast.error(res.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred while updating status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const CurrentIcon = STATUS_CONFIG[currentStatus]?.icon || IconProgressCheck;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isUpdating && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <CurrentIcon size={20} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight">
                Update Appointment Status
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {appointmentNumber} &bull; {customerName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground font-medium">Current Status</span>
            <Badge
              variant="outline"
              className={STATUS_CONFIG[currentStatus]?.bg || 'bg-muted'}
            >
              <span className={STATUS_CONFIG[currentStatus]?.color || 'text-foreground'}>
                {currentStatus}
              </span>
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-status-select" className="text-xs font-semibold">
              Select New Lifecycle Status
            </Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={isUpdating}>
              <SelectTrigger id="new-status-select" className="h-10 cursor-pointer">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={config.color} />
                        <span className="font-medium">{config.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUpdating}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="cursor-pointer gap-2"
          >
            {isUpdating && <IconLoader2 size={16} className="animate-spin" />}
            <span>{isUpdating ? 'Updating...' : 'Save Changes'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
