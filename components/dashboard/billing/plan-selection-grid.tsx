"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconCheck,
  IconBuildingBank,
  IconCreditCard,
  IconClock,
  IconSparkles,
  IconLoader2,
} from "@tabler/icons-react";
import { PayWithBankModal } from "./pay-with-bank-modal";
import { createStripeCheckoutSession } from "@/actions/billing";
import { toast } from "sonner";

export interface PlanItem {
  id: string;
  name: string;
  packagePriceMonthly: number;
  packagePriceYearly: number;
  maxUsers: number;
  maxBusinesses: number;
  maxLocations: number;
  maxServices: number;
  modules: string[];
  description?: string;
  isFreePlan?: boolean;
}

export interface PendingTransferItem {
  id: string;
  planName?: string;
  price: number;
  createdAt: string;
  orderNumber?: string;
}

interface PlanSelectionGridProps {
  plans: PlanItem[];
  currentPlanId?: string | null;
  currentPlanName?: string | null;
  billingCycle?: "monthly" | "yearly";
  planExpireDate?: string | null;
  pendingTransfers?: PendingTransferItem[];
}

export function PlanSelectionGrid({
  plans,
  currentPlanId,
  currentPlanName,
  billingCycle: initialBillingCycle = "monthly",
  planExpireDate,
  pendingTransfers = [],
}: PlanSelectionGridProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(initialBillingCycle);
  const [selectedPlanForBank, setSelectedPlanForBank] = useState<PlanItem | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const handleStripeCheckout = async (plan: PlanItem) => {
    try {
      setLoadingPlanId(plan.id);
      const res = await createStripeCheckoutSession({
        planId: plan.id,
        billingType: billingCycle,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to initiate payment session.");
        return;
      }

      if (res.url) {
        window.location.assign(res.url);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment initialization failed.");
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Pending Transfer Alert Banner */}
      {pendingTransfers.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            <IconClock size={18} />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-sm text-foreground">
              Offline Wire Transfer Under Review
            </p>
            <p className="leading-relaxed">
              You have submitted an offline bank transfer of{" "}
              <strong>${pendingTransfers[0].price.toFixed(2)}</strong> for the{" "}
              <strong>{pendingTransfers[0].planName || "Subscription"}</strong> plan (Order{" "}
              <span className="font-mono">{pendingTransfers[0].orderNumber || pendingTransfers[0].id}</span>
              ). Your subscription will activate as soon as administrator verifies the deposit receipt.
            </p>
          </div>
        </div>
      )}

      {/* Current Subscription Status Card */}
      <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Plan
              </span>
              <Badge variant="outline" className="text-xs font-semibold border-primary/40 text-primary">
                Active
              </Badge>
            </div>
            <p className="text-xl font-bold text-foreground">
              {currentPlanName || "Free Starter Plan"}
            </p>
            {planExpireDate && (
              <p className="text-xs text-muted-foreground">
                Next renewal date:{" "}
                <span className="font-medium text-foreground">
                  {new Date(planExpireDate).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </p>
            )}
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex flex-col sm:items-end gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Billing Interval:</span>
            <div className="flex items-center p-1 rounded-xl border border-border bg-muted/40 shadow-2xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  billingCycle === "yearly"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Yearly</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-primary/10 text-primary border-none">
                  Save 20%
                </Badge>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {plans.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const price =
            billingCycle === "yearly" ? plan.packagePriceYearly : plan.packagePriceMonthly;
          const isPending = loadingPlanId === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl border transition-all overflow-visible ${
                isCurrent
                  ? "border-2 border-primary shadow-md bg-primary/5 dark:bg-primary/10"
                  : "border-border bg-card shadow-2xs hover:shadow-md"
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 shadow-xs rounded-full flex items-center gap-1.5 whitespace-nowrap">
                    <IconCheck size={13} strokeWidth={2.5} />
                    <span>Current Plan</span>
                  </Badge>
                </div>
              )}

              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-foreground">
                    {plan.name}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-1 min-h-[32px]">
                  {plan.description || "Comprehensive scheduling and booking suite for your company."}
                </CardDescription>

                {/* Price Display */}
                <div className="mt-4 pt-3 border-t border-border flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground">
                    ${price.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    /{billingCycle === "yearly" ? "year" : "month"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-5 flex-1 flex flex-col justify-between">
                {/* Features List */}
                <div className="space-y-2.5 text-xs text-muted-foreground py-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <IconCheck size={16} className="text-primary shrink-0" />
                    <span className="text-foreground">
                      <strong>{plan.maxUsers}</strong> Team Members / Staff
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconCheck size={16} className="text-primary shrink-0" />
                    <span className="text-foreground">
                      <strong>{plan.maxBusinesses}</strong> Business Tenant Locations
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconCheck size={16} className="text-primary shrink-0" />
                    <span className="text-foreground">
                      <strong>
                        {plan.maxServices === -1 ? "Unlimited" : plan.maxServices}
                      </strong>{" "}
                      Bookable Services
                    </span>
                  </div>
                  {plan.modules && plan.modules.length > 0 && (
                    <div className="flex items-center gap-2">
                      <IconSparkles size={16} className="text-primary shrink-0" />
                      <span className="text-foreground">
                        {plan.modules.length} Included Feature Modules
                      </span>
                    </div>
                  )}
                </div>

                {/* Checkout CTA Buttons */}
                <div className="space-y-2 pt-3 border-t border-border">
                  {isCurrent ? (
                    <Button
                      variant="outline"
                      disabled
                      className="w-full text-xs font-semibold rounded-xl"
                    >
                      Active Plan
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        onClick={() => handleStripeCheckout(plan)}
                        disabled={isPending}
                        className="w-full text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer"
                      >
                        {isPending ? (
                          <IconLoader2 size={14} className="animate-spin" />
                        ) : (
                          <IconCreditCard size={15} />
                        )}
                        <span>Pay with Card (Stripe)</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedPlanForBank(plan)}
                        className="w-full text-xs font-medium rounded-xl gap-1.5 cursor-pointer hover:bg-muted"
                      >
                        <IconBuildingBank size={15} className="text-primary" />
                        <span>Pay via Bank Transfer</span>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Offline Bank Checkout Modal */}
      {selectedPlanForBank && (
        <PayWithBankModal
          isOpen={Boolean(selectedPlanForBank)}
          onClose={() => setSelectedPlanForBank(null)}
          plan={selectedPlanForBank}
          initialCycle={billingCycle}
          onSuccess={() => {
            setSelectedPlanForBank(null);
          }}
        />
      )}
    </div>
  );
}
