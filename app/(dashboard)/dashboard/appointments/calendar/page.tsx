import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/guards';
import { ACCESS, ROLES } from '@/lib/roles';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { Staff } from '@/models/Staff';
import { Location } from '@/models/Location';
import { getCalendarAppointments } from '@/actions/appointment-query';
import { PageHeader } from '@/components/dashboard/page-header';
import { AppointmentCalendar } from '@/components/dashboard/calendar/appointment-calendar';
import type { StaffOption, LocationOption } from '@/components/dashboard/calendar/calendar-filter-bar';
import { IconCalendar } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Appointment Calendar | BookingGo Dashboard',
  description: 'Interactive booking calendar with Month, Week, Day, and Agenda views.',
};

export default async function AppointmentCalendarPage() {
  const session = await requireRole(ACCESS.company, '/dashboard/appointments/calendar');

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    redirect('/login');
  }

  const companyId =
    user.role === ROLES.COMPANY
      ? user._id
      : user.companyId || null;

  if (!companyId) {
    redirect('/dashboard');
  }

  const activeBusiness = user.activeBusinessId
    ? await Business.findOne({ _id: user.activeBusinessId, companyId }).select('_id name slug').lean()
    : await Business.findOne({ companyId }).select('_id name slug').lean();

  if (!activeBusiness) {
    redirect('/dashboard');
  }

  // Calculate default initial date window: 30 days past to 60 days forward
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch initial appointments, staff list, and locations concurrently
  const [calendarRes, staffDocs, locationDocs] = await Promise.all([
    getCalendarAppointments({
      startDate,
      endDate,
      businessId: String(activeBusiness._id),
    }),
    Staff.find({
      businessId: activeBusiness._id,
      status: 'active',
    })
      .select('name colorCode')
      .lean(),
    Location.find({
      businessId: activeBusiness._id,
      status: 'active',
    })
      .select('name')
      .lean(),
  ]);

  const initialEvents =
    calendarRes.success && calendarRes.data
      ? JSON.parse(JSON.stringify(calendarRes.data))
      : [];

  const staffList: StaffOption[] = staffDocs.map((st) => ({
    id: String(st._id),
    name: st.name,
    colorCode: st.colorCode || '#CEEDC1',
  }));

  const locationList: LocationOption[] = locationDocs.map((loc) => ({
    id: String(loc._id),
    name: loc.name,
  }));

  return (
    <div className="min-h-screen pb-16">
      {/* Top Header & Breadcrumbs */}
      <PageHeader
        title="Appointment Calendar"
        description={`Interactive booking tracking and schedule inspection for ${activeBusiness.name}.`}
        icon={<IconCalendar size={22} />}
        breadcrumbs={[
          { label: 'Appointments' },
          { label: 'Calendar' },
        ]}
      />

      {/* Main Calendar View Area */}
      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <AppointmentCalendar
          initialEvents={initialEvents}
          staffList={staffList}
          locationList={locationList}
        />
      </main>
    </div>
  );
}
