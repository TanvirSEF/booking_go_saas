import React from "react";
import { Metadata } from "next";
import { requireRole } from "@/lib/guards";
import { ACCESS } from "@/lib/roles";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Plan } from "@/models/Plan";
import { BankTransferPayment } from "@/models/BankTransferPayment";
import { PlanSelectionGrid, type PlanItem, type PendingTransferItem } from "@/components/dashboard/billing/plan-selection-grid";

export const metadata: Metadata = {
  title: "Subscription & Billing | Company Portal",
  description: "Manage your company subscription package, view available plans, and pay offline or online.",
};

export default async function CompanyBillingPage() {
  // 1. RBAC Guard: Company allowlist only
  const session = await requireRole(ACCESS.company, "/dashboard/billing");

  await connectToDatabase();

  // 2. Query company user, active plans, and pending transfer submissions in parallel
  const [currentUser, rawPlans, pendingPayments] = await Promise.all([
    User.findById(session.user.id).populate("activePlanId").lean(),
    Plan.find({ isEnabled: true }).sort({ packagePriceMonthly: 1 }).lean(),
    BankTransferPayment.find({ companyId: session.user.id, status: "Pending" })
      .populate({ path: "planId", select: "name", strictPopulate: false })
      .populate({ path: "orderId", select: "orderNumber", strictPopulate: false })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  interface PopulatedUser {
    activePlanId?: { _id?: unknown; name?: string } | null;
    billingType?: "monthly" | "yearly";
    planExpireDate?: Date | null;
  }

  const typedUser = currentUser as unknown as PopulatedUser | null;
  const currentPlanId = typedUser?.activePlanId ? String(typedUser.activePlanId._id || typedUser.activePlanId) : null;
  const currentPlanName = typedUser?.activePlanId?.name || null;
  const billingCycle = typedUser?.billingType || "monthly";
  const planExpireDate = typedUser?.planExpireDate ? typedUser.planExpireDate.toISOString() : null;

  const plans: PlanItem[] = rawPlans.map((p) => ({
    id: String(p._id),
    name: p.name,
    packagePriceMonthly: p.packagePriceMonthly,
    packagePriceYearly: p.packagePriceYearly,
    maxUsers: p.maxUsers,
    maxBusinesses: p.maxBusinesses,
    maxLocations: p.maxLocations ?? -1,
    maxServices: p.maxServices ?? -1,
    modules: p.modules || [],
    description: p.description,
    isFreePlan: p.isFreePlan,
  }));

  interface PopulatedPendingPayment {
    _id: unknown;
    planId?: { name?: string } | null;
    orderId?: { orderNumber?: string } | null;
    price: number;
    createdAt: Date;
  }

  const pendingTransfers: PendingTransferItem[] = (pendingPayments as unknown as PopulatedPendingPayment[]).map((p) => ({
    id: String(p._id),
    planName: p.planId?.name,
    price: p.price,
    orderNumber: p.orderId?.orderNumber,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Subscription & Billing
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Upgrade your organization package, scale team capacity, or renew your subscription tier.
        </p>
      </div>

      <PlanSelectionGrid
        plans={plans}
        currentPlanId={currentPlanId}
        currentPlanName={currentPlanName}
        billingCycle={billingCycle}
        planExpireDate={planExpireDate}
        pendingTransfers={pendingTransfers}
      />
    </div>
  );
}
