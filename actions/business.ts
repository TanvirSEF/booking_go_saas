'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Business, type IBusinessHour } from '@/models/Business';
import { User } from '@/models/User';
import { Location } from '@/models/Location';
import { Service } from '@/models/Service';
import { Staff } from '@/models/Staff';
import { CustomStatus } from '@/models/CustomStatus';
import { CustomField } from '@/models/CustomField';
import { Appointment } from '@/models/Appointment';
import { checkPlanLimit } from '@/lib/plan-limits';
import {
  createBusinessSchema,
  updateBusinessSchema,
  type CreateBusinessInput,
  type UpdateBusinessInput,
  type BusinessDTO,
  type BusinessActionResult,
} from '@/types/business';

// ---------------------------------------------------------------------------
// Re-exports for backwards compatibility & modular imports
// ---------------------------------------------------------------------------
import {
  getBusinessHoursAction,
  updateBusinessHoursAction,
} from './business-hours';
import type { BusinessHourDTO } from '@/types/business-hours';

export { getBusinessHoursAction, updateBusinessHoursAction };

export async function updateBusinessHours(hours: BusinessHourDTO[]) {
  return updateBusinessHoursAction(hours);
}

export {
  getBusinessHolidaysAction,
  addBusinessHolidayAction,
  addBusinessHolidayRangeAction,
  deleteBusinessHolidayAction,
  deleteBusinessHolidayRangeAction,
  getBusinessHolidays,
  addBusinessHoliday,
  deleteBusinessHoliday,
  deleteBusinessHolidayRange,
} from './business-holidays';

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeRevalidate(paths: string[]) {
  try {
    for (const p of paths) {
      revalidatePath(p);
    }
  } catch {
    // Ignored outside Next.js request pipeline (e.g. scripts/testing)
  }
}

/**
 * Creates a new business branch for the authenticated company.
 * Faithful port of Laravel BusinessController@store and PlanCheck('Business'):
 * 1. Checks plan capacity (lib/plan-limits checkPlanLimit).
 * 2. Generates collision-free URL slug.
 * 3. Provisions standard operating hours, default location ("Main Location"), and 5 custom statuses.
 * 4. Auto-switches user activeBusinessId to the newly created branch.
 * 5. Updates user.totalBusiness counter.
 */
