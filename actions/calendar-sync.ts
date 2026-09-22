'use server';

import { Types } from 'mongoose';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { Staff } from '@/models/Staff';
import {
  ensureBusinessFeedToken,
  ensureStaffFeedToken,
  rotateBusinessFeedToken,
  rotateStaffFeedToken,
  getCalendarFeedSummary,
  buildFeedUrls,
} from '@/lib/calendar-feed-engine';
import type {
  CalendarFeedScope,
  CalendarFeedUrls,
  CalendarFeedSummary,
  RotateFeedTokenResult,
} from '@/types/calendar-feed';

async function resolveTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User account not found.');
  }

  const companyId =
    user.role === 'company'
      ? user._id
      : user.companyId
        ? new Types.ObjectId(user.companyId)
        : null;

  if (!companyId) {
    throw new Error('Company context could not be determined.');
  }

  let activeBusinessId = user.activeBusinessId;
  let activeBusiness = null;

  if (activeBusinessId) {
    activeBusiness = await Business.findOne({ _id: activeBusinessId, companyId }).lean();
  }

  if (!activeBusiness) {
    activeBusiness = await Business.findOne({ companyId }).lean();
    if (activeBusiness) {
      activeBusinessId = activeBusiness._id;
      await User.findByIdAndUpdate(user._id, { activeBusinessId: activeBusiness._id });
    }
  }

  if (!activeBusinessId || !activeBusiness) {
    throw new Error('No active business found for this organization.');
  }

  // Check if current user is linked to a staff record
  const staffRecord = await Staff.findOne({
    userId: user._id,
    businessId: activeBusinessId,
  }).lean();

  return {
    userId: user._id,
    userRole: user.role,
    companyId,
    businessId: activeBusinessId,
    businessName: activeBusiness.name || 'Business',
    staffId: staffRecord ? staffRecord._id : null,
    staffName: staffRecord ? staffRecord.name : null,
  };
}

/**
 * Retrieves the current HTTPS and webcal:// feed URLs for business and staff.
 */
export async function getCalendarFeedUrlsAction(): Promise<{
  success: boolean;
  data?: CalendarFeedUrls;
  error?: string;
}> {
  try {
    const { businessId, staffId } = await resolveTenantContext();

    const businessToken = await ensureBusinessFeedToken(String(businessId));
    const { feedUrl: businessFeedUrl, webcalUrl: webcalBusinessUrl } = buildFeedUrls(businessToken);

    let staffFeedUrl: string | undefined;
    let webcalStaffUrl: string | undefined;
    let staffToken: string | undefined;

    if (staffId) {
      staffToken = await ensureStaffFeedToken(String(staffId));
      const urls = buildFeedUrls(staffToken);
      staffFeedUrl = urls.feedUrl;
      webcalStaffUrl = urls.webcalUrl;
    }

    return {
      success: true,
      data: {
        businessFeedUrl,
        webcalBusinessUrl,
        staffFeedUrl,
        webcalStaffUrl,
        businessToken,
        staffToken,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve calendar feed URLs.';
    return { success: false, error: message };
  }
}

/**
 * Rotates a calendar feed token for a business or a staff member.
 */
export async function rotateCalendarFeedTokenAction(
  scope: CalendarFeedScope,
  targetStaffId?: string
): Promise<RotateFeedTokenResult> {
  try {
    const { userRole, businessId, staffId: ownStaffId } = await resolveTenantContext();

    let newToken: string;

    if (scope === 'business') {
      if (userRole !== 'company' && userRole !== 'super admin') {
        return {
          success: false,
          error: 'Forbidden. Only organization owners can rotate business-wide calendar feed URLs.',
        };
      }
      newToken = await rotateBusinessFeedToken(String(businessId));
    } else {
      // Staff scope
      const effectiveStaffId = targetStaffId || (ownStaffId ? String(ownStaffId) : null);

      if (!effectiveStaffId) {
        return { success: false, error: 'Staff identifier could not be determined.' };
      }

      // Security: if rotating someone else's staff token, must be company owner
      if (ownStaffId && String(ownStaffId) !== effectiveStaffId) {
        if (userRole !== 'company' && userRole !== 'super admin') {
          return {
            success: false,
            error: 'Forbidden. You do not have permission to rotate this staff member feed URL.',
          };
        }
      }

      newToken = await rotateStaffFeedToken(effectiveStaffId);
    }

    const { feedUrl: newFeedUrl, webcalUrl: newWebcalUrl } = buildFeedUrls(newToken);

    return {
      success: true,
      scope,
      newToken,
      newFeedUrl,
      newWebcalUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rotate calendar feed token.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves summary statistics for a business or staff feed.
 */
export async function getCalendarFeedSummaryAction(
  scope: CalendarFeedScope = 'business',
  targetStaffId?: string
): Promise<{
  success: boolean;
  data?: CalendarFeedSummary;
  error?: string;
}> {
  try {
    const { businessId, businessName, companyId, staffId: ownStaffId, staffName: ownStaffName } =
      await resolveTenantContext();

    const effectiveStaffId = targetStaffId || (ownStaffId ? String(ownStaffId) : undefined);

    const summary = await getCalendarFeedSummary({
      scope,
      businessId: String(businessId),
      businessName,
      companyId: String(companyId),
      staffId: scope === 'staff' ? effectiveStaffId : undefined,
      staffName: scope === 'staff' ? ownStaffName || undefined : undefined,
    });

    return { success: true, data: summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve feed summary.';
    return { success: false, error: message };
  }
}
