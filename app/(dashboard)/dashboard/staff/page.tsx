import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { getStaffListAction } from '@/actions/staff';
import { getLocations } from '@/actions/location';
import { getServices } from '@/actions/service';
import { PageHeader } from '@/components/dashboard/page-header';
import { StaffDataTable } from '@/components/staff/staff-data-table';
import type { TagOption } from '@/components/staff/staff-tag-picker';
import { IconUsers } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Staff Management | BookingGo Dashboard',
  description: 'Manage specialists, staff accounts, location assignments, and service bookings.',
};

export default async function StaffPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard/staff');
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

  // Fetch staff list, locations, services, and active business in parallel
  const [activeBusiness, staffRes, locationsRes, servicesRes] = await Promise.all([
    user.activeBusinessId
      ? Business.findById(user.activeBusinessId).select('name slug').lean()
      : Business.findOne({ companyId }).select('name slug').lean(),
    getStaffListAction(),
    getLocations(),
    getServices(),
  ]);

  const staff = staffRes.success && staffRes.data ? staffRes.data : [];
  const planQuota = staffRes.quota;

  const locationOptions: TagOption[] =
    locationsRes.success && locationsRes.data
      ? locationsRes.data.map((loc) => ({
        id: loc.id,
        name: loc.name,
        subtitle: loc.address,
      }))
      : [];

  const serviceOptions: TagOption[] =
    servicesRes.success && servicesRes.data
      ? servicesRes.data.map((svc) => ({
        id: svc.id,
        name: svc.name,
        subtitle: `${svc.categoryName} · ${svc.durationMinutes}m · $${svc.price}`,
      }))
      : [];

  return (
    <div className="min-h-screen">
      {/* Top Header & Breadcrumbs */}
      <PageHeader
        title="Staff & Specialists"
        description={
          activeBusiness?.name
            ? `Managing team members and specialists for ${activeBusiness.name}`
            : 'Manage team specialists, invite logins, and assign locations and services.'
        }
        icon={<IconUsers size={22} />}
        breadcrumbs={[{ label: 'Staff' }]}
      />

      {/* Main Content Area */}
      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <StaffDataTable
          initialStaff={staff}
          locationOptions={locationOptions}
          serviceOptions={serviceOptions}
          planQuota={planQuota}
        />
      </main>
    </div>
  );
}
