import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { Staff } from '@/models/Staff';
import { getCompanyAppointments } from '@/actions/appointment-query';
import { PageHeader } from '@/components/dashboard/page-header';
import { AppointmentDataTable } from '@/components/appointments/appointment-data-table';
import { Button } from '@/components/ui/button';
import { IconCalendar, IconCalendarEvent } from '@tabler/icons-react';
import type { StaffFilterOption } from '@/components/appointments/appointment-table-filters';

export const metadata: Metadata = {
  title: 'Appointments Management | BookingGo Dashboard',
  description: 'Filterable appointments data table with real-time search, status transitions, and slot rescheduling.',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CompanyAppointmentsPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard/appointments');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    redirect('/login');
  }

  const companyId =
    user.role === 'company'
      ? user._id
      : user.companyId || null;

  if (!companyId) {
    redirect('/dashboard');
  }

  const activeBusiness = user.activeBusinessId
    ? await Business.findById(user.activeBusinessId).select('_id name currencySymbol').lean()
    : await Business.findOne({ companyId }).select('_id name currencySymbol').lean();

  if (!activeBusiness) {
    redirect('/dashboard');
  }

  // Next.js 15+ searchParams is a Promise
  const resolvedSearchParams = await searchParams;

  const page = Math.max(1, parseInt(String(resolvedSearchParams.page || '1'), 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(String(resolvedSearchParams.limit || '10'), 10) || 10));
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined;
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined;
  const staffId = typeof resolvedSearchParams.staffId === 'string' ? resolvedSearchParams.staffId : undefined;
  const startDate = typeof resolvedSearchParams.startDate === 'string' ? resolvedSearchParams.startDate : undefined;
  const endDate = typeof resolvedSearchParams.endDate === 'string' ? resolvedSearchParams.endDate : undefined;

  // Concurrent data fetching: Appointments & active staff members
  const [appointmentsRes, staffDocs] = await Promise.all([
    getCompanyAppointments({
      page,
      limit,
      search,
      status,
      staffId,
      startDate,
      endDate,
      businessId: String(activeBusiness._id),
    }),
    Staff.find({
      businessId: activeBusiness._id,
      isActive: true,
    })
      .select('name colorCode')
      .lean(),
  ]);

  const appointments = appointmentsRes.success && appointmentsRes.data?.appointments
    ? appointmentsRes.data.appointments
    : [];
  const total = appointmentsRes.success && appointmentsRes.data?.total ? appointmentsRes.data.total : 0;
  const totalPages = appointmentsRes.success && appointmentsRes.data?.totalPages
    ? appointmentsRes.data.totalPages
    : Math.ceil(total / limit);

  const staffList: StaffFilterOption[] = staffDocs.map((st) => ({
    id: String(st._id),
    name: st.name,
    colorCode: st.colorCode || '#CEEDC1',
  }));

  return (
    <div className="min-h-screen pb-16 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Appointments"
        description={`Comprehensive booking registry and schedule administration for ${activeBusiness.name}.`}
        icon={<IconCalendarEvent size={22} />}
        breadcrumbs={[{ label: 'Appointments' }]}
        actions={
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 cursor-pointer">
            <Link href="/dashboard/appointments/calendar">
              <IconCalendar size={16} />
              <span>Calendar View</span>
            </Link>
          </Button>
        }
      />

      {/* Main Data Table Area */}
      <main className="mx-auto px-4 sm:px-6">
        <AppointmentDataTable
          appointments={appointments}
          total={total}
          page={page}
          limit={limit}
          totalPages={totalPages}
          staffList={staffList}
          currencySymbol={activeBusiness.currencySymbol || '$'}
          filters={{
            search,
            status,
            staffId,
            startDate,
            endDate,
          }}
        />
      </main>
    </div>
  );
}
