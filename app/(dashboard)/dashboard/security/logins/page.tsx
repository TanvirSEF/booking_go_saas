import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/guards';
import { ACCESS, ROLES } from '@/lib/roles';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { getLoginHistoryAction } from '@/actions/login-detail';
import { PageHeader } from '@/components/dashboard/page-header';
import { DeviceMetricsCards } from '@/components/dashboard/security/device-metrics-cards';
import { LoginAuditTable } from '@/components/dashboard/security/login-audit-table';
import { IconShieldLock } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Login Security Audit | BookingGo Dashboard',
  description: 'Inspect company login history, device distribution, IP logs, and browser sessions for compliance.',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CompanyLoginSecurityPage({ searchParams }: PageProps) {
  const session = await requireRole(ACCESS.company, '/dashboard/security/logins');

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
    ? await Business.findOne({ _id: user.activeBusinessId, companyId }).select('_id name').lean()
    : await Business.findOne({ companyId }).select('_id name').lean();

  if (!activeBusiness) {
    redirect('/dashboard');
  }

  const resolvedSearchParams = await searchParams;

  const page = Math.max(1, parseInt(String(resolvedSearchParams.page || '1'), 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(String(resolvedSearchParams.limit || '10'), 10) || 10));
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined;
  const startDate = typeof resolvedSearchParams.startDate === 'string' ? resolvedSearchParams.startDate : undefined;
  const endDate = typeof resolvedSearchParams.endDate === 'string' ? resolvedSearchParams.endDate : undefined;
  const role = typeof resolvedSearchParams.role === 'string' ? resolvedSearchParams.role : undefined;

  const res = await getLoginHistoryAction({
    page,
    limit,
    search,
    startDate,
    endDate,
    role,
  });

  const logs = res.success && res.data?.logs ? res.data.logs : [];
  const total = res.success && res.data?.pagination?.total ? res.data.pagination.total : 0;
  const totalPages = res.success && res.data?.pagination?.totalPages ? res.data.pagination.totalPages : 1;
  const deviceBreakdown = res.success && res.data?.deviceBreakdown
    ? res.data.deviceBreakdown
    : { desktop: 0, mobile: 0, tablet: 0, other: 0 };

  return (
    <div className="min-h-screen pb-16 space-y-6">
      <PageHeader
        title="Security & Login History"
        description={`Audit login events, authenticated sessions, and device distributions for ${activeBusiness.name}.`}
        icon={<IconShieldLock size={22} />}
        breadcrumbs={[{ label: 'Security & Logins' }]}
      />

      <main className="mx-auto px-4 sm:px-6 space-y-6">
        {/* Device Breakdown Metrics */}
        <DeviceMetricsCards breakdown={deviceBreakdown} />

        {/* Audit Logs Table adhering to Rule 10 */}
        <LoginAuditTable
          logs={logs}
          total={total}
          page={page}
          limit={limit}
          totalPages={totalPages}
          isSuperAdmin={false}
          filters={{ search, startDate, endDate, role }}
        />
      </main>
    </div>
  );
}
