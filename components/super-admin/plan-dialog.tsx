"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SYSTEM_MODULES } from "./module-badges";
import {
  createPlanAction,
  updatePlanAction,
  deletePlanAction,
} from "@/actions/plan";

export interface PlanData {
  id: string;
  name: string;
  packagePriceMonthly: number;
  packagePriceYearly: number;
  pricePerUserMonthly?: number;
  pricePerUserYearly?: number;
  pricePerBusinessMonthly?: number;
  pricePerBusinessYearly?: number;
  maxUsers: number;
  maxBusinesses: number;
  maxLocations: number;
  maxServices: number;
  storageLimitMb: number;
  modules: string[];
  isCustomPlan: boolean;
  isFreePlan: boolean;
  hasTrial: boolean;
  trialDays: number;
  isEnabled: boolean;
  description?: string;
}

// 1. Create New Plan Dialog matching subscription-setting-add-modal.png
interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreatePlanDialog({ open, onOpenChange, onSuccess }: CreatePlanDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [planType, setPlanType] = useState<"pre-packaged" | "custom">("pre-packaged");
  const [maxUsers, setMaxUsers] = useState("5");
  const [maxBusinesses, setMaxBusinesses] = useState("5");
  const [packagePriceMonthly, setPackagePriceMonthly] = useState("0");
  const [packagePriceYearly, setPackagePriceYearly] = useState("0");
  const [hasTrial, setHasTrial] = useState(false);
  const [trialDays, setTrialDays] = useState("14");
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "Stripe",
    "Paypal",
    "GoogleCaptcha",
  ]);
  const [isPending, startTransition] = useTransition();

  function toggleModule(modId: string) {
    setSelectedModules((prev) =>
      prev.includes(modId)
        ? prev.filter((id) => id !== modId)
        : [...prev, modId]
    );
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setName("");
      setMaxUsers("5");
      setMaxBusinesses("5");
      setPackagePriceMonthly("0");
      setPackagePriceYearly("0");
      setHasTrial(false);
      setTrialDays("14");
      setSelectedModules(["Stripe", "Paypal", "GoogleCaptcha"]);
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a plan name.");
      return;
    }

    startTransition(async () => {
      const res = await createPlanAction({
        name: name.trim(),
        packagePriceMonthly: Number(packagePriceMonthly) || 0,
        packagePriceYearly: Number(packagePriceYearly) || 0,
        maxUsers: Number(maxUsers),
        maxBusinesses: Number(maxBusinesses),
        maxLocations: -1,
        maxServices: -1,
        storageLimitMb: 1024,
        modules: selectedModules,
        isCustomPlan: planType === "custom",
        hasTrial,
        trialDays: hasTrial ? Number(trialDays) || 0 : 0,
        isEnabled: true,
      });

      if (res.success) {
        toast.success(`Plan "${name}" created successfully!`);
        handleClose(false);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to create plan.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[620px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Create New Plan
          </DialogTitle>
          <DialogDescription className="sr-only">
            Define subscription plan name, pricing, limits, and active addon modules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Row 1: Name & Plan Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-name" className="text-xs font-semibold text-foreground">
                Name
              </Label>
              <Input
                id="plan-name"
                placeholder="Enter Plan Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 rounded-lg text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Plan Type
              </Label>
              <Select
                value={planType}
                onValueChange={(val: "pre-packaged" | "custom") => setPlanType(val)}
              >
                <SelectTrigger className="h-10 w-full rounded-lg text-xs">
                  <SelectValue placeholder="--- Select Plan Type ---" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-packaged" className="text-xs">
                    Pre-Packaged
                  </SelectItem>
                  <SelectItem value="custom" className="text-xs">
                    Usage / Custom Plan
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Number of User & Number of Business */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-users" className="text-xs font-semibold text-foreground">
                Number of User
              </Label>
              <Input
                id="plan-users"
                type="number"
                placeholder="Number of User"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                required
                className="h-10 rounded-lg text-xs"
              />
              <span className="text-[11px] font-medium text-rose-500">
                Note: &quot;-1&quot; for Unlimited
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-businesses" className="text-xs font-semibold text-foreground">
                Number of Business
              </Label>
              <Input
                id="plan-businesses"
                type="number"
                placeholder="Number of Business"
                value={maxBusinesses}
                onChange={(e) => setMaxBusinesses(e.target.value)}
                required
                className="h-10 rounded-lg text-xs"
              />
              <span className="text-[11px] font-medium text-rose-500">
                Note: &quot;-1&quot; for Unlimited
              </span>
            </div>
          </div>

          {/* Row 3: Monthly & Yearly Prices */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-price-monthly" className="text-xs font-semibold text-foreground">
                Basic Package Price/Month ( $ )
              </Label>
              <Input
                id="plan-price-monthly"
                type="number"
                min="0"
                step="any"
                placeholder="Price/month"
                value={packagePriceMonthly}
                onChange={(e) => setPackagePriceMonthly(e.target.value)}
                required
                className="h-10 rounded-lg text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-price-yearly" className="text-xs font-semibold text-foreground">
                Basic Package Price/Year ( $ )
              </Label>
              <Input
                id="plan-price-yearly"
                type="number"
                min="0"
                step="any"
                placeholder="Price/Yearly"
                value={packagePriceYearly}
                onChange={(e) => setPackagePriceYearly(e.target.value)}
                required
                className="h-10 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Row 4: Trial is enable switch */}
          <div className="flex items-center gap-3 py-1">
            <Label htmlFor="plan-trial" className="text-xs font-semibold text-foreground">
              Trial is enable(on/off)
            </Label>
            <Switch
              id="plan-trial"
              checked={hasTrial}
              onCheckedChange={setHasTrial}
            />
            {hasTrial && (
              <div className="flex items-center gap-1.5 ml-2">
                <Input
                  type="number"
                  min="1"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  className="h-8 w-16 text-xs"
                />
                <span className="text-xs text-muted-foreground">Days</span>
              </div>
            )}
          </div>

          {/* Row 5: Add-on Checkbox Grid */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-foreground">Add-on</Label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {SYSTEM_MODULES.map((mod) => {
                const isChecked = selectedModules.includes(mod.id);
                const IconComponent = mod.icon;

                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-2.5 shadow-2xs hover:border-primary/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${mod.iconBg} ${mod.iconColor}`}
                      >
                        <IconComponent size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground">
                          {mod.name}
                        </span>
                        {mod.category && (
                          <span className="text-[10px] text-muted-foreground">
                            {mod.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleModule(mod.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleClose(false)}
              disabled={isPending}
              className="h-9 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 2. Edit Plan Dialog
interface EditPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanData | null;
  onSuccess?: () => void;
}

export function EditPlanDialog({ open, onOpenChange, plan, onSuccess }: EditPlanDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(plan?.name || "");
  const [planType, setPlanType] = useState<"pre-packaged" | "custom">(
    plan?.isCustomPlan ? "custom" : "pre-packaged"
  );
  const [maxUsers, setMaxUsers] = useState(String(plan?.maxUsers ?? 5));
  const [maxBusinesses, setMaxBusinesses] = useState(String(plan?.maxBusinesses ?? 5));
  const [packagePriceMonthly, setPackagePriceMonthly] = useState(
    String(plan?.packagePriceMonthly ?? 0)
  );
  const [packagePriceYearly, setPackagePriceYearly] = useState(
    String(plan?.packagePriceYearly ?? 0)
  );
  const [hasTrial, setHasTrial] = useState(plan?.hasTrial ?? false);
  const [trialDays, setTrialDays] = useState(String(plan?.trialDays ?? 0));
  const [selectedModules, setSelectedModules] = useState<string[]>(
    plan?.modules || []
  );
  const [isPending, startTransition] = useTransition();

  // Sync state on open
  if (plan && name === "" && plan.name !== "") {
    setName(plan.name);
    setPlanType(plan.isCustomPlan ? "custom" : "pre-packaged");
    setMaxUsers(String(plan.maxUsers));
    setMaxBusinesses(String(plan.maxBusinesses));
    setPackagePriceMonthly(String(plan.packagePriceMonthly));
    setPackagePriceYearly(String(plan.packagePriceYearly));
    setHasTrial(plan.hasTrial);
    setTrialDays(String(plan.trialDays));
    setSelectedModules(plan.modules || []);
  }

  function toggleModule(modId: string) {
    setSelectedModules((prev) =>
      prev.includes(modId)
        ? prev.filter((id) => id !== modId)
        : [...prev, modId]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;

    startTransition(async () => {
      const res = await updatePlanAction({
        planId: plan.id,
        name: name.trim(),
        packagePriceMonthly: Number(packagePriceMonthly) || 0,
        packagePriceYearly: Number(packagePriceYearly) || 0,
        maxUsers: Number(maxUsers),
        maxBusinesses: Number(maxBusinesses),
        maxLocations: plan.maxLocations,
        maxServices: plan.maxServices,
        storageLimitMb: plan.storageLimitMb,
        modules: selectedModules,
        isCustomPlan: planType === "custom",
        hasTrial,
        trialDays: hasTrial ? Number(trialDays) || 0 : 0,
        isEnabled: plan.isEnabled,
        description: plan.description,
      });

      if (res.success) {
        toast.success(`Plan "${name}" updated successfully!`);
        onOpenChange(false);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to update plan.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Edit Plan
          </DialogTitle>
          <DialogDescription className="sr-only">
            Modify plan pricing, quotas, and active addon modules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Row 1: Name & Plan Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-plan-name" className="text-xs font-semibold text-foreground">
                Name
              </Label>
              <Input
                id="edit-plan-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 rounded-lg text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Plan Type
              </Label>
              <Select
                value={planType}
                onValueChange={(val: "pre-packaged" | "custom") => setPlanType(val)}
              >
                <SelectTrigger className="h-10 w-full rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-packaged" className="text-xs">
                    Pre-Packaged
                  </SelectItem>
                  <SelectItem value="custom" className="text-xs">
                    Usage / Custom Plan
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Number of User & Number of Business */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-plan-users" className="text-xs font-semibold text-foreground">
                Number of User
              </Label>
              <Input
                id="edit-plan-users"
                type="number"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                required
                className="h-10 rounded-lg text-xs"
              />
              <span className="text-[11px] font-medium text-rose-500">
                Note: &quot;-1&quot; for Unlimited
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-plan-businesses" className="text-xs font-semibold text-foreground">
                Number of Business
              </Label>
              <Input
                id="edit-plan-businesses"
                type="number"
                value={maxBusinesses}
                onChange={(e) => setMaxBusinesses(e.target.value)}
                required
                className="h-10 rounded-lg text-xs"
              />
              <span className="text-[11px] font-medium text-rose-500">
                Note: &quot;-1&quot; for Unlimited
              </span>
            </div>
          </div>

          {/* Row 3: Monthly & Yearly Prices */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-plan-monthly" className="text-xs font-semibold text-foreground">
                Basic Package Price/Month ( $ )
              </Label>
              <Input
                id="edit-plan-monthly"
                type="number"
                min="0"
                step="any"
                value={packagePriceMonthly}
                onChange={(e) => setPackagePriceMonthly(e.target.value)}
                required
                className="h-10 rounded-lg text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-plan-yearly" className="text-xs font-semibold text-foreground">
                Basic Package Price/Year ( $ )
              </Label>
              <Input
                id="edit-plan-yearly"
                type="number"
                min="0"
                step="any"
                value={packagePriceYearly}
                onChange={(e) => setPackagePriceYearly(e.target.value)}
                required
                className="h-10 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Row 4: Trial toggle */}
          <div className="flex items-center gap-3 py-1">
            <Label htmlFor="edit-plan-trial" className="text-xs font-semibold text-foreground">
              Trial is enable(on/off)
            </Label>
            <Switch
              id="edit-plan-trial"
              checked={hasTrial}
              onCheckedChange={setHasTrial}
            />
            {hasTrial && (
              <div className="flex items-center gap-1.5 ml-2">
                <Input
                  type="number"
                  min="1"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  className="h-8 w-16 text-xs"
                />
                <span className="text-xs text-muted-foreground">Days</span>
              </div>
            )}
          </div>

          {/* Row 5: Add-on Checkboxes */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-foreground">Add-on</Label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {SYSTEM_MODULES.map((mod) => {
                const isChecked = selectedModules.includes(mod.id);
                const IconComponent = mod.icon;

                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-2.5 shadow-2xs hover:border-primary/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${mod.iconBg} ${mod.iconColor}`}
                      >
                        <IconComponent size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground">
                          {mod.name}
                        </span>
                        {mod.category && (
                          <span className="text-[10px] text-muted-foreground">
                            {mod.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleModule(mod.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-9 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 3. Delete Plan Confirmation Dialog
interface DeletePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanData | null;
  onSuccess?: () => void;
}

export function DeletePlanDialog({ open, onOpenChange, plan, onSuccess }: DeletePlanDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!plan) return;

    startTransition(async () => {
      const res = await deletePlanAction(plan.id);
      if (res.success) {
        toast.success(`Plan "${plan.name}" deleted.`);
        onOpenChange(false);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to delete plan.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-destructive">
            Delete Subscription Plan
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-2">
            Are you sure you want to delete <span className="font-semibold text-foreground">{plan?.name}</span>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? "Deleting..." : "Yes, Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
