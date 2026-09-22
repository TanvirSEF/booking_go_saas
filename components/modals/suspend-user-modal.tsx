"use client";

import * as React from "react";
import {
  IconAlertTriangle,
  IconLoader2,
  IconUserX,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { suspendUserAction } from "@/actions/user-management";

export interface SuspendUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  onSuccess?: () => void;
}

export function SuspendUserModal({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  userRole,
  onSuccess,
}: SuspendUserModalProps) {
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const maxLength = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsSubmitting(true);
    try {
      const res = await suspendUserAction({
        userId,
        reason: reason.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message || `Account for "${userName}" has been suspended.`);
        onOpenChange(false);
        setReason("");
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to suspend account.");
      }
    } catch {
      toast.error("An unexpected error occurred while suspending account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setReason("");
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-md bg-card border-border">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                <IconAlertTriangle size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-destructive">
                  Suspend User Account
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Immediate session termination & portal lockout
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-destructive">
                  Are you sure you want to suspend {userName}?
                </p>
                {userRole && (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-destructive border-destructive/30">
                    {userRole}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Suspending this account will immediately revoke all active JWT login sessions across all devices and block access to the dashboard.
              </p>
              {userEmail && (
                <p className="font-mono text-[11px] text-muted-foreground">
                  Target Account: <strong>{userEmail}</strong>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="suspend-reason" className="text-xs font-semibold text-foreground">
                  Suspension Reason <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {reason.length}/{maxLength}
                </span>
              </div>
              <Textarea
                id="suspend-reason"
                rows={3}
                maxLength={maxLength}
                placeholder="e.g. Policy violation, security investigation, or requested freeze..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                This reason will be visible to administrators in security audit logs.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={isSubmitting}
              className="font-semibold gap-1.5 text-xs shadow-2xs"
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" />
                  <span>Suspending Account...</span>
                </>
              ) : (
                <>
                  <IconUserX size={14} />
                  <span>Suspend & Eject Sessions</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
