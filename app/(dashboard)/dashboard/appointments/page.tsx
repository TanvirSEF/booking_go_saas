import { Metadata } from "next";
import { getCompanyAppointmentsAction } from "@/actions/appointment-management";
import { AppointmentsTable } from "@/components/dashboard/appointments/appointments-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appointments & Bookings | Dashboard",
  description: "View and manage customer appointments, update statuses, and verify offline bank transfer payments.",
};

export default async function AppointmentsPage() {
  const initialData = await getCompanyAppointmentsAction({
    page: 1,
    limit: 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          All Bookings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor and manage your customer appointment schedule, review statuses, and verify bank transfer receipts.
        </p>
      </div>

      <AppointmentsTable initialData={initialData} />
    </div>
  );
}
