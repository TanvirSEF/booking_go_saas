import { Metadata } from "next";
import { getCustomStatusesAction } from "@/actions/custom-status";
import { CustomStatusManager } from "@/components/dashboard/custom-status/custom-status-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Custom Statuses | Dashboard",
  description: "Configure custom appointment lifecycle stages, color codes, and workflow badges.",
};

export default async function CustomStatusPage() {
  const res = await getCustomStatusesAction();
  const statuses = res.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Custom Statuses
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and organize customized stages for your appointment pipeline with color badges and icons.
        </p>
      </div>

      <CustomStatusManager initialStatuses={statuses} />
    </div>
  );
}
