"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCompanyAction,
  updateCompanyAction,
  resetCompanyPasswordAction,
  deleteCompanyAction,
} from "@/actions/admin-company";

export interface PlanOption {
  id: string;
  name: string;
  packagePriceMonthly: number;
}

export interface CompanyItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isEnableLogin?: boolean;
  suspendedReason?: string | null;
  suspendedAt?: string | null;
  role: string;
  businessName?: string;
  businessSlug?: string;
  planName?: string;
  planId?: string;
  planExpiredDate?: string | null;
  createdAt: string;
}

// 1. Create Subscriber Modal matching add-company-modal.png
interface CreateSubscriberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: PlanOption[];
  onSuccess?: () => void;
}

export function CreateSubscriberDialog({
  open,
  onOpenChange,
  plans,
  onSuccess,
}: CreateSubscriberDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [loginIsEnable, setLoginIsEnable] = useState(true);
  const [password, setPassword] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const res = await createCompanyAction({
        name,
        businessName,
        email,
        password,
        isActive: loginIsEnable,
        planId: selectedPlanId,
      });

      if (res.success) {
        toast.success(`Subscriber "${name}" created successfully!`);
        setName("");
        setBusinessName("");
        setEmail("");
        setPassword("");
        setLoginIsEnable(true);
        onOpenChange(false);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to create subscriber.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Create New Subscriber
          </DialogTitle>
          <DialogDescription className="sr-only">
            Fill out the form below to create a new company subscriber.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-name" className="text-xs font-semibold text-foreground">
              Name
            </Label>
            <Input
              id="create-name"
              placeholder="Enter Subscriber Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 rounded-lg text-xs"
            />
          </div>

          {/* Business Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-business" className="text-xs font-semibold text-foreground">
              Business Name
            </Label>
            <Input
              id="create-business"
              placeholder="Enter Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="h-10 rounded-lg text-xs"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-email" className="text-xs font-semibold text-foreground">
              Email
            </Label>
            <Input
              id="create-email"
              type="email"
              placeholder="Enter Subscriber Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 rounded-lg text-xs"
            />
          </div>

          {/* Login is enable toggle matching screenshot */}
          <div className="flex items-center gap-3 py-1">
            <Label htmlFor="create-login-toggle" className="text-xs font-semibold text-foreground">
              Login is enable
            </Label>
            <Switch
              id="create-login-toggle"
              checked={loginIsEnable}
              onCheckedChange={setLoginIsEnable}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-password" className="text-xs font-semibold text-foreground">
              Password
            </Label>
            <Input
              id="create-password"
              type="password"
              placeholder="Enter User Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-10 rounded-lg text-xs"
            />
          </div>

          {/* Subscription Plan */}
          {plans.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Subscription Plan
              </Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="h-10 w-full rounded-lg text-xs">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} {p.packagePriceMonthly > 0 ? `($${p.packagePriceMonthly}/mo)` : "(Free)"}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-9 rounded-lg bg-slate-600 text-white hover:bg-slate-700 hover:text-white dark:bg-slate-700"
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

// 2. Edit Subscriber Dialog
interface EditSubscriberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyItem | null;
  plans: PlanOption[];
  onSuccess?: () => void;
}

export function EditSubscriberDialog({
  open,
  onOpenChange,
  company,
  plans,
  onSuccess,
}: EditSubscriberDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(company?.name || "");
  const [businessName, setBusinessName] = useState(company?.businessName || "");
  const [email, setEmail] = useState(company?.email || "");
  const [planId, setPlanId] = useState(company?.planId || "");
  const [isPending, startTransition] = useTransition();

  // Sync state on open
  if (company && name === "" && email === "") {
    setName(company.name);
    setBusinessName(company.businessName || "");
    setEmail(company.email);
    setPlanId(company.planId || "");
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;

    startTransition(async () => {
      const res = await updateCompanyAction({
        companyId: company.id,
        name,
        businessName,
        email,
        planId: planId || undefined,
      });

      if (res.success) {
        toast.success("Subscriber updated successfully!");
        onOpenChange(false);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to update subscriber.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Edit Subscriber
          </DialogTitle>
          <DialogDescription className="sr-only">
            Update subscriber company information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 rounded-lg text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-foreground">Business Name</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="h-10 rounded-lg text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 rounded-lg text-xs"
            />
          </div>

          {plans.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">Subscription Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger className="h-10 w-full rounded-lg text-xs">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground">
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 3. Reset Password Dialog
interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyItem | null;
  onSuccess?: () => void;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  company,
  onSuccess,
}: ResetPasswordDialogProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
    onOpenChange(nextOpen);
  }

  function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match. Please re-enter.");
      return;
    }

    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }

    startTransition(async () => {
      const res = await resetCompanyPasswordAction(company.id, newPassword);
      if (res.success) {
        toast.success(`Password for ${company.name} reset successfully!`);
        handleClose(false);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to reset password.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Reset Password
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter a new password for <span className="font-semibold text-foreground">{company?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleReset} className="flex flex-col gap-4 py-2">
          {/* New Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-new-password" className="text-xs font-semibold text-foreground">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="reset-new-password"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password (min 4 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={4}
                className="h-10 rounded-lg pr-10 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                tabIndex={-1}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </Button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-confirm-password" className="text-xs font-semibold text-foreground">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="reset-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={4}
                className="h-10 rounded-lg pr-10 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </Button>
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isPending ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 4. Delete Subscriber Confirmation Dialog
interface DeleteSubscriberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyItem | null;
  onSuccess?: () => void;
}

export function DeleteSubscriberDialog({
  open,
  onOpenChange,
  company,
  onSuccess,
}: DeleteSubscriberDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!company) return;

    startTransition(async () => {
      const res = await deleteCompanyAction(company.id);
      if (res.success) {
        toast.success(`Subscriber "${company.name}" deleted.`);
        onOpenChange(false);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to delete subscriber.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-destructive">
            Delete Subscriber
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-2">
            Are you sure you want to delete <span className="font-semibold text-foreground">{company?.name}</span>? All businesses and associated data will be permanently removed.
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
