import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/guards';
import { ACCESS, ROLES } from '@/lib/roles';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { checkPlanLimit } from '@/lib/plan-limits';
import { getLocations } from '@/actions/location';
import { LocationDataTable } from '@/components/locations/location-data-table';
import { PageHeader } from '@/components/dashboard/page-header';
import { IconMapPin } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Locations Management | BookingGo Dashboard',
  description: 'Manage your organization branch locations and online booking availability.',
};

export default async function LocationsPage() {
  const session = await requireRole(ACCESS.company, '/dashboard/locations');

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

  // Fetch active business title and plan limit in parallel
  const [activeBusiness, planLimitCheck, locationsResult] = await Promise.all([
    user.activeBusinessId
      ? Business.findOne({ _id: user.activeBusinessId, companyId }).select('name slug').lean()
      : Business.findOne({ companyId }).select('name slug').lean(),
    checkPlanLimit(companyId, 'locations'),
    getLocations(),
  ]);

  const locations = locationsResult.success && locationsResult.data ? locationsResult.data : [];
  const planQuota = {
    current: planLimitCheck.current,
    max: planLimitCheck.max,
    allowed: planLimitCheck.allowed,
  };

  return (
    <div className="min-h-screen">
      {/* Top Header & Breadcrumbs */}
      <PageHeader
        title="Branch Locations"
        description={
          activeBusiness?.name
            ? `Managing locations for ${activeBusiness.name}`
            : 'Manage physical branches and appointment locations for your brand.'
        }
        icon={<IconMapPin size={22} />}
        breadcrumbs={[{ label: 'Locations' }]}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <LocationDataTable initialLocations={locations} planQuota={planQuota} />
      </main>
    </div>
  );
}
