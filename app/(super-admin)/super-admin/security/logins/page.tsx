import React from 'react';
import type { Metadata } from 'next';
import { requireRole } from '@/lib/guards';
import { ACCESS } from '@/lib/roles';
import { getLoginHistoryAction } from '@/actions/login-detail';
import { PageHeader } from '@/components/dashboard/page-header';
import { DeviceMetricsCards } from '@/components/dashboard/security/device-metrics-cards';
import { LoginAuditTable } from '@/components/dashboard/security/login-audit-table';
import { PruneLogsButton } from '@/components/dashboard/security/prune-logs-button';
import { IconShieldLock } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'Platform Login Security Audit | Super Admin',
  description: 'Global audit logs, authenticated session compliance, device metrics, and log retention pruning.',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SuperAdminLoginSecurityPage({ searchParams }: PageProps) {
  await requireRole(ACCESS.superAdmin, '/super-admin/security/logins');

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
        title="Global Security Audit"
        description="Platform-wide audit trail for all company, staff, and customer login sessions."
        icon={<IconShieldLock size={22} />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/super-admin' },
          { label: 'Security & Logins' },
        ]}
        actions={<PruneLogsButton />}
      />

      <main className="mx-auto px-4 sm:px-6 space-y-6">
        {/* Device Metrics Breakdown */}
        <DeviceMetricsCards breakdown={deviceBreakdown} />

        {/* Global Audit Logs Table adhering to Rule 10 */}
        <LoginAuditTable
          logs={logs}
          total={total}
          page={page}
          limit={limit}
          totalPages={totalPages}
          isSuperAdmin={true}
          filters={{ search, startDate, endDate, role }}
        />
      </main>
    </div>
  );
}
