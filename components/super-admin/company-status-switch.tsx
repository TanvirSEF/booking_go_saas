"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { toggleCompanyStatusAction } from "@/actions/admin-company";

interface CompanyStatusSwitchProps {
  companyId: string;
  companyName: string;
  initialActive: boolean;
}

export function CompanyStatusSwitch({
  companyId,
  companyName,
  initialActive,
}: CompanyStatusSwitchProps) {
  const [isActive, setIsActive] = useState(initialActive);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setIsActive(checked);

    startTransition(async () => {
      const res = await toggleCompanyStatusAction(companyId, checked);
      if (res.success) {
        toast.success(
          `${companyName} is now ${checked ? "Active" : "Disabled"}`
        );
      } else {
        // Revert on error
        setIsActive(!checked);
        toast.error(res.error || "Failed to update status");
      }
    });
  }

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={handleToggle}
      aria-label={`Toggle status for ${companyName}`}
    />
  );
}
