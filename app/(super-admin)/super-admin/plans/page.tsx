import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { PlanCardGrid } from "@/components/super-admin/plan-card-grid";
import { PlanData } from "@/components/super-admin/plan-dialog";

export const metadata = {
  title: "Subscription Setting | Super Admin",
};

export const revalidate = 0; // Live dynamic data

export default async function PlansPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/super-admin/plans");
  }

  if (session.user.role !== "super admin") {
    redirect("/dashboard");
  }

  await connectToDatabase();

  const rawPlans = await Plan.find().sort({ packagePriceMonthly: 1 }).lean();

  const plans: PlanData[] = rawPlans.map((p) => ({
    id: String(p._id),
    name: p.name,
    packagePriceMonthly: p.packagePriceMonthly,
    packagePriceYearly: p.packagePriceYearly,
    pricePerUserMonthly: p.pricePerUserMonthly,
    pricePerUserYearly: p.pricePerUserYearly,
    pricePerBusinessMonthly: p.pricePerBusinessMonthly,
    pricePerBusinessYearly: p.pricePerBusinessYearly,
    maxUsers: p.maxUsers,
    maxBusinesses: p.maxBusinesses,
    maxLocations: p.maxLocations ?? -1,
    maxServices: p.maxServices ?? -1,
    storageLimitMb: p.storageLimitMb ?? 1024,
    modules: p.modules || [],
    isCustomPlan: Boolean(p.isCustomPlan),
    isFreePlan: Boolean(p.isFreePlan),
    hasTrial: Boolean(p.hasTrial),
    trialDays: p.trialDays || 0,
    isEnabled: p.isEnabled ?? true,
    description: p.description,
  }));

  return (
    <div className="w-full">
      <PlanCardGrid initialPlans={plans} />
    </div>
  );
}
