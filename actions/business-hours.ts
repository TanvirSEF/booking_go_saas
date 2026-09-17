'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Business, type IBusinessHour } from '@/models/Business';
import { User } from '@/models/User';
import type {
  BusinessHourDTO,
  BusinessHoursResponse,
  DayName,
} from '@/types/business-hours';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const breakHourSchema = z.object({
  start: z.string().regex(timeRegex, 'Start time must be in HH:mm format'),
  end: z.string().regex(timeRegex, 'End time must be in HH:mm format'),
}).refine((b) => b.start < b.end, {
  message: 'Break start time must be earlier than break end time',
});

const businessHourSchema = z.object({
  dayName: z.enum([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ] as [DayName, ...DayName[]]),
  isOpen: z.boolean(),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:mm format'),
  endTime: z.string().regex(timeRegex, 'End time must be in HH:mm format'),
  breakHours: z.array(breakHourSchema).default([]),
}).refine(
  (data) => !data.isOpen || data.startTime < data.endTime,
  { message: 'Opening time must be earlier than closing time' }
);

const updateBusinessHoursSchema = z.array(businessHourSchema);

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
 * Retrieve weekly business hours and holidays for the active business.
 */
export async function getBusinessHoursAction(): Promise<BusinessHoursResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    const business = await Business.findById(businessId).select('businessHours holidays').lean();
    if (!business) {
      return { success: false, error: 'Business organization not found.' };
    }

    const defaultHours: BusinessHourDTO[] = [
      { dayName: 'Monday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Tuesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Wednesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Thursday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Friday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Saturday', isOpen: false, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Sunday', isOpen: false, startTime: '09:00', endTime: '18:00', breakHours: [] },
    ];

    const currentHours = business.businessHours && business.businessHours.length > 0
      ? (business.businessHours as unknown as BusinessHourDTO[])
      : defaultHours;

    return {
      success: true,
      data: {
        businessHours: currentHours.map((h) => ({
          dayName: h.dayName,
          isOpen: h.isOpen,
          startTime: h.startTime,
          endTime: h.endTime,
          breakHours: (h.breakHours || []).map((b) => ({ start: b.start, end: b.end })),
        })),
        holidays: (business.holidays || []).map((hol) => ({
          date: hol.date,
          description: hol.description || '',
        })),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve business hours.';
    return { success: false, error: message };
  }
}

/**
 * Update weekly operating hours & daily break slots.
 */
export async function updateBusinessHoursAction(
  hours: BusinessHourDTO[]
): Promise<BusinessHoursResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    const validated = updateBusinessHoursSchema.parse(hours);

    // Verify break windows fall within operating hours
    for (const day of validated) {
      if (day.isOpen && day.breakHours.length > 0) {
        for (const brk of day.breakHours) {
          if (brk.start < day.startTime || brk.end > day.endTime) {
            return {
              success: false,
              error: `Break time (${brk.start} - ${brk.end}) on ${day.dayName} must fall within opening hours (${day.startTime} - ${day.endTime}).`,
            };
          }
        }
      }
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business organization not found.' };
    }

    business.businessHours = validated as unknown as IBusinessHour[];
    await business.save();

    revalidatePath('/dashboard/business/hours');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        businessHours: business.businessHours as unknown as BusinessHourDTO[],
        holidays: (business.holidays || []).map((h) => ({
          date: h.date,
          description: h.description || '',
        })),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((i) => i.message).join(', ') };
    }
    const message = error instanceof Error ? error.message : 'Failed to update business hours.';
    return { success: false, error: message };
  }
}
