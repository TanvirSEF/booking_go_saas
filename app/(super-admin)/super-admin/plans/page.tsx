import { connectToDatabase } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconCheck, IconTrophy } from "@tabler/icons-react";

export const metadata = {
  title: "Subscription Plans | Super Admin",
};

export default async function PlansPage() {
  await connectToDatabase();

  const plans = await Plan.find().sort({ packagePriceMonthly: 1 }).lean();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Subscription Plans
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage SaaS subscription tiers and pricing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={String(plan._id)} className="flex flex-col justify-between rounded-2xl border-border bg-card p-6 shadow-xs">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <Badge variant={plan.isEnabled ? "default" : "secondary"} className="text-[10px]">
                  {plan.isEnabled ? "Active" : "Disabled"}
                </Badge>
                {plan.isFreePlan && (
                  <Badge variant="outline" className="text-[10px]">Free</Badge>
                )}
              </div>
              <CardTitle className="mt-2 text-lg font-bold text-card-foreground">
                {plan.name}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {plan.description}
              </CardDescription>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">
                  ${plan.packagePriceMonthly}
                </span>
                <span className="text-xs text-muted-foreground">/month</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  (${plan.packagePriceYearly}/yr)
                </span>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-2 border-t border-border/50 p-0 pt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <IconCheck size={14} className="text-emerald-500" />
                <span>Max Users: {plan.maxUsers === -1 ? "Unlimited" : plan.maxUsers}</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCheck size={14} className="text-emerald-500" />
                <span>Max Businesses: {plan.maxBusinesses === -1 ? "Unlimited" : plan.maxBusinesses}</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCheck size={14} className="text-emerald-500" />
                <span>Storage: {Math.round(plan.storageLimitMb / 1024)} GB</span>
              </div>
              {plan.hasTrial && (
                <div className="flex items-center gap-2">
                  <IconTrophy size={14} className="text-amber-500" />
                  <span>{plan.trialDays}-day free trial included</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
