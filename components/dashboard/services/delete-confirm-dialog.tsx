'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconAlertTriangle, IconLoader2, IconTrash } from '@tabler/icons-react';

export interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  itemName?: string;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  onConfirm,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-theme="company"
        className="max-w-md rounded-2xl border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 border border-destructive/20">
            <IconAlertTriangle size={20} />
          </div>

          <div className="flex-1 min-w-0">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-base font-bold text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {description}
              </DialogDescription>
            </DialogHeader>

            {itemName && (
              <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-2.5">
                <p className="text-xs font-semibold text-foreground truncate">
                  {itemName}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 flex flex-row items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="rounded-xl font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-xl font-semibold gap-1.5"
          >
            {isDeleting ? (
              <>
                <IconLoader2 size={16} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <IconTrash size={16} />
                <span>Delete</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
