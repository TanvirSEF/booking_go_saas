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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconAlertTriangle, IconLoader2, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';
import { clearOldLoginLogsAction } from '@/actions/login-detail';

interface PruneLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PruneLogsModal({
  isOpen,
  onClose,
  onSuccess,
}: PruneLogsModalProps) {
  const [retentionDays, setRetentionDays] = useState<string>('90');
  const [isPruning, setIsPruning] = useState(false);

  const handlePrune = async () => {
    const days = parseInt(retentionDays, 10);
    if (isNaN(days) || days <= 0) return;

    setIsPruning(true);
    try {
      const res = await clearOldLoginLogsAction(days);
      if (res.success) {
        toast.success(
          res.message || `Successfully pruned logs older than ${days} days.`
        );
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.error || 'Failed to prune audit logs.');
      }
    } catch {
      toast.error('An unexpected error occurred while pruning logs.');
    } finally {
      setIsPruning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isPruning && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <IconAlertTriangle size={20} />
            <DialogTitle>Prune Old Security Logs</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Clean up historical login records for GDPR compliance and database
            storage maintenance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="retention-period" className="text-xs font-semibold text-foreground">
              Retention Cutoff Window
            </Label>
            <Select
              value={retentionDays}
              onValueChange={setRetentionDays}
              disabled={isPruning}
            >
              <SelectTrigger id="retention-period" className="text-xs bg-background cursor-pointer">
                <SelectValue placeholder="Select retention cutoff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Older than 30 days (1 month)</SelectItem>
                <SelectItem value="60">Older than 60 days (2 months)</SelectItem>
                <SelectItem value="90">Older than 90 days (3 months - Recommended)</SelectItem>
                <SelectItem value="180">Older than 180 days (6 months)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              All login records prior to the selected cutoff will be permanently erased.
            </p>
          </div>

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
            <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              This operation will execute immediately across the entire database and cannot be reverted.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPruning}
            className="cursor-pointer text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handlePrune}
            disabled={isPruning}
            className="cursor-pointer text-xs gap-1.5 font-medium"
          >
            {isPruning ? (
              <>
                <IconLoader2 size={14} className="animate-spin" />
                <span>Pruning...</span>
              </>
            ) : (
              <>
                <IconTrash size={14} />
                <span>Confirm & Prune</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
