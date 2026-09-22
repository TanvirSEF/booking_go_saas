"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconRotateClockwise,
  IconLoader2,
  IconAlertTriangle,
} from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { resetSystemSettingsGroupAction } from "@/actions/system-settings";
import type { SystemSettingGroup } from "@/models/SystemSetting";

interface ResetGroupDialogProps {
  group: SystemSettingGroup;
  groupLabel: string;
  onResetComplete?: () => void;
}

export function ResetGroupDialog({
  group,
  groupLabel,
  onResetComplete,
}: ResetGroupDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleReset = async () => {
    try {
      setIsPending(true);
      const res = await resetSystemSettingsGroupAction(group);
      if (res.success) {
        toast.success(res.message || `Reset ${groupLabel} to factory defaults.`);
        setOpen(false);
        if (onResetComplete) {
          onResetComplete();
        }
        router.refresh();
      } else {
        toast.error(res.error || `Failed to reset ${groupLabel}.`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`An error occurred while resetting ${groupLabel}.`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-9 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
        >
          <IconRotateClockwise className="size-3.5" />
          <span>Reset {groupLabel}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-1">
            <IconAlertTriangle className="size-5" />
          </div>
          <AlertDialogTitle>Reset {groupLabel} to Defaults?</AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground">
            This action will restore all settings in the{" "}
            <span className="font-semibold text-foreground">{groupLabel}</span> category
            back to factory defaults in the database. Custom keys and overridden
            values will be reset.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} className="text-xs">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleReset();
            }}
            disabled={isPending}
            className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
          >
            {isPending ? (
              <IconLoader2 className="size-3.5 animate-spin" />
            ) : (
              <IconRotateClockwise className="size-3.5" />
            )}
            {isPending ? "Resetting..." : "Confirm Reset"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
