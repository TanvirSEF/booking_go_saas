import { Metadata } from "next";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { getCustomStatusesAction } from "@/actions/custom-status";
import { CustomStatusManager } from "@/components/dashboard/custom-status/custom-status-manager";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Custom Statuses | Dashboard",
  description: "Configure custom appointment lifecycle stages, color codes, and workflow badges.",
};

export default async function CustomStatusPage() {
  const res = await getCustomStatusesAction();
  const statuses = res.data || [];

  return (
    <div className="min-h-screen pb-16">
      <PageHeader
        title="Custom Statuses"
        description="Create and organize customized stages for your appointment pipeline with color badges and icons."
        icon={<IconAdjustmentsHorizontal size={22} />}
        breadcrumbs={[{ label: "Custom Statuses" }]}
      />

      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <CustomStatusManager initialStatuses={statuses} />
      </main>
    </div>
  );
}
