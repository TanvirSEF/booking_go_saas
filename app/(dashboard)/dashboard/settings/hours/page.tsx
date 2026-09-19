import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/guards';
import { ACCESS, ROLES } from '@/lib/roles';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { getBusinessHoursAction } from '@/actions/business-hours';
import { PageHeader } from '@/components/dashboard/page-header';
import { BusinessHoursForm } from '@/components/settings/business-hours-form';
import { IconClock } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Business Hours & Shifts | BookingGo Dashboard',
  description: 'Configure weekly business opening/closing hours and lunch break windows.',
};

export default async function BusinessHoursPage() {
  const session = await requireRole(ACCESS.company, '/dashboard/settings/hours');

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

  // Fetch active business & business hours concurrently
  const [activeBusiness, hoursRes] = await Promise.all([
    user.activeBusinessId
      ? Business.findOne({ _id: user.activeBusinessId, companyId }).select('name slug').lean()
      : Business.findOne({ companyId }).select('name slug').lean(),
    getBusinessHoursAction(),
  ]);

  const initialHours =
    hoursRes.success && hoursRes.data?.businessHours
      ? JSON.parse(JSON.stringify(hoursRes.data.businessHours))
      : [];

  return (
    <div className="min-h-screen pb-16">
      {/* Top Header & Breadcrumbs */}
      <PageHeader
        title="Operating Hours & Breaks"
        description={
          activeBusiness?.name
            ? `Set weekly open hours and daily break intervals for ${activeBusiness.name}.`
            : 'Configure your operating schedule and break intervals for customer booking appointments.'
        }
        icon={<IconClock size={22} />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Operating Hours' },
        ]}
      />

      {/* Main Content Area */}
      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <BusinessHoursForm initialHours={initialHours} />
      </main>
    </div>
  );
}
