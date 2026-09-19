import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole, getSession } from "@/lib/guards";
import { ACCESS, ROLES } from "@/lib/roles";
import { getActiveBusiness } from "@/lib/business";
import { getTenantDashboardMetrics } from "@/actions/appointment-query";
import { CompanyHeroBanner } from "@/components/dashboard/company-hero-banner";
import { QuickActionsBar } from "@/components/dashboard/quick-actions-bar";
import { OverviewKpiCards } from "@/components/dashboard/overview-kpi-cards";
import { RecentAppointmentsCard } from "@/components/dashboard/recent-appointments-card";
import { EmbedCodeCard } from "@/components/dashboard/embed-code-card";

export const metadata: Metadata = {
  title: "Dashboard | BookingGo",
  description: "Company admin overview dashboard and appointment metrics.",
};

export default async function TenantDashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  // Super Admin can view /dashboard only if they have an active business selected
  if (session.user.role === ROLES.SUPER_ADMIN) {
    if (!session.user.activeBusinessId) {
      redirect("/super-admin");
    }
  } else {
    await requireRole(ACCESS.company, "/dashboard");
  }

  const business = await getActiveBusiness(session.user);

  const businessId = business?._id ? String(business._id) : undefined;
  const metricsResult = await getTenantDashboardMetrics(businessId);
  const metrics = metricsResult.success ? metricsResult.data : undefined;

  const businessName = business?.name || "My Business";
  const businessSlug = business?.slug || "";
  const currencySymbol = business?.currencySymbol || "$";

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* 1. Top Hero Banner */}
      <CompanyHeroBanner
        businessName={businessName}
        businessSlug={businessSlug}
      />

      {/* 2. Quick Actions Toolbar */}
      <QuickActionsBar
        businessSlug={businessSlug}
        businessName={businessName}
      />

      {/* 3. Top 4 Core KPI Metrics */}
      <OverviewKpiCards
        metrics={metrics}
        currencySymbol={currencySymbol}
      />

      {/* 4. Recent Appointments Feed */}
      <RecentAppointmentsCard
        appointments={metrics?.recentAppointments}
        currencySymbol={currencySymbol}
      />

      {/* 5. Embed Code Snippet Card */}
      {businessSlug && (
        <EmbedCodeCard
          businessSlug={businessSlug}
          businessName={businessName}
        />
      )}
    </div>
  );
}
