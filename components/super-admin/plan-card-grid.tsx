"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconCheck,
  IconAdjustmentsHorizontal,
  IconHexagonFilled,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SYSTEM_MODULES,
  ModuleCheckIndicator,
} from "./module-badges";
import {
  PlanData,
  CreatePlanDialog,
  EditPlanDialog,
  DeletePlanDialog,
} from "./plan-dialog";
import {
  togglePlanStatusAction,
  saveUsagePricingAction,
  getPlansAction,
} from "@/actions/plan";

interface PlanCardGridProps {
  initialPlans: PlanData[];
}

export function PlanCardGrid({ initialPlans }: PlanCardGridProps) {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanData[]>(initialPlans);
  const [prevInitialPlans, setPrevInitialPlans] = useState(initialPlans);

  // Sync state during render when initialPlans changes without cascading renders
  if (initialPlans !== prevInitialPlans) {
    setPrevInitialPlans(initialPlans);
    setPlans(initialPlans);
  }

  const [activeTab, setActiveTab] = useState<"pre-packaged" | "usage">("pre-packaged");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<PlanData | null>(null);
  const [deletePlan, setDeletePlan] = useState<PlanData | null>(null);

  // Instant refetch handler when plan is created, edited, or deleted
  async function handlePlansChanged() {
    try {
      const updated = await getPlansAction();
      if (Array.isArray(updated)) {
        setPlans(updated);
      }
    } catch {
      // fallback to router refresh
    }
    router.refresh();
  }

  // Top-level switch states
  const [createPackageEnabled, setCreatePackageEnabled] = useState(true);
  const [customDesignEnabled, setCustomDesignEnabled] = useState(true);

  // Usage Subscription Form State
  const usagePlan = plans.find((p) => p.isCustomPlan);
  const [usagePricing, setUsagePricing] = useState({
    basicPackagePriceMonthly: String(usagePlan?.packagePriceMonthly ?? 0),
    basicPackagePriceYearly: String(usagePlan?.packagePriceYearly ?? 0),
    perUserPriceMonthly: String(usagePlan?.pricePerUserMonthly ?? 0),
    perUserPriceYearly: String(usagePlan?.pricePerUserYearly ?? 0),
    perBusinessPriceMonthly: String(usagePlan?.pricePerBusinessMonthly ?? 0),
    perBusinessPriceYearly: String(usagePlan?.pricePerBusinessYearly ?? 0),
  });
  const [isSavingUsage, startTransition] = useTransition();

  async function handleToggleStatus(planId: string, currentStatus: boolean) {
    const nextStatus = !currentStatus;
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, isEnabled: nextStatus } : p))
    );

    const res = await togglePlanStatusAction(planId, nextStatus);
    if (res.success) {
      toast.success(
        `Plan is now ${nextStatus ? "Enabled" : "Disabled"}`
      );
      router.refresh();
    } else {
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, isEnabled: currentStatus } : p))
      );
      toast.error(res.error || "Failed to toggle plan status");
    }
  }

  function handleSaveUsage(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveUsagePricingAction({
        basicPackagePriceMonthly: Number(usagePricing.basicPackagePriceMonthly) || 0,
        basicPackagePriceYearly: Number(usagePricing.basicPackagePriceYearly) || 0,
        perUserPriceMonthly: Number(usagePricing.perUserPriceMonthly) || 0,
        perUserPriceYearly: Number(usagePricing.perUserPriceYearly) || 0,
        perBusinessPriceMonthly: Number(usagePricing.perBusinessPriceMonthly) || 0,
        perBusinessPriceYearly: Number(usagePricing.perBusinessPriceYearly) || 0,
      });

      if (res.success) {
        toast.success("Usage subscription pricing saved successfully!");
      } else {
        toast.error(res.error || "Failed to save usage pricing");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Top Header matching subscription-setting.png */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Title & Breadcrumbs */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Subscription Setting
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link
              href="/super-admin"
              className="text-primary hover:underline font-medium"
            >
              Dashboard
            </Link>
            <span>&gt;</span>
            <span className="text-muted-foreground font-medium">
              Subscription Setting
            </span>
          </div>
        </div>

        {/* Top Right Switches */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="create-pkg-switch"
              className="text-xs font-semibold text-foreground cursor-pointer"
            >
              Create Package
            </Label>
            <Switch
              id="create-pkg-switch"
              checked={createPackageEnabled}
              onCheckedChange={setCreatePackageEnabled}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label
              htmlFor="custom-design-switch"
              className="text-xs font-semibold text-foreground cursor-pointer"
            >
              Custom Design Package
            </Label>
            <Switch
              id="custom-design-switch"
              checked={customDesignEnabled}
              onCheckedChange={setCustomDesignEnabled}
            />
          </div>
        </div>
      </div>

      {/* 2. Center Tabs & Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Segmented Pill Switcher */}
        <div className="flex items-center rounded-xl border border-primary/20 bg-background p-1 shadow-2xs">
          <Button
            type="button"
            variant={activeTab === "pre-packaged" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("pre-packaged")}
            className={`rounded-lg px-4 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "pre-packaged"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pre-Packaged Subscription
          </Button>

          <Button
            type="button"
            variant={activeTab === "usage" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("usage")}
            className={`rounded-lg px-4 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "usage"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Usage Subscription
          </Button>
        </div>

        {/* Plus Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={() => setIsCreateOpen(true)}
              className="size-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
            >
              <IconPlus size={18} stroke={2.5} />
              <span className="sr-only">Create New Plan</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create New Plan</TooltipContent>
        </Tooltip>
      </div>

      {/* 3. Pre-Packaged Subscription Matrix View matching subscription-setting.png */}
      {activeTab === "pre-packaged" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-[760px] items-start gap-4">
            {/* Column 1: Feature comparison reference */}
            <div className="flex w-64 shrink-0 flex-col gap-4">
              {/* Top Compare card */}
              <div className="flex h-[240px] flex-col items-center justify-center rounded-2xl border border-border/50 bg-muted/20 p-6 text-center shadow-2xs">
                <h3 className="text-base font-bold text-foreground">
                  Compare our plans
                </h3>
              </div>

              {/* Bottom Feature Names List */}
              <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-muted/20 p-5 shadow-2xs">
                {SYSTEM_MODULES.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex h-9 items-center justify-center text-xs font-medium text-foreground"
                  >
                    {mod.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Plan Columns */}
            {plans
              .filter((p) => !p.isCustomPlan)
              .map((plan) => (
                <div
                  key={plan.id}
                  className="flex w-64 shrink-0 flex-col gap-4"
                >
                  {/* Plan Header Card */}
                  <div
                    className={`flex h-[240px] flex-col justify-between rounded-2xl border p-5 shadow-2xs transition-all ${
                      plan.isFreePlan
                        ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                        : "border-primary/30 bg-primary/[0.03]"
                    }`}
                  >
                    {/* Top Action Row */}
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={plan.isEnabled}
                        onCheckedChange={() =>
                          handleToggleStatus(plan.id, plan.isEnabled)
                        }
                        aria-label={`Toggle ${plan.name} status`}
                      />

                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => setEditPlan(plan)}
                        className="size-7 rounded-md bg-teal-500 text-white hover:bg-teal-600 hover:text-white border-none shadow-2xs cursor-pointer"
                      >
                        <IconPencil size={13} />
                        <span className="sr-only">Edit Plan</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => setDeletePlan(plan)}
                        className="size-7 rounded-md bg-rose-500 text-white hover:bg-rose-600 hover:text-white border-none shadow-2xs cursor-pointer"
                      >
                        <IconTrash size={13} />
                        <span className="sr-only">Delete Plan</span>
                      </Button>
                    </div>

                    {/* Plan Title & Pricing */}
                    <div className="my-1 flex flex-col items-center text-center">
                      <h4 className="text-base font-bold text-foreground">
                        {plan.name}
                      </h4>
                      <div className="mt-1 text-xs font-bold text-foreground">
                        ${plan.packagePriceMonthly},0
                        <span className="text-[10px] font-normal text-muted-foreground">
                          /Per Month
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        ${plan.packagePriceYearly},0
                        <span className="text-[10px] font-normal">
                          /Per Year
                        </span>
                      </div>
                    </div>

                    {/* Quota Highlights */}
                    <div className="flex flex-col gap-1 border-t border-border/30 pt-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <IconCheck size={13} className="text-emerald-500 shrink-0" />
                        <span>
                          Max User :{" "}
                          <strong className="text-foreground">
                            {plan.maxUsers === -1 ? "Unlimited" : plan.maxUsers}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <IconCheck size={13} className="text-emerald-500 shrink-0" />
                        <span>
                          Max Business :{" "}
                          <strong className="text-foreground">
                            {plan.maxBusinesses === -1
                              ? "Unlimited"
                              : plan.maxBusinesses}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <IconCheck size={13} className="text-emerald-500 shrink-0" />
                        <span>
                          Free Trial Days :{" "}
                          <strong className="text-foreground">
                            {plan.hasTrial ? plan.trialDays : 0}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Plan Features Checkmarks Card */}
                  <div
                    className={`flex flex-col gap-3 rounded-2xl border p-5 shadow-2xs ${
                      plan.isFreePlan
                        ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                        : "border-primary/30 bg-primary/[0.03]"
                    }`}
                  >
                    {SYSTEM_MODULES.map((mod) => (
                      <div
                        key={mod.id}
                        className="flex h-9 items-center justify-center"
                      >
                        <ModuleCheckIndicator
                          isIncluded={plan.modules.includes(mod.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 4. Usage Subscription View matching subscription-setting-usadge-subscriptipn-tab..png */}
      {activeTab === "usage" && (
        <div className="flex flex-col gap-6">
          {/* Top Pricing Card */}
          <form
            onSubmit={handleSaveUsage}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/40 bg-card p-5 shadow-xs"
          >
            {/* Logo box */}
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-rose-500 shadow-2xs">
              <IconHexagonFilled size={28} />
            </div>

            {/* Inputs Row */}
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-semibold text-muted-foreground">
                  Basic Package Price/Month ( $ )
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={usagePricing.basicPackagePriceMonthly}
                  onChange={(e) =>
                    setUsagePricing((prev) => ({
                      ...prev,
                      basicPackagePriceMonthly: e.target.value,
                    }))
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-semibold text-muted-foreground">
                  Basic Package Price/Year ( $ )
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={usagePricing.basicPackagePriceYearly}
                  onChange={(e) =>
                    setUsagePricing((prev) => ({
                      ...prev,
                      basicPackagePriceYearly: e.target.value,
                    }))
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-semibold text-muted-foreground">
                  Per User Price/Month ( $ )
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={usagePricing.perUserPriceMonthly}
                  onChange={(e) =>
                    setUsagePricing((prev) => ({
                      ...prev,
                      perUserPriceMonthly: e.target.value,
                    }))
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-semibold text-muted-foreground">
                  Per User Price/Year ( $ )
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={usagePricing.perUserPriceYearly}
                  onChange={(e) =>
                    setUsagePricing((prev) => ({
                      ...prev,
                      perUserPriceYearly: e.target.value,
                    }))
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-semibold text-muted-foreground">
                  Per Business Price/Month ( $ )
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={usagePricing.perBusinessPriceMonthly}
                  onChange={(e) =>
                    setUsagePricing((prev) => ({
                      ...prev,
                      perBusinessPriceMonthly: e.target.value,
                    }))
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-semibold text-muted-foreground">
                  Per Business Price/Year ( $ )
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={usagePricing.perBusinessPriceYearly}
                  onChange={(e) =>
                    setUsagePricing((prev) => ({
                      ...prev,
                      perBusinessPriceYearly: e.target.value,
                    }))
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Save Button */}
            <Button
              type="submit"
              disabled={isSavingUsage}
              className="h-9 shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-5 text-xs font-semibold shadow-2xs"
            >
              {isSavingUsage ? "Saving..." : "Save"}
            </Button>
          </form>

          {/* Add-on Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SYSTEM_MODULES.map((mod) => {
              const IconComponent = mod.icon;

              return (
                <div
                  key={mod.id}
                  className="flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-4 shadow-xs transition-shadow hover:shadow-sm"
                >
                  {/* Top: Icon & Setting button */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl ${mod.iconBg} ${mod.iconColor}`}
                    >
                      <IconComponent size={20} />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        toast.info(`Add-on configuration for ${mod.name}`)
                      }
                      className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <IconAdjustmentsHorizontal size={16} />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </div>

                  {/* Title & Category */}
                  <div className="my-3 flex flex-col">
                    <h4 className="text-sm font-bold text-foreground">
                      {mod.name}
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      {mod.category}
                    </span>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground py-1">
                    <span>
                      ${mod.defaultMonthlyPrice},0
                      <span className="text-[10px] font-normal text-muted-foreground">
                        /Month
                      </span>
                    </span>
                    <span>
                      ${mod.defaultYearlyPrice},0
                      <span className="text-[10px] font-normal text-muted-foreground">
                        /Year
                      </span>
                    </span>
                  </div>

                  {/* View Details Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.info(`Viewing details for ${mod.name}`)
                    }
                    className="mt-3 h-8 w-full rounded-lg text-xs font-medium text-foreground hover:bg-muted/40 cursor-pointer"
                  >
                    View Details
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreatePlanDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handlePlansChanged}
      />

      <EditPlanDialog
        open={!!editPlan}
        onOpenChange={(open) => !open && setEditPlan(null)}
        plan={editPlan}
        onSuccess={handlePlansChanged}
      />

      <DeletePlanDialog
        open={!!deletePlan}
        onOpenChange={(open) => !open && setDeletePlan(null)}
        plan={deletePlan}
        onSuccess={handlePlansChanged}
      />
    </div>
  );
}
