"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconLoader2, IconSparkles } from "@tabler/icons-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusColorPicker } from "@/components/dashboard/custom-status/status-color-picker";
import {
  StatusBadgePreview,
  ICON_OPTIONS,
} from "@/components/dashboard/custom-status/status-badge-preview";
import {
  createCustomStatusAction,
  updateCustomStatusAction,
} from "@/actions/custom-status";
import type { CustomStatusDTO } from "@/types/custom-status";

interface AddEditStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusToEdit?: CustomStatusDTO | null;
  onSuccess?: () => void;
}

interface StatusFormProps {
  statusToEdit?: CustomStatusDTO | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function StatusForm({ statusToEdit, onClose, onSuccess }: StatusFormProps) {
  const isEditing = !!statusToEdit;
  const [title, setTitle] = useState(statusToEdit?.title || "");
  const [statusColor, setStatusColor] = useState(statusToEdit?.statusColor || "#8b5cf6");
  const [icon, setIcon] = useState(statusToEdit?.icon || "shield-check");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Status title is required.");
      return;
    }

    if (!statusColor || !statusColor.startsWith("#")) {
      toast.error("Please select a valid hex color code.");
      return;
    }

    try {
      setIsPending(true);

      if (isEditing && statusToEdit) {
        const res = await updateCustomStatusAction({
          id: statusToEdit.id,
          title: title.trim(),
          statusColor,
          icon,
        });

        if (res.success) {
          toast.success(res.message || "Status updated successfully!");
          onClose();
          onSuccess?.();
        } else {
          toast.error(res.error || "Failed to update custom status.");
        }
      } else {
        const res = await createCustomStatusAction({
          title: title.trim(),
          statusColor,
          icon,
        });

        if (res.success) {
          toast.success(res.message || "Custom status created successfully!");
          onClose();
          onSuccess?.();
        } else {
          toast.error(res.error || "Failed to create custom status.");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {/* Status Title Input */}
      <div className="space-y-1.5">
        <Label htmlFor="status-title" className="text-xs font-semibold">
          Status Title
        </Label>
        <Input
          id="status-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. In Inspection, Vehicle Arrived, Ready..."
          className="text-xs h-9"
          disabled={isPending}
          required
        />
      </div>

      {/* Icon Selector */}
      <div className="space-y-1.5">
        <Label htmlFor="status-icon" className="text-xs font-semibold">
          Badge Icon
        </Label>
        <Select value={icon} onValueChange={setIcon} disabled={isPending}>
          <SelectTrigger id="status-icon" className="h-9 text-xs">
            <SelectValue placeholder="Select icon" />
          </SelectTrigger>
          <SelectContent className="max-h-48">
            {ICON_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <SelectItem key={opt.name} value={opt.name} className="text-xs">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="capitalize">{opt.name.replace("-", " ")}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Color Picker */}
      <StatusColorPicker
        color={statusColor}
        onChange={setStatusColor}
        disabled={isPending}
      />

      {/* Live Preview Card */}
      <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 space-y-1.5">
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
          Live Badge Preview
        </Label>
        <div className="flex items-center justify-start py-1">
          <StatusBadgePreview
            title={title || "In Inspection"}
            statusColor={statusColor}
            icon={icon}
          />
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
          className="text-xs h-9"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !title.trim()}
          className="text-xs h-9 gap-1.5"
        >
          {isPending && <IconLoader2 className="w-4 h-4 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Status"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddEditStatusModal({
  isOpen,
  onClose,
  statusToEdit,
  onSuccess,
}: AddEditStatusModalProps) {
  const isEditing = !!statusToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <IconSparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? "Edit Custom Status" : "Create Custom Status"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Configure appointment stage details and color badge preview.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isOpen && (
          <StatusForm
            key={statusToEdit?.id || "new"}
            statusToEdit={statusToEdit}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