export async function createBusinessAction(
  input: CreateBusinessInput
): Promise<BusinessActionResult<{ id: string; slug: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized: Please log in to continue.' };
    }

    const validation = createBusinessSchema.safeParse(input);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Invalid business data.';
      return { success: false, error: firstError };
    }

    const {
      name,
      currency,
      currencySymbol,
      appointmentPrefix,
      maximumSlot,
      appointmentReminderHours,
      formType,
      layout,
      themeColor,
      domain,
    } = validation.data;

    await connectToDatabase();

    const companyUser = await User.findById(session.user.id);
    if (!companyUser) {
      return { success: false, error: 'Company user account not found.' };
    }

    const companyId =
      companyUser.role === 'company'
        ? companyUser._id
        : companyUser.companyId;

    if (!companyId) {
      return { success: false, error: 'Permission denied: Only company accounts can create business branches.' };
    }

    // 1. Enforce Plan Limits (Laravel PlanCheck parity)
    const limitCheck = await checkPlanLimit(companyId, 'businesses');
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: `Plan Limit Reached: Your current subscription allows up to ${limitCheck.max} business branches (Current: ${limitCheck.current}). Please upgrade your plan to add more branches.`,
      };
    }

    // 2. Generate Collision-Free Slug
    const baseSlug = validation.data.slug?.trim() ? slugify(validation.data.slug) : slugify(name);
    let slug = baseSlug || 'business';
    let counter = 1;
    while (await Business.findOne({ slug }).lean()) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 3. Default Weekly Operating Schedule
    const defaultWeeklyHours: IBusinessHour[] = [
      { dayName: 'Monday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [{ start: '13:00', end: '14:00' }] },
      { dayName: 'Tuesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [{ start: '13:00', end: '14:00' }] },
      { dayName: 'Wednesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [{ start: '13:00', end: '14:00' }] },
      { dayName: 'Thursday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [{ start: '13:00', end: '14:00' }] },
      { dayName: 'Friday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [{ start: '13:00', end: '14:00' }] },
      { dayName: 'Saturday', isOpen: true, startTime: '10:00', endTime: '16:00', breakHours: [] },
      { dayName: 'Sunday', isOpen: false, startTime: '09:00', endTime: '18:00', breakHours: [] },
    ];

    // 4. Create Business Document
    const business = await Business.create({
      companyId,
      name,
      slug,
      formType,
      layout,
      themeColor,
      currency,
      currencySymbol,
      appointmentPrefix,
      maximumSlot,
      appointmentReminderHours,
      domain: domain || undefined,
      businessHours: defaultWeeklyHours,
      holidays: [],
      settings: {
        company_name: name,
        company_email: companyUser.email,
      },
    });

    // 5. Provision Default Primary Location
    await Location.create({
      companyId,
      businessId: business._id,
      name: 'Main Location',
      address: 'Headquarters',
      description: 'Primary business facility for this branch.',
      isActive: true,
    });

    // 6. Provision 5 Standard Custom Statuses
    const defaultStatuses = [
      { title: 'Pending', statusColor: '#3b82f6', icon: 'ti-loader', order: 1 },
      { title: 'Confirmed', statusColor: '#10b981', icon: 'ti-check', order: 2 },
      { title: 'In Progress', statusColor: '#f59e0b', icon: 'ti-calendar-event', order: 3 },
      { title: 'Completed', statusColor: '#8b5cf6', icon: 'ti-thumb-up', order: 4 },
      { title: 'Cancelled', statusColor: '#ef4444', icon: 'ti-ban', order: 5 },
    ];

    await CustomStatus.insertMany(
      defaultStatuses.map((st) => ({
        companyId,
        businessId: business._id,
        ...st,
      }))
    );

    // 7. Auto-Switch Active Business (Laravel parity)
    companyUser.activeBusinessId = business._id;
    companyUser.totalBusiness = await Business.countDocuments({ companyId });
    await companyUser.save();

    safeRevalidate(['/dashboard', '/dashboard/settings', '/dashboard/business']);

    return {
      success: true,
      message: 'Business branch created successfully and set as active.',
      data: {
        id: String(business._id),
        slug: business.slug,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create business branch.';
    console.error('createBusinessAction error:', error);
    return { success: false, error: msg };
  }
}

/**
 * Updates an existing business branch.
 * Allows updating general settings, currency, appointment prefix, slot capacity,
 * and slug (with strict uniqueness checks).
 */
export async function updateBusinessAction(
  input: UpdateBusinessInput
): Promise<BusinessActionResult<BusinessDTO>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized: Please log in.' };
    }

    const validation = updateBusinessSchema.safeParse(input);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Invalid business update data.';
      return { success: false, error: firstError };
    }

    const { businessId, ...updateData } = validation.data;

    await connectToDatabase();

    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business branch not found.' };
    }

    // Verify ownership
    const isOwner =
      session.user.role === 'super admin' ||
      String(business.companyId) === String(session.user.id) ||
      String(business.companyId) === String(session.user.companyId);

    if (!isOwner) {
      return { success: false, error: 'Permission denied: You do not own this business branch.' };
    }

    // Slug update validation
    if (updateData.slug && updateData.slug.trim()) {
      const cleanSlug = slugify(updateData.slug);
      const conflict = await Business.findOne({
        slug: cleanSlug,
        _id: { $ne: business._id },
      }).lean();

      if (conflict) {
        return { success: false, error: `The URL slug "${cleanSlug}" is already taken by another business.` };
      }
      business.slug = cleanSlug;
    }

    if (updateData.name) business.name = updateData.name.trim();
    if (updateData.currency) business.currency = updateData.currency;
    if (updateData.currencySymbol) business.currencySymbol = updateData.currencySymbol;
    if (updateData.appointmentPrefix) business.appointmentPrefix = updateData.appointmentPrefix;
    if (updateData.maximumSlot !== undefined) business.maximumSlot = updateData.maximumSlot;
    if (updateData.appointmentReminderHours !== undefined) {
      business.appointmentReminderHours = updateData.appointmentReminderHours;
    }
    if (updateData.formType) business.formType = updateData.formType;
    if (updateData.layout) business.layout = updateData.layout;
    if (updateData.themeColor) business.themeColor = updateData.themeColor;
    if (updateData.logoDark !== undefined) business.logoDark = updateData.logoDark;
    if (updateData.logoLight !== undefined) business.logoLight = updateData.logoLight;
    if (updateData.domain !== undefined) business.domain = updateData.domain;

    if (updateData.settings) {
      business.settings = { ...business.settings, ...updateData.settings };
    }

    await business.save();

    safeRevalidate(['/dashboard', '/dashboard/settings', '/dashboard/business']);

    return {
      success: true,
      message: 'Business branch updated successfully.',
      data: {
        id: String(business._id),
        companyId: String(business.companyId),
        name: business.name,
        slug: business.slug,
        formType: business.formType,
        layout: business.layout,
        themeColor: business.themeColor,
        logoDark: business.logoDark,
        logoLight: business.logoLight,
        currency: business.currency,
        currencySymbol: business.currencySymbol,
        appointmentPrefix: business.appointmentPrefix,
        maximumSlot: business.maximumSlot,
        appointmentReminderHours: business.appointmentReminderHours,
        domain: business.domain,
        businessHours: business.businessHours,
        holidays: business.holidays,
        settings: business.settings,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update business branch.';
    console.error('updateBusinessAction error:', error);
    return { success: false, error: msg };
  }
}

/**
 * Deletes a business branch with full Laravel DestroyBusiness safeguards:
 * 1. Blocks deletion if company has only 1 business (last business protection).
 * 2. Auto-switches user.activeBusinessId if deleted branch was the active branch.
 * 3. Cascade deletes child records (Location, Service, Staff, CustomStatus, CustomField).
 * 4. Decrements user.totalBusiness counter.
 */
export async function deleteBusinessAction(
  businessId: string
): Promise<BusinessActionResult<{ activeBusinessId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized: Please log in.' };
    }

    if (!Types.ObjectId.isValid(businessId)) {
      return { success: false, error: 'Invalid business ID format.' };
    }

    await connectToDatabase();

    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business branch not found.' };
    }

    const companyId = business.companyId;

    // Verify ownership
    const isOwner =
      session.user.role === 'super admin' ||
      String(companyId) === String(session.user.id) ||
      String(companyId) === String(session.user.companyId);

    if (!isOwner) {
      return { success: false, error: 'Permission denied: You do not own this business branch.' };
    }

    // 1. Safeguard: Prevent deleting the only remaining business
    const totalCount = await Business.countDocuments({ companyId });
    if (totalCount <= 1) {
      return {
        success: false,
        error: 'Cannot delete business: Your organization must have at least one active business branch.',
      };
    }

    // 2. Safeguard: Auto-switch activeBusinessId if this was the active one
    let newActiveBusinessId: Types.ObjectId | null = null;
    const companyUser = await User.findById(companyId);

    const isCurrentActive =
      companyUser?.activeBusinessId &&
      companyUser.activeBusinessId.toString() === businessId;

    if (isCurrentActive) {
      const fallbackBusiness = await Business.findOne({
        companyId,
        _id: { $ne: business._id },
      })
        .select('_id')
        .lean();

      if (fallbackBusiness) {
        newActiveBusinessId = fallbackBusiness._id;
        if (companyUser) {
          companyUser.activeBusinessId = fallbackBusiness._id;
        }
      }
    } else {
      newActiveBusinessId = companyUser?.activeBusinessId || null;
    }

    // 3. Cascade delete child branch records (Laravel DestroyBusiness parity)
    await Promise.all([
      Location.deleteMany({ businessId: business._id }),
      Service.deleteMany({ businessId: business._id }),
      Staff.deleteMany({ businessId: business._id }),
      CustomStatus.deleteMany({ businessId: business._id }),
      CustomField.deleteMany({ businessId: business._id }),
    ]);

    // 4. Delete Business document
    await Business.findByIdAndDelete(business._id);

    // 5. Update user stats
    if (companyUser) {
      companyUser.totalBusiness = await Business.countDocuments({ companyId });
      await companyUser.save();
    }

    safeRevalidate(['/dashboard', '/dashboard/settings', '/dashboard/business']);

    return {
      success: true,
      message: 'Business branch and associated child records deleted successfully.',
      data: {
        activeBusinessId: String(newActiveBusinessId || ''),
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete business branch.';
    console.error('deleteBusinessAction error:', error);
    return { success: false, error: msg };
  }
}

/**
 * Validates whether a given URL slug is available for a new or existing business.
 * Direct parity with Laravel BusinessController@businessCheck.
 */
export async function checkBusinessSlugAvailabilityAction(
  slug: string,
  currentBusinessId?: string
): Promise<BusinessActionResult<{ isAvailable: boolean; slug: string }>> {
  try {
    const cleanSlug = slugify(slug);
    if (!cleanSlug) {
      return { success: false, error: 'Slug cannot be empty.' };
    }

    await connectToDatabase();

    const query: Record<string, unknown> = { slug: cleanSlug };
    if (currentBusinessId && Types.ObjectId.isValid(currentBusinessId)) {
      query._id = { $ne: new Types.ObjectId(currentBusinessId) };
    }

    const existing = await Business.findOne(query).select('_id').lean();

    return {
      success: true,
      data: {
        isAvailable: !existing,
        slug: cleanSlug,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to check slug availability.';
    return { success: false, error: msg };
  }
}

/**
 * Retrieves comprehensive details and statistics for a specific business branch.
 */
export async function getBusinessDetailsAction(
  businessId?: string
): Promise<BusinessActionResult<BusinessDTO>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    await connectToDatabase();

    let targetId = businessId;

    // If no businessId passed, fallback to activeBusinessId
    if (!targetId) {
      const user = await User.findById(session.user.id).select('activeBusinessId companyId role').lean();
      if (user?.activeBusinessId) {
        targetId = String(user.activeBusinessId);
      } else {
        const first = await Business.findOne({ companyId: user?.companyId || user?._id }).select('_id').lean();
        if (first) targetId = String(first._id);
      }
    }

    if (!targetId || !Types.ObjectId.isValid(targetId)) {
      return { success: false, error: 'No valid business branch identified.' };
    }

    const business = await Business.findById(targetId).lean();
    if (!business) {
      return { success: false, error: 'Business branch not found.' };
    }

    const [locationsCount, servicesCount, staffCount, appointmentsCount] = await Promise.all([
      Location.countDocuments({ businessId: business._id }),
      Service.countDocuments({ businessId: business._id }),
      Staff.countDocuments({ businessId: business._id }),
      Appointment.countDocuments({ businessId: business._id }),
    ]);

    const dto: BusinessDTO = {
      id: String(business._id),
      companyId: String(business.companyId),
      name: business.name,
      slug: business.slug,
      formType: business.formType,
      layout: business.layout,
      themeColor: business.themeColor,
      logoDark: business.logoDark,
      logoLight: business.logoLight,
      currency: business.currency,
      currencySymbol: business.currencySymbol,
      appointmentPrefix: business.appointmentPrefix,
      maximumSlot: business.maximumSlot,
      appointmentReminderHours: business.appointmentReminderHours,
      domain: business.domain,
      businessHours: business.businessHours,
      holidays: business.holidays,
      settings: business.settings || {},
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
      stats: {
        locationsCount,
        servicesCount,
        staffCount,
        appointmentsCount,
      },
    };

    return { success: true, data: dto };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve business details.';
    console.error('getBusinessDetailsAction error:', error);
    return { success: false, error: msg };
  }
}

/**
 * Retrieves all business branches belonging to the authenticated company with high-level stats.
 */
export async function getCompanyBusinessesAction(): Promise<BusinessActionResult<BusinessDTO[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    await connectToDatabase();

    const companyUser = await User.findById(session.user.id).select('companyId role').lean();
    const companyId =
      companyUser?.role === 'company'
        ? companyUser._id
        : companyUser?.companyId;

    if (!companyId) {
      return { success: true, data: [] };
    }

    const businesses = await Business.find({ companyId }).sort({ createdAt: 1 }).lean();

    const results: BusinessDTO[] = await Promise.all(
      businesses.map(async (b) => {
        const [locationsCount, servicesCount, staffCount, appointmentsCount] = await Promise.all([
          Location.countDocuments({ businessId: b._id }),
          Service.countDocuments({ businessId: b._id }),
          Staff.countDocuments({ businessId: b._id }),
          Appointment.countDocuments({ businessId: b._id }),
        ]);

        return {
          id: String(b._id),
          companyId: String(b.companyId),
          name: b.name,
          slug: b.slug,
          formType: b.formType,
          layout: b.layout,
          themeColor: b.themeColor,
          logoDark: b.logoDark,
          logoLight: b.logoLight,
          currency: b.currency,
          currencySymbol: b.currencySymbol,
          appointmentPrefix: b.appointmentPrefix,
          maximumSlot: b.maximumSlot,
          appointmentReminderHours: b.appointmentReminderHours,
          domain: b.domain,
          businessHours: b.businessHours,
          holidays: b.holidays,
          settings: b.settings || {},
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          stats: {
            locationsCount,
            servicesCount,
            staffCount,
            appointmentsCount,
          },
        };
      })
    );

    return { success: true, data: results };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve company businesses.';
    console.error('getCompanyBusinessesAction error:', error);
    return { success: false, error: msg };
  }
}

