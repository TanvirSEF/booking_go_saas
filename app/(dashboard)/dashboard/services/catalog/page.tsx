import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { checkPlanLimit } from '@/lib/plan-limits';
import { getCategories, getServices } from '@/actions/service';
import { ServicesCatalogManager } from '@/components/dashboard/services/services-catalog-manager';
import {
  IconScissors,
  IconChevronRight,
  IconHome,
} from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Service Catalog | Services | BookingGo Dashboard',
  description: 'Manage service offerings, pricing, durations, and booking availability.',
};

interface ServiceCatalogPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function ServiceCatalogPage({
  searchParams,
}: ServiceCatalogPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard/services/catalog');
  }

  const { category: categoryParam } = await searchParams;

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

  const [activeBusiness, planLimitCheck, categoriesResult, servicesResult] = await Promise.all([
    user.activeBusinessId
      ? Business.findById(user.activeBusinessId).select('name slug currencySymbol').lean()
      : Business.findOne({ companyId }).select('name slug currencySymbol').lean(),
    checkPlanLimit(companyId, 'services'),
    getCategories(),
    getServices(),
  ]);

  const categories = categoriesResult.success && categoriesResult.data ? categoriesResult.data : [];
  const services = servicesResult.success && servicesResult.data ? servicesResult.data : [];

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
            <span className="text-muted-foreground">Services</span>
            <IconChevronRight size={13} className="text-muted-foreground/60" />
            <span className="text-foreground font-semibold">Service Catalog</span>
          </nav>

          {/* Page Title & Business Indicator */}
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <IconScissors size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Service Catalog
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeBusiness?.name
                  ? `Managing services for ${activeBusiness.name}`
                  : 'Manage appointment offerings, pricing, durations, and online booking availability.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="w-full mx-auto p-4 sm:p-6">
        <ServicesCatalogManager
          initialCategories={categories}
          initialServices={services}
          initialCategoryId={categoryParam || null}
          currencySymbol={activeBusiness?.currencySymbol || '$'}
          planQuota={planQuota}
        />
      </main>
    </div>
  );
}
