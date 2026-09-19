import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/guards';
import { ACCESS, ROLES } from '@/lib/roles';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { getBusinessHolidaysAction } from '@/actions/business-holidays';
import { PageHeader } from '@/components/dashboard/page-header';
import { HolidaysManager } from '@/components/dashboard/holidays/holidays-manager';
import { IconCalendarEvent } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Holidays & Off-Days | BookingGo Dashboard',
  description: 'Configure official company holidays, annual shutdowns, and custom off-days.',
};

export default async function BusinessHolidaysPage() {
  const session = await requireRole(ACCESS.company, '/dashboard/business/holidays');

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

  // Fetch active business & holidays concurrently
  const [activeBusiness, holidaysRes] = await Promise.all([
    user.activeBusinessId
      ? Business.findOne({ _id: user.activeBusinessId, companyId }).select('name slug').lean()
      : Business.findOne({ companyId }).select('name slug').lean(),
    getBusinessHolidaysAction(),
  ]);

  const initialHolidays =
    holidaysRes.success && holidaysRes.data
      ? JSON.parse(JSON.stringify(holidaysRes.data))
      : [];

  return (
    <div className="min-h-screen pb-16">
      {/* Top Header & Breadcrumbs */}
      <PageHeader
        title="Holidays & Off-Days"
        description={
          activeBusiness?.name
            ? `Manage official closed dates and holiday schedules for ${activeBusiness.name}.`
            : 'Configure company holidays and seasonal shutdowns to block booking availability.'
        }
        icon={<IconCalendarEvent size={22} />}
        breadcrumbs={[
          { label: 'Business' },
          { label: 'Holidays' },
        ]}
      />

      {/* Main Content Area */}
      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <HolidaysManager initialHolidays={initialHolidays} />
      </main>
    </div>
  );
}
