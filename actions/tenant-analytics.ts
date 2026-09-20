'use server';

import { Types } from 'mongoose';
import { auth } from '@/auth';
import { computeTenantDashboardAnalytics } from '@/lib/tenant-analytics';
import {
  tenantAnalyticsFilterSchema,
  type TenantAnalyticsFilterInput,
  type TenantAnalyticsActionResponse,
} from '@/types/tenant-analytics';

/**
 * Company & Staff Multi-Tenant Business KPI & Appointment Analytics Server Action.
 * Replicates Laravel WorkDo's `HomeController@AppointmentDashboard`.
 */
export async function getTenantAnalyticsAction(
  params?: TenantAnalyticsFilterInput
): Promise<TenantAnalyticsActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please log in to access analytics.' };
    }

    const role = (session.user.role || '').toLowerCase().trim();
    const isSuperAdmin = role === 'super admin' || role === 'superadmin';
    const isCompany = role === 'company';
    const isStaff = role === 'staff';

    if (!isSuperAdmin && !isCompany && !isStaff) {
      return { success: false, error: 'Permission denied. Unauthorized role.' };
    }

    const validatedInput = tenantAnalyticsFilterSchema.safeParse(params || {});
    if (!validatedInput.success) {
      return {
        success: false,
        error: validatedInput.error.issues[0]?.message || 'Invalid filter parameters.',
      };
    }

    const { durationDays, startDate, endDate, staffId, requestedBusinessId } =
      validatedInput.data;

    let companyId: Types.ObjectId;
    if (isCompany) {
      companyId = new Types.ObjectId(session.user.id);
    } else if (isStaff && session.user.companyId) {
      companyId = new Types.ObjectId(session.user.companyId);
    } else if (isSuperAdmin) {
      companyId = new Types.ObjectId(session.user.id);
    } else {
      return { success: false, error: 'Unable to resolve tenant organization context.' };
    }

    const rawBusinessId = requestedBusinessId || session.user.activeBusinessId;
    if (!rawBusinessId || !Types.ObjectId.isValid(rawBusinessId)) {
      return {
        success: false,
        error: 'No active business selected. Please select a business from the switcher.',
      };
    }

    const businessId = new Types.ObjectId(rawBusinessId);

    const data = await computeTenantDashboardAnalytics({
      companyId,
      businessId,
      durationDays: durationDays || 7,
      startDate,
      endDate,
      staffId,
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve tenant analytics.';
    return { success: false, error: message };
  }
}
