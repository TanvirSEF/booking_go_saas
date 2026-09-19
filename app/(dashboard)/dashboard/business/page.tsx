import { Metadata } from "next";
import { getCompanyBusinessesAction } from "@/actions/business";
import { auth } from "@/auth";
import { BusinessCardGrid } from "@/components/dashboard/business/business-card-grid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Branch & Multi-Business Hub | Dashboard",
  description: "Manage multiple business branches, public booking storefronts, operating rules, and currencies.",
};

export default async function DashboardBusinessPage() {
  const session = await auth();
  const res = await getCompanyBusinessesAction();
  const businesses = res.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Business & Branch Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create, switch, and configure distinct operating branches under your company umbrella.
        </p>
      </div>

      <BusinessCardGrid
        initialBusinesses={businesses}
        activeBusinessId={session?.user?.activeBusinessId || undefined}
      />
    </div>
  );
}
