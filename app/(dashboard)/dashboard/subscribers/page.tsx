import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/guards';
import { ACCESS, ROLES } from '@/lib/roles';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { getCompanySubscribersAction } from '@/actions/subscribe';
import { PageHeader } from '@/components/dashboard/page-header';
import { SubscribersTable } from '@/components/dashboard/subscribers/subscribers-table';
import { ExportSubscribersButton } from '@/components/dashboard/subscribers/export-subscribers-button';
import { IconMail } from '@tabler/icons-react';
import type { SubscriberStatus } from '@/types/subscribe';

export const metadata: Metadata = {
  title: 'Newsletter Subscribers | BookingGo Dashboard',
  description: 'Manage email opt-in subscribers, filter active vs unsubscribed records, and export audience CSV files.',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CompanySubscribersPage({ searchParams }: PageProps) {
  const session = await requireRole(ACCESS.company, '/dashboard/subscribers');

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

  const resolvedSearchParams = await searchParams;

  const page = Math.max(1, parseInt(String(resolvedSearchParams.page || '1'), 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(String(resolvedSearchParams.limit || '10'), 10) || 10));
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined;
  const status =
    typeof resolvedSearchParams.status === 'string' &&
    ['active', 'unsubscribed'].includes(resolvedSearchParams.status)
      ? (resolvedSearchParams.status as SubscriberStatus)
      : undefined;

  const subscribersRes = await getCompanySubscribersAction({
    page,
    limit,
    search,
    status,
  });

  const subscribers = subscribersRes.success && subscribersRes.data?.subscribers
    ? subscribersRes.data.subscribers
    : [];

  const counts = subscribersRes.success && subscribersRes.data?.counts
    ? subscribersRes.data.counts
    : { total: 0, active: 0, unsubscribed: 0 };

  const totalFiltered = subscribersRes.success && subscribersRes.data?.pagination?.total
    ? subscribersRes.data.pagination.total
    : 0;

  const totalPages = subscribersRes.success && subscribersRes.data?.pagination?.totalPages
    ? subscribersRes.data.pagination.totalPages
    : 1;

  return (
    <div className="min-h-screen pb-16 space-y-6">
      <PageHeader
        title="Newsletter Subscribers"
        description={`Manage email opt-in audiences and newsletter marketing subscribers for ${activeBusiness.name}.`}
        icon={<IconMail size={22} />}
        breadcrumbs={[{ label: 'Subscribers' }]}
        actions={<ExportSubscribersButton totalCount={counts.total} />}
      />

      <main className="mx-auto px-4 sm:px-6">
        <SubscribersTable
          subscribers={subscribers}
          counts={counts}
          totalFiltered={totalFiltered}
          page={page}
          limit={limit}
          totalPages={totalPages}
          filters={{ search, status }}
        />
      </main>
    </div>
  );
}
