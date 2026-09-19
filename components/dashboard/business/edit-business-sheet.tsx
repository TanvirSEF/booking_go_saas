"use client";

import * as React from "react";
import {
  IconBuildingStore,
  IconDeviceFloppy,
  IconLoader2,
} from "@tabler/icons-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateBusinessAction } from "@/actions/business";
import type { BusinessDTO, UpdateBusinessInput } from "@/types/business";

interface EditBusinessSheetProps {
  business: BusinessDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface EditFormProps {
  business: BusinessDTO;
  onClose: () => void;
  onSaved: () => void;
}

function EditBusinessForm({ business, onClose, onSaved }: EditFormProps) {
  const [name, setName] = React.useState(business.name || "");
  const [currency, setCurrency] = React.useState(business.currency || "USD");
  const [currencySymbol, setCurrencySymbol] = React.useState(business.currencySymbol || "$");
  const [appointmentPrefix, setAppointmentPrefix] = React.useState(business.appointmentPrefix || "#APP000");
  const [maximumSlot, setMaximumSlot] = React.useState(business.maximumSlot || 1);
  const [reminderHours, setReminderHours] = React.useState(business.appointmentReminderHours || 24);
  const [domain, setDomain] = React.useState(business.domain || "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a branch name.");
      return;
    }

    const payload: UpdateBusinessInput = {
      businessId: business.id,
      name: name.trim(),
      currency,
      currencySymbol,
      appointmentPrefix: appointmentPrefix.trim(),
      maximumSlot: Number(maximumSlot) || 1,
      appointmentReminderHours: Number(reminderHours) || 24,
      domain: domain.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      const res = await updateBusinessAction(payload);
      if (res.success) {
        toast.success("Branch details updated successfully!");
        onSaved();
        onClose();
      } else {
        toast.error(res.error || "Failed to update branch.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-name" className="text-xs font-semibold text-foreground">
            Branch Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        {/* Slug Display */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Public URL Slug</Label>
          <p className="text-xs font-mono font-bold text-foreground break-all">
            /appointments/{business.slug}
          </p>
        </div>

        {/* Currency & Symbol */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-curr" className="text-xs font-semibold text-foreground">
              Currency Code
            </Label>
            <Input
              id="edit-curr"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-symbol" className="text-xs font-semibold text-foreground">
              Symbol
            </Label>
            <Input
              id="edit-symbol"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>

        {/* Prefix & Slot Capacity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-prefix" className="text-xs font-semibold text-foreground">
              Booking Prefix
            </Label>
            <Input
              id="edit-prefix"
              value={appointmentPrefix}
              onChange={(e) => setAppointmentPrefix(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-slots" className="text-xs font-semibold text-foreground">
              Max Slots
            </Label>
            <Input
              id="edit-slots"
              type="number"
              min={1}
              max={100}
              value={maximumSlot}
              onChange={(e) => setMaximumSlot(Number(e.target.value) || 1)}
              className="text-xs h-9"
            />
          </div>
        </div>

        {/* Reminder Hours */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-remind" className="text-xs font-semibold text-foreground">
            Auto Reminder Interval (Hours)
          </Label>
          <Input
            id="edit-remind"
            type="number"
            min={1}
            max={168}
            value={reminderHours}
            onChange={(e) => setReminderHours(Number(e.target.value) || 24)}
            className="text-xs h-9"
          />
        </div>

        {/* Custom Domain */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-domain" className="text-xs font-semibold text-foreground">
            Custom Domain (Optional)
          </Label>
          <Input
            id="edit-domain"
            placeholder="booking.mybranch.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="text-xs h-9"
          />
        </div>
      </div>

      <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="font-semibold gap-1.5"
        >
          {isSubmitting ? (
            <>
              <IconLoader2 size={15} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <IconDeviceFloppy size={15} />
              <span>Save Changes</span>
            </>
          )}
        </Button>
      </SheetFooter>
    </form>
  );
}

export function EditBusinessSheet({
  business,
  open,
  onOpenChange,
  onSaved,
}: EditBusinessSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full bg-card border-l border-border"
      >
        <SheetHeader className="p-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconBuildingStore size={18} />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-foreground">
                Edit Branch Settings
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Update branch profile, booking rules, and currency.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {open && business && (
          <EditBusinessForm
            key={business.id}
            business={business}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
