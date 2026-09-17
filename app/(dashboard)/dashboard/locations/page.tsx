import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { checkPlanLimit } from '@/lib/plan-limits';
import { getLocations } from '@/actions/location';
import { LocationDataTable } from '@/components/locations/location-data-table';
import {
  IconMapPin,
  IconChevronRight,
  IconHome,
} from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Locations Management | BookingGo Dashboard',
  description: 'Manage your organization branch locations and online booking availability.',
};

export default async function LocationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard/locations');
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

  // Fetch active business title and plan limit in parallel
  const [activeBusiness, planLimitCheck, locationsResult] = await Promise.all([
    user.activeBusinessId
      ? Business.findById(user.activeBusinessId).select('name slug').lean()
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
      <div>
        <div className="mx-auto px-4 sm:px-6">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3 font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <IconHome size={14} />
              <span>Dashboard</span>
            </Link>
            <IconChevronRight size={13} className="text-muted-foreground/60" />
            <span className="text-foreground font-semibold">Locations</span>
          </nav>

          {/* Page Title & Business Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <IconMapPin size={22} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Branch Locations
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeBusiness?.name
                      ? `Managing locations for ${activeBusiness.name}`
                      : 'Manage physical branches and appointment locations for your brand.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <LocationDataTable initialLocations={locations} planQuota={planQuota} />
      </main>
    </div>
  );
}
