"use client";

import * as React from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconBuildingStore,
  IconCheck,
  IconExternalLink,
  IconLoader2,
  IconPlus,
  IconSparkles,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createBusinessAction,
  checkBusinessSlugAvailabilityAction,
} from "@/actions/business";
import type { CreateBusinessInput } from "@/types/business";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
  { code: "JPY", symbol: "¥" },
  { code: "INR", symbol: "₹" },
  { code: "BDT", symbol: "৳" },
];

interface CreateBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateBusinessDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateBusinessDialogProps) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [isCustomSlug, setIsCustomSlug] = React.useState(false);
  const [currency, setCurrency] = React.useState("USD");
  const [currencySymbol, setCurrencySymbol] = React.useState("$");
  const [appointmentPrefix, setAppointmentPrefix] = React.useState("#APP000");
  const [maximumSlot, setMaximumSlot] = React.useState(1);
  const [reminderHours, setReminderHours] = React.useState(24);

  const [slugAvailable, setSlugAvailable] = React.useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [planLimitError, setPlanLimitError] = React.useState<string | null>(null);

  // Auto-slug generation
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isCustomSlug) {
      const generated = slugify(val);
      setSlug(generated);
      checkSlug(generated);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = slugify(e.target.value);
    setSlug(val);
    checkSlug(val);
  };

  const checkSlug = React.useCallback((slugToCheck: string) => {
    if (!slugToCheck || slugToCheck.length < 2) {
      setSlugAvailable(null);
      return;
    }
    setIsCheckingSlug(true);
    const timer = setTimeout(async () => {
      try {
        const res = await checkBusinessSlugAvailabilityAction(slugToCheck);
        setSlugAvailable(res.success && res.data?.isAvailable === true);
      } catch {
        setSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleCurrencyChange = (currCode: string) => {
    setCurrency(currCode);
    const found = CURRENCIES.find((c) => c.code === currCode);
    if (found) {
      setCurrencySymbol(found.symbol);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanLimitError(null);

    if (!name.trim()) {
      toast.error("Please provide a branch name.");
      return;
    }

    const payload: CreateBusinessInput = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      currency,
      currencySymbol,
      appointmentPrefix: appointmentPrefix.trim() || "#APP000",
      maximumSlot: Number(maximumSlot) || 1,
      appointmentReminderHours: Number(reminderHours) || 24,
      formType: "form-layout",
      layout: "Formlayout1",
      themeColor: "color1-Formlayout1",
    };

    setIsSubmitting(true);
    try {
      const res = await createBusinessAction(payload);
      if (res.success) {
        toast.success("New business branch created and activated!");
        onCreated();
        onOpenChange(false);
        // Reset form
        setName("");
        setSlug("");
        setIsCustomSlug(false);
      } else {
        if (res.error?.includes("Plan Limit Reached")) {
          setPlanLimitError(res.error);
        } else {
          toast.error(res.error || "Failed to create business branch.");
        }
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border-border">
        <DialogHeader className="p-5 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconBuildingStore size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Add New Business Branch
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Create a distinct operating business profile with its own services, staff, and public booking page.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Plan Limit Alert if encountered */}
            {planLimitError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-2">
                <div className="flex items-start gap-2 text-destructive font-bold text-xs">
                  <IconAlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>Branch Quota Limit Reached</span>
                </div>
                <p className="text-xs text-destructive/90 leading-relaxed">
                  {planLimitError}
                </p>
                <div className="pt-1">
                  <Button asChild size="sm" className="h-7 text-xs font-semibold gap-1 bg-destructive hover:bg-destructive/90 text-white">
                    <Link href="/dashboard/billing">
                      <span>Upgrade Plan</span>
                      <IconExternalLink size={12} />
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Branch Name */}
            <div className="space-y-1.5">
              <Label htmlFor="branch-name" className="text-xs font-semibold text-foreground">
                Branch / Business Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="branch-name"
                placeholder="e.g. Uptown Luxury Salon & Spa"
                value={name}
                onChange={handleNameChange}
                required
                className="text-xs"
              />
            </div>

            {/* Custom Slug & Availability Indicator */}
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <IconSparkles size={14} className="text-primary" />
                  Storefront Booking URL
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomSlug(!isCustomSlug)}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {isCustomSlug ? "Auto-generate" : "Customize URL Slug"}
                </button>
              </div>

              {isCustomSlug ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">/appointments/</span>
                  <Input
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="my-branch-slug"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              ) : (
                <p className="text-xs font-mono text-foreground/80 break-all">
                  /appointments/<span className="text-primary font-bold">{slug || "branch-slug"}</span>
                </p>
              )}

              {slug && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  {isCheckingSlug ? (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <IconLoader2 size={12} className="animate-spin" />
                      Checking availability...
                    </span>
                  ) : slugAvailable === true ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <IconCheck size={12} />
                      Slug is available
                    </span>
                  ) : slugAvailable === false ? (
                    <span className="text-destructive flex items-center gap-1 font-semibold">
                      <IconAlertCircle size={12} />
                      Slug already in use, auto-suffix will be appended
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Currency & Symbol */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="currency-select" className="text-xs font-semibold text-foreground">
                  Currency
                </Label>
                <Select value={currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger id="currency-select" className="text-xs h-9">
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="text-xs">
                        {c.code} ({c.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency-symbol" className="text-xs font-semibold text-foreground">
                  Currency Symbol
                </Label>
                <Input
                  id="currency-symbol"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="text-xs h-9"
                  maxLength={5}
                />
              </div>
            </div>

            {/* Prefix & Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="appointment-prefix" className="text-xs font-semibold text-foreground">
                  Appointment Prefix
                </Label>
                <Input
                  id="appointment-prefix"
                  placeholder="#APP000"
                  value={appointmentPrefix}
                  onChange={(e) => setAppointmentPrefix(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-slots" className="text-xs font-semibold text-foreground">
                  Max Slots / Slot
                </Label>
                <Input
                  id="max-slots"
                  type="number"
                  min={1}
                  max={100}
                  value={maximumSlot}
                  onChange={(e) => setMaximumSlot(Number(e.target.value) || 1)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reminder-hours" className="text-xs font-semibold text-foreground">
                  Reminder (Hours)
                </Label>
                <Input
                  id="reminder-hours"
                  type="number"
                  min={1}
                  max={168}
                  value={reminderHours}
                  onChange={(e) => setReminderHours(Number(e.target.value) || 24)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
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
                  <span>Provisioning Branch...</span>
                </>
              ) : (
                <>
                  <IconPlus size={15} />
                  <span>Create & Activate Branch</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
