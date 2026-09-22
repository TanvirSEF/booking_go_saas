"use client";

import * as React from "react";
import {
  IconCheck,
  IconClock,
  IconKey,
  IconLoader2,
  IconLock,
  IconLockOpen,
  IconShieldLock,
  IconUserCheck,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getUserAccountStatusAction,
  reactivateUserAction,
  toggleUserLoginAccessAction,
} from "@/actions/user-management";
import type { UserAccountStatusDTO } from "@/types/user-management";

export interface UserStatusDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string;
  email?: string;
  role?: string;
  onUpdated?: () => void;
}

export function UserStatusDetailsModal({
  open,
  onOpenChange,
  userId,
  userName,
  onUpdated,
}: UserStatusDetailsModalProps) {
  const [data, setData] = React.useState<UserAccountStatusDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  React.useEffect(() => {
    let isSubscribed = true;

    if (!open || !userId) {
      return;
    }

    async function loadTelemetry() {
      setIsLoading(true);
      try {
        const res = await getUserAccountStatusAction(userId);
        if (isSubscribed) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            toast.error(res.error || "Failed to load user security details.");
          }
        }
      } catch {
        if (isSubscribed) {
          toast.error("Failed to load user telemetry.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    void loadTelemetry();

    return () => {
      isSubscribed = false;
    };
  }, [open, userId]);

  const handleReactivate = async () => {
    if (!userId) return;
    setIsActionLoading(true);
    try {
      const res = await reactivateUserAction({ userId });
      if (res.success) {
        toast.success(res.message || "User reactivated successfully!");
        setData((prev) =>
          prev ? { ...prev, isActive: true, isEnableLogin: true, suspendedReason: null, suspendedAt: null } : prev
        );
        onUpdated?.();
      } else {
        toast.error(res.error || "Failed to reactivate user.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleLogin = async () => {
    if (!userId) return;
    setIsActionLoading(true);
    try {
      const res = await toggleUserLoginAccessAction({ userId });
      if (res.success) {
        toast.success(res.message || "Login access toggled successfully!");
        setData((prev) =>
          prev ? { ...prev, isEnableLogin: res.isEnableLogin ?? !prev.isEnableLogin } : prev
        );
        onUpdated?.();
      } else {
        toast.error(res.error || "Failed to toggle login access.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <IconShieldLock size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Account Security & Telemetry
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Live authentication parameters, session version, and access scopes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <IconLoader2 size={24} className="animate-spin text-primary" />
            <span>Loading security telemetry...</span>
          </div>
        ) : data ? (
          <div className="space-y-4 py-3">
            {/* Identity Card */}
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">User Profile:</span>
                <span className="font-bold text-foreground">{data.name || userName || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Email:</span>
                <span className="font-mono text-foreground">{data.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Role:</span>
                <Badge variant="outline" className="capitalize text-[10px] font-bold">
                  {data.role}
                </Badge>
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1.5 shadow-2xs">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Account Status
                </span>
                {data.isActive ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold gap-1">
                    <IconCheck size={10} />
                    <span>Active</span>
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px] font-bold gap-1">
                    <IconUserX size={10} />
                    <span>Suspended</span>
                  </Badge>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1.5 shadow-2xs">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Login Permission
                </span>
                {data.isEnableLogin ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold gap-1">
                    <IconLockOpen size={10} />
                    <span>Login Allowed</span>
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold gap-1">
                    <IconLock size={10} />
                    <span>Login Disabled</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Session Token Telemetry */}
            <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <IconKey size={14} className="text-primary" />
                  <span>Session Token Version</span>
                </span>
                <span className="font-mono font-bold bg-muted px-2 py-0.5 rounded text-foreground">
                  v{data.tokenVersion}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Token version automatically increments on suspension or login revocation to invalidate all active JWTs.
              </p>
            </div>

            {/* Suspension Details (if suspended) */}
            {!data.isActive && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-destructive">
                  <IconUserX size={14} />
                  <span>Suspension Metadata</span>
                </div>
                {data.suspendedAt && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <IconClock size={12} />
                    <span>Suspended on: {new Date(data.suspendedAt).toLocaleString()}</span>
                  </div>
                )}
                {data.suspendedReason && (
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold text-foreground">Reason:</span>
                    <p className="text-[11px] text-muted-foreground italic mt-0.5">
                      &quot;{data.suspendedReason}&quot;
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>

          {data && !data.isActive && (
            <Button
              type="button"
              size="sm"
              onClick={handleReactivate}
              disabled={isActionLoading}
              className="text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
            >
              {isActionLoading ? (
                <IconLoader2 size={13} className="animate-spin" />
              ) : (
                <IconUserCheck size={13} />
              )}
              <span>Reactivate User</span>
            </Button>
          )}

          {data && data.isActive && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleLogin}
              disabled={isActionLoading}
              className="text-xs font-semibold gap-1.5 shadow-2xs"
            >
              {isActionLoading ? (
                <IconLoader2 size={13} className="animate-spin" />
              ) : data.isEnableLogin ? (
                <IconLock size={13} />
              ) : (
                <IconLockOpen size={13} />
              )}
              <span>{data.isEnableLogin ? "Disable Login" : "Enable Login"}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
