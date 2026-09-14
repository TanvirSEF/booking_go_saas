'use server';

import { Types } from 'mongoose';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business, type IBusiness } from '@/models/Business';
import { Staff } from '@/models/Staff';

export interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  currency: string;
  currencySymbol: string;
  themeColor: string;
  layout: string;
}

export interface TenantActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Retrieves all businesses accessible to the current authenticated user.
 * For company accounts: all businesses owned by this company.
 * For staff accounts: the business to which the staff is assigned.
 */
export async function getUserBusinesses(): Promise<TenantActionResult<BusinessSummary[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    await connectToDatabase();

    const companyId =
      session.user.role === 'company'
        ? new Types.ObjectId(session.user.id)
        : session.user.companyId
          ? new Types.ObjectId(session.user.companyId)
          : null;

    if (!companyId) {
      // If staff without companyId on session, attempt to check staff record
      const staffRecord = await Staff.findOne({ userId: new Types.ObjectId(session.user.id) }).lean();
      if (!staffRecord) {
        return { success: true, data: [] };
      }

      const business = await Business.findById(staffRecord.businessId).lean();
      if (!business) {
        return { success: true, data: [] };
      }

      return {
        success: true,
        data: [
          {
            id: String(business._id),
            name: business.name,
            slug: business.slug,
            currency: business.currency,
            currencySymbol: business.currencySymbol,
            themeColor: business.themeColor,
            layout: business.layout,
          },
        ],
      };
    }

    const businesses = await Business.find({ companyId })
      .sort({ createdAt: 1 })
      .lean();

    const result: BusinessSummary[] = businesses.map((b) => ({
      id: String(b._id),
      name: b.name,
      slug: b.slug,
      currency: b.currency,
      currencySymbol: b.currencySymbol,
      themeColor: b.themeColor,
      layout: b.layout,
    }));

    return { success: true, data: result };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to retrieve businesses.';
    return { success: false, error: errMessage };
  }
}

/**
 * Retrieves the currently active business for the logged-in user.
 */
export async function getActiveBusiness(): Promise<TenantActionResult<IBusiness | null>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).lean();
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    let activeBusinessId = user.activeBusinessId;

    if (!activeBusinessId) {
      const companyId =
        user.role === 'company'
          ? user._id
          : user.companyId ?? null;

      if (companyId) {
        const defaultBusiness = await Business.findOne({ companyId }).lean();
        if (defaultBusiness) {
          activeBusinessId = defaultBusiness._id;
          await User.findByIdAndUpdate(user._id, { activeBusinessId: defaultBusiness._id });
        }
      }
    }

    if (!activeBusinessId) {
      return { success: true, data: null };
    }

    const business = await Business.findById(activeBusinessId).lean();
    if (!business) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(business)),
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to retrieve active business.';
    return { success: false, error: errMessage };
  }
}

/**
 * Switches the user's active business context.
 * Ensures the target business belongs to the user's organization before switching.
 */
export async function switchActiveBusiness(
  businessId: string
): Promise<TenantActionResult<BusinessSummary>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    if (!Types.ObjectId.isValid(businessId)) {
      return { success: false, error: 'Invalid business ID format.' };
    }

    await connectToDatabase();

    const targetBusiness = await Business.findById(businessId).lean();
    if (!targetBusiness) {
      return { success: false, error: 'Business not found.' };
    }

    const companyId =
      session.user.role === 'company'
        ? session.user.id
        : session.user.companyId;

    // Security check: verify ownership
    if (String(targetBusiness.companyId) !== String(companyId)) {
      return { success: false, error: 'Permission denied. You do not own this business.' };
    }

    await User.findByIdAndUpdate(session.user.id, {
      activeBusinessId: targetBusiness._id,
    });

    return {
      success: true,
      data: {
        id: String(targetBusiness._id),
        name: targetBusiness.name,
        slug: targetBusiness.slug,
        currency: targetBusiness.currency,
        currencySymbol: targetBusiness.currencySymbol,
        themeColor: targetBusiness.themeColor,
        layout: targetBusiness.layout,
      },
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to switch active business.';
    return { success: false, error: errMessage };
  }
}
