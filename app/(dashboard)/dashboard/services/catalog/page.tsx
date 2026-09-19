import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/guards';
import { ACCESS, ROLES } from '@/lib/roles';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { checkPlanLimit } from '@/lib/plan-limits';
import { getCategories, getServices } from '@/actions/service';
import { ServicesCatalogManager } from '@/components/dashboard/services/services-catalog-manager';
import { PageHeader } from '@/components/dashboard/page-header';
import { IconScissors } from '@tabler/icons-react';

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
  const session = await requireRole(ACCESS.company, '/dashboard/services/catalog');

  const { category: categoryParam } = await searchParams;

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

  const [activeBusiness, planLimitCheck, categoriesResult, servicesResult] = await Promise.all([
    user.activeBusinessId
      ? Business.findOne({ _id: user.activeBusinessId, companyId }).select('name slug currencySymbol').lean()
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
      <PageHeader
        title="Service Catalog"
        description={
          activeBusiness?.name
            ? `Managing services for ${activeBusiness.name}`
            : 'Manage appointment offerings, pricing, durations, and online booking availability.'
        }
        icon={<IconScissors size={24} />}
        breadcrumbs={[
          { label: 'Services', href: '/dashboard/services/catalog' },
          { label: 'Service Catalog' },
        ]}
      />

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
