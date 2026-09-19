'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import { User } from '@/models/User';
import type {
  BusinessHolidayDTO,
  HolidayActionResponse,
} from '@/types/business-hours';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const holidayInputSchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be formatted as YYYY-MM-DD'),
  description: z.string().max(100, 'Description cannot exceed 100 characters').optional().default(''),
});

const holidayRangeSchema = z.object({
  startDate: z.string().regex(dateRegex, 'Start date must be formatted as YYYY-MM-DD'),
  endDate: z.string().regex(dateRegex, 'End date must be formatted as YYYY-MM-DD'),
  description: z.string().max(100, 'Description cannot exceed 100 characters').optional().default(''),
}).refine((data) => data.startDate <= data.endDate, {
  message: 'Start date must be on or before end date',
  path: ['endDate'],
});

async function resolveTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User not found.');
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
  if (!activeBusinessId) {
    const defaultBusiness = await Business.findOne({ companyId }).lean();
    if (defaultBusiness) {
      activeBusinessId = defaultBusiness._id;
      await User.findByIdAndUpdate(user._id, { activeBusinessId: defaultBusiness._id });
    }
  }

  if (!activeBusinessId) {
    throw new Error('No active business found for this organization.');
  }

  return {
    userId: user._id,
    companyId,
    businessId: activeBusinessId,
  };
}

/**
 * Fetch all declared business holidays, sorted chronologically.
 */
export async function getBusinessHolidaysAction(): Promise<HolidayActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    const business = await Business.findById(businessId).select('holidays').lean();
    if (!business) {
      return { success: false, error: 'Business organization not found.' };
    }

    const holidays: BusinessHolidayDTO[] = (business.holidays || [])
      .map((h) => ({
        date: String(h.date),
        description: String(h.description || ''),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: holidays };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve holidays.';
    return { success: false, error: message };
  }
}

/**
 * Add single business holiday / closed date.
 */
export async function addBusinessHolidayAction(input: {
  date: string;
  description?: string;
}): Promise<HolidayActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    const validated = holidayInputSchema.parse(input);

    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business organization not found.' };
    }

    const existingIndex = (business.holidays || []).findIndex(
      (h) => h.date === validated.date
    );

    if (existingIndex !== -1) {
      return {
        success: false,
        error: `A holiday is already registered for ${validated.date}.`,
      };
    }

    business.holidays.push({
      date: validated.date,
      description: validated.description || '',
    });

    await business.save();

    revalidatePath('/dashboard/business/holidays');
    revalidatePath('/dashboard/settings/hours');
    revalidatePath('/dashboard');

    const updatedHolidays: BusinessHolidayDTO[] = (business.holidays || [])
      .map((h) => ({
        date: String(h.date),
        description: String(h.description || ''),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: updatedHolidays };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((i) => i.message).join(', ') };
    }
    const message = error instanceof Error ? error.message : 'Failed to add business holiday.';
    return { success: false, error: message };
  }
}

/**
 * Add a range of dates as holidays in one step.
 */
export async function addBusinessHolidayRangeAction(input: {
  startDate: string;
  endDate: string;
  description?: string;
}): Promise<HolidayActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();
    const validated = holidayRangeSchema.parse(input);

    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business organization not found.' };
    }

    const currentHolidays = business.holidays || [];
    const existingDates = new Set(currentHolidays.map((h) => h.date));

    // Generate dates in the range
    const start = new Date(validated.startDate + 'T00:00:00Z');
    const end = new Date(validated.endDate + 'T00:00:00Z');
    const newDates: string[] = [];

    const cursor = new Date(start);
    while (cursor <= end) {
      const dateStr = cursor.toISOString().split('T')[0];
      if (!existingDates.has(dateStr)) {
        newDates.push(dateStr);
        existingDates.add(dateStr);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (newDates.length === 0) {
      return {
        success: false,
        error: 'All dates in the selected range are already registered as holidays.',
      };
    }

    for (const d of newDates) {
      business.holidays.push({
        date: d,
        description: validated.description || '',
      });
    }

    await business.save();

    revalidatePath('/dashboard/business/holidays');
    revalidatePath('/dashboard/settings/hours');
    revalidatePath('/dashboard');

    const updatedHolidays: BusinessHolidayDTO[] = (business.holidays || [])
      .map((h) => ({
        date: String(h.date),
        description: String(h.description || ''),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: updatedHolidays };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((i) => i.message).join(', ') };
    }
    const message = error instanceof Error ? error.message : 'Failed to add holiday range.';
    return { success: false, error: message };
  }
}

/**
 * Remove an existing business holiday by date string.
 */
export async function deleteBusinessHolidayAction(date: string): Promise<HolidayActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business organization not found.' };
    }

    business.holidays = (business.holidays || []).filter((h) => h.date !== date);
    await business.save();

    revalidatePath('/dashboard/business/holidays');
    revalidatePath('/dashboard/settings/hours');
    revalidatePath('/dashboard');

    const updatedHolidays: BusinessHolidayDTO[] = (business.holidays || [])
      .map((h) => ({
        date: String(h.date),
        description: String(h.description || ''),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: updatedHolidays };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete business holiday.';
    return { success: false, error: message };
  }
}

/**
 * Remove multiple business holidays by an array of date strings.
 */
export async function deleteBusinessHolidayRangeAction(dates: string[]): Promise<HolidayActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business organization not found.' };
    }

    const deleteSet = new Set(dates);
    business.holidays = (business.holidays || []).filter((h) => !deleteSet.has(h.date));
    await business.save();

    revalidatePath('/dashboard/business/holidays');
    revalidatePath('/dashboard/settings/hours');
    revalidatePath('/dashboard');

    const updatedHolidays: BusinessHolidayDTO[] = (business.holidays || [])
      .map((h) => ({
        date: String(h.date),
        description: String(h.description || ''),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: updatedHolidays };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete holidays.';
    return { success: false, error: message };
  }
}

// Aliases matching requirements
export async function getBusinessHolidays() {
  return getBusinessHolidaysAction();
}
export async function addBusinessHoliday(input: {
  date: string;
  description?: string;
}) {
  return addBusinessHolidayAction(input);
}
export async function deleteBusinessHoliday(date: string) {
  return deleteBusinessHolidayAction(date);
}
export async function deleteBusinessHolidayRange(dates: string[]) {
  return deleteBusinessHolidayRangeAction(dates);
}
