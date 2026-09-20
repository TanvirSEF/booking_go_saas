'use server';

import { auth } from '@/auth';
import { computeSuperAdminAnalytics } from '@/lib/admin-analytics';
import type { SuperAdminAnalyticsActionResult } from '@/types/admin-analytics';

/**
 * Super Admin SaaS Financial Analytics & KPI Aggregation Server Action.
 * Requires active Super Admin session.
 */
export async function getSuperAdminAnalyticsAction(options?: {
  chartDays?: number;
}): Promise<SuperAdminAnalyticsActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'super admin') {
      return { success: false, error: 'Unauthorized: Super Admin access required.' };
    }

    const data = await computeSuperAdminAnalytics(options);

    return {
      success: true,
      data,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve Super Admin analytics.';
    return { success: false, error: message };
  }
}