/**
 * Tenant action: Switch the active business branch context for the logged-in user.
 */
export async function switchActiveBusinessAction(
  businessId: string
): Promise<BusinessActionResult<{ activeBusinessId: string; name: string; slug: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    if (!Types.ObjectId.isValid(businessId)) {
      return { success: false, error: 'Invalid business ID format.' };
    }

    await connectToDatabase();
    const companyId = session.user.companyId || session.user.id;

    const business = await Business.findOne({
      _id: new Types.ObjectId(businessId),
      companyId: new Types.ObjectId(companyId),
    }).lean();

    if (!business) {
      return { success: false, error: 'Business branch not found or access denied.' };
    }

    await User.updateOne(
      { _id: new Types.ObjectId(session.user.id) },
      { $set: { activeBusinessId: business._id } }
    );

    safeRevalidate([
      '/dashboard',
      '/dashboard/business',
      '/dashboard/appointments',
      '/dashboard/settings',
      '/dashboard/staff',
      '/dashboard/services/catalog',
      '/dashboard/locations',
    ]);

    return {
      success: true,
      message: `Active branch switched to ${business.name}.`,
      data: {
        activeBusinessId: String(business._id),
        name: business.name,
        slug: business.slug,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to switch active business.';
    return { success: false, error: message };
  }
}
