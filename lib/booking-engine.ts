import { connectToDatabase } from '@/lib/db';
import { Business, type DayName } from '@/models/Business';
import { Service } from '@/models/Service';
import { Staff } from '@/models/Staff';
import { Appointment } from '@/models/Appointment';

export interface SlotQuery {
  businessId: string;
  serviceId: string;
  locationId?: string;
  staffId?: string;
  date: string;
}

export interface CalculatedSlot {
  start: string;
  end: string;
  formattedTime: string;
  serviceId: string;
  durationMinutes: number;
  bufferMinutes?: number;
  availableStaffIds: string[];
}

export interface ValidateSlotParams {
  businessId: string;
  serviceId: string;
  staffId: string;
  date: string;
  time: string;
  durationMinutes: number;
  bufferMinutes?: number;
}

export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(totalMinutes, 1439));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function isIntervalOverlapping(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Determines whether a candidate slot (and its trailing cleaning/travel buffer)
 * collides with an existing booking (and its trailing cleaning/travel buffer).
 */
export function isSlotCollidingWithBooking(
  slotStart: number,
  slotEnd: number,
  slotBuffer: number,
  bookingStart: number,
  bookingEnd: number,
  bookingBuffer: number
): { collides: boolean; isDirectCollision: boolean; isBufferCollision: boolean } {
  // Direct appointment service overlap
  const directCollision = isIntervalOverlapping(slotStart, slotEnd, bookingStart, bookingEnd);
  if (directCollision) {
    return { collides: true, isDirectCollision: true, isBufferCollision: false };
  }

  // Candidate slot + its trailing buffer overlaps with booking's core service time
  const candidateBufferCollides = isIntervalOverlapping(
    slotStart,
    slotEnd + slotBuffer,
    bookingStart,
    bookingEnd
  );

  // Existing booking + its trailing buffer overlaps with candidate slot's core service time
  const bookingBufferCollides = isIntervalOverlapping(
    slotStart,
    slotEnd,
    bookingStart,
    bookingEnd + bookingBuffer
  );

  const collides = candidateBufferCollides || bookingBufferCollides;
  return {
    collides,
    isDirectCollision: false,
    isBufferCollision: collides,
  };
}

export function normalizeDateString(dateStr: string): string {
  const trimmed = dateStr.trim();
  const dmyMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

export function getDayNameFromDate(dateStr: string): DayName {
  const normalized = normalizeDateString(dateStr);
  const [year, month, day] = normalized.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const days: DayName[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[dateObj.getUTCDay()];
}

export function parseBookedTime(timeStr: string, defaultDurationMinutes = 30): {
  startMin: number;
  endMin: number;
} | null {
  const trimmed = timeStr.trim();
  if (trimmed.includes('-')) {
    const [startPart, endPart] = trimmed.split('-');
    const startMin = timeToMinutes(startPart);
    const endMin = timeToMinutes(endPart);
    if (endMin > startMin) {
      return { startMin, endMin };
    }
  }

  const singleStart = timeToMinutes(trimmed);
  return {
    startMin: singleStart,
    endMin: singleStart + defaultDurationMinutes,
  };
}

/**
 * Checks if target booking date is in the past or exceeds maximum advance booking horizon
 */
export function checkBookingHorizon(
  targetDateStr: string,
  maxAdvanceDays = 90
): { valid: boolean; reason?: string } {
  const normalized = normalizeDateString(targetDateStr);
  const parts = normalized.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return { valid: false, reason: 'Invalid date format' };
  }
  const [year, month, day] = parts;
  const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

  const diffMs = targetDate.getTime() - todayStart.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return { valid: false, reason: 'Cannot book appointment on a past date' };
  }

  if (diffDays > maxAdvanceDays) {
    return {
      valid: false,
      reason: `Selected date exceeds maximum advance booking limit of ${maxAdvanceDays} days`,
    };
  }

  return { valid: true };
}

/**
 * Checks if candidate slot violates minimum notice requirements (e.g. 2 hours notice)
 */
export function checkMinimumNotice(
  dateStr: string,
  timeMinutes: number,
  minimumNoticeHours = 1
): { valid: boolean; reason?: string } {
  if (minimumNoticeHours <= 0) return { valid: true };

  const normalized = normalizeDateString(dateStr);
  const [year, month, day] = normalized.split('-').map(Number);
  const hours = Math.floor(timeMinutes / 60);
  const minutes = timeMinutes % 60;
  const slotDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  const nowMs = Date.now();
  const noticeMs = minimumNoticeHours * 60 * 60 * 1000;
  const earliestAllowedMs = nowMs + noticeMs;

  if (slotDate.getTime() < earliestAllowedMs) {
    return {
      valid: false,
      reason: `Appointment violates minimum notice requirement of ${minimumNoticeHours} hour(s)`,
    };
  }

  return { valid: true };
}

/**
 * Resolves the effective cleaning/travel buffer window in minutes
 * Priority: Service bufferMinutes > Business timeInterval > default 0
 */
export function resolveEffectiveBuffer(
  serviceBuffer?: number | null,
  businessTimeInterval?: number | null
): number {
  if (serviceBuffer !== undefined && serviceBuffer !== null && serviceBuffer >= 0) {
    return serviceBuffer;
  }
  return Math.max(0, businessTimeInterval ?? 0);
}

export async function calculateAvailableSlots(query: SlotQuery): Promise<CalculatedSlot[]> {
  await connectToDatabase();

  const { businessId, serviceId, locationId, staffId, date } = query;
  const normalizedDate = normalizeDateString(date);

  const [business, service] = await Promise.all([
    Business.findById(businessId).lean(),
    Service.findById(serviceId).lean(),
  ]);

  if (!business || !service) {
    return [];
  }

  const maxAdvanceDays = Math.max(1, business.maxAdvanceBookingDays ?? 90);
  const horizonCheck = checkBookingHorizon(normalizedDate, maxAdvanceDays);
  if (!horizonCheck.valid) {
    return [];
  }

  const staffFilter: Record<string, unknown> = {
    businessId,
    serviceIds: serviceId,
    isActive: true,
  };

  if (locationId) {
    staffFilter.locationIds = locationId;
  }

  if (staffId) {
    staffFilter._id = staffId;
  }

  const eligibleStaff = await Staff.find(staffFilter).select('_id name').lean();
  if (eligibleStaff.length === 0) {
    return [];
  }

  const isHoliday = (business.holidays || []).some(
    (h) => normalizeDateString(h.date) === normalizedDate
  );
  if (isHoliday) {
    return [];
  }

  const dayName = getDayNameFromDate(normalizedDate);
  const daySchedule = (business.businessHours || []).find((b) => b.dayName === dayName);

  if (!daySchedule || !daySchedule.isOpen) {
    return [];
  }

  const startMinutes = timeToMinutes(daySchedule.startTime || '09:00');
  const endMinutes = timeToMinutes(daySchedule.endTime || '18:00');
  const duration = Math.max(1, service.durationMinutes || 30);
  const candidateBuffer = resolveEffectiveBuffer(service.bufferMinutes, business.timeInterval);
  const minimumNoticeHours = Math.max(0, business.minimumNoticeHours ?? 1);
  const maxCapacity = Math.max(1, business.maximumSlot || 1);

  const breakIntervals = (daySchedule.breakHours || []).map((b) => ({
    startMin: timeToMinutes(b.start),
    endMin: timeToMinutes(b.end),
  }));

  const activeAppointments = await Appointment.find({
    businessId,
    date: { $in: [normalizedDate, date] },
    appointmentStatus: { $ne: 'Cancelled' },
  })
    .select('time staffId durationMinutes bufferMinutes')
    .lean();

  const bookedAppointmentsParsed = activeAppointments.map((app) => {
    const parsed = parseBookedTime(app.time, app.durationMinutes || duration);
    const appBuffer = resolveEffectiveBuffer(app.bufferMinutes, business.timeInterval);
    return {
      staffId: String(app.staffId),
      startMin: parsed?.startMin ?? 0,
      endMin: parsed?.endMin ?? 0,
      bufferMinutes: appBuffer,
    };
  });

  const slots: CalculatedSlot[] = [];
  const slotStep = candidateBuffer > 0 ? duration + candidateBuffer : duration;

  for (let slotStart = startMinutes; slotStart + duration <= endMinutes; slotStart += slotStep) {
    const slotEnd = slotStart + duration;

    // Notice period check
    const noticeCheck = checkMinimumNotice(normalizedDate, slotStart, minimumNoticeHours);
    if (!noticeCheck.valid) {
      continue;
    }

    // Break hours check (including buffer time ensuring staff do not clean during lunch)
    const fallsInBreak = breakIntervals.some((b) =>
      isIntervalOverlapping(slotStart, slotEnd + candidateBuffer, b.startMin, b.endMin)
    );
    if (fallsInBreak) {
      continue;
    }

    // Filter staff members whose appointments or buffers do not collide
    const availableStaff = eligibleStaff.filter((staffMember) => {
      const staffMemberId = String(staffMember._id);
      const collidingBookingsCount = bookedAppointmentsParsed.filter((b) => {
        if (b.staffId !== staffMemberId) return false;
        const check = isSlotCollidingWithBooking(
          slotStart,
          slotEnd,
          candidateBuffer,
          b.startMin,
          b.endMin,
          b.bufferMinutes
        );
        return check.collides;
      }).length;

      return collidingBookingsCount < maxCapacity;
    });

    if (availableStaff.length > 0) {
      const startTimeStr = minutesToTime(slotStart);
      const endTimeStr = minutesToTime(slotEnd);

      slots.push({
        start: startTimeStr,
        end: endTimeStr,
        formattedTime: `${startTimeStr} - ${endTimeStr}`,
        serviceId,
        durationMinutes: duration,
        bufferMinutes: candidateBuffer,
        availableStaffIds: availableStaff.map((s) => String(s._id)),
      });
    }
  }

  return slots;
}

export async function validateSlotAvailability(
  params: ValidateSlotParams
): Promise<{ available: boolean; reason?: string }> {
  await connectToDatabase();

  const { businessId, serviceId, staffId, date, time, durationMinutes, bufferMinutes } = params;
  const normalizedDate = normalizeDateString(date);

  const [business, staffMember, service] = await Promise.all([
    Business.findById(businessId).lean(),
    Staff.findOne({ _id: staffId, businessId, isActive: true }).lean(),
    Service.findOne({ _id: serviceId, businessId, isActive: true }).lean(),
  ]);

  if (!business) {
    return { available: false, reason: 'Business not found' };
  }

  if (!service) {
    return { available: false, reason: 'Service not found or inactive' };
  }

  if (!staffMember) {
    return { available: false, reason: 'Staff member is not active or assigned to this business' };
  }

  const maxAdvanceDays = Math.max(1, business.maxAdvanceBookingDays ?? 90);
  const horizonCheck = checkBookingHorizon(normalizedDate, maxAdvanceDays);
  if (!horizonCheck.valid) {
    return { available: false, reason: horizonCheck.reason };
  }

  const isHoliday = (business.holidays || []).some(
    (h) => normalizeDateString(h.date) === normalizedDate
  );
  if (isHoliday) {
    return { available: false, reason: 'Selected date is a business holiday' };
  }

  const dayName = getDayNameFromDate(normalizedDate);
  const daySchedule = (business.businessHours || []).find((b) => b.dayName === dayName);

  if (!daySchedule || !daySchedule.isOpen) {
    return { available: false, reason: 'Business is closed on this day' };
  }

  const parsed = parseBookedTime(time, durationMinutes);
  if (!parsed) {
    return { available: false, reason: 'Invalid slot time format' };
  }

  const { startMin: slotStart, endMin: slotEnd } = parsed;
  const businessStart = timeToMinutes(daySchedule.startTime || '09:00');
  const businessEnd = timeToMinutes(daySchedule.endTime || '18:00');

  if (slotStart < businessStart || slotEnd > businessEnd) {
    return { available: false, reason: 'Slot falls outside of business working hours' };
  }

  const minimumNoticeHours = Math.max(0, business.minimumNoticeHours ?? 1);
  const noticeCheck = checkMinimumNotice(normalizedDate, slotStart, minimumNoticeHours);
  if (!noticeCheck.valid) {
    return { available: false, reason: noticeCheck.reason };
  }

  const candidateBuffer =
    bufferMinutes !== undefined && bufferMinutes !== null && bufferMinutes >= 0
      ? bufferMinutes
      : resolveEffectiveBuffer(service.bufferMinutes, business.timeInterval);

  const breakIntervals = (daySchedule.breakHours || []).map((b) => ({
    startMin: timeToMinutes(b.start),
    endMin: timeToMinutes(b.end),
  }));

  const fallsInBreak = breakIntervals.some((b) =>
    isIntervalOverlapping(slotStart, slotEnd + candidateBuffer, b.startMin, b.endMin)
  );
  if (fallsInBreak) {
    return { available: false, reason: 'Slot conflicts with business break hours' };
  }

  const maxCapacity = Math.max(1, business.maximumSlot || 1);
  const conflictingAppointments = await Appointment.find({
    businessId,
    staffId,
    date: { $in: [normalizedDate, date] },
    appointmentStatus: { $ne: 'Cancelled' },
  })
    .select('time durationMinutes bufferMinutes')
    .lean();

  let directCollisions = 0;
  let bufferCollisions = 0;

  for (const app of conflictingAppointments) {
    const appParsed = parseBookedTime(app.time, app.durationMinutes || durationMinutes);
    if (!appParsed) continue;

    const appBuffer = resolveEffectiveBuffer(app.bufferMinutes, business.timeInterval);
    const collisionCheck = isSlotCollidingWithBooking(
      slotStart,
      slotEnd,
      candidateBuffer,
      appParsed.startMin,
      appParsed.endMin,
      appBuffer
    );

    if (collisionCheck.collides) {
      if (collisionCheck.isDirectCollision) {
        directCollisions++;
      } else {
        bufferCollisions++;
      }
    }
  }

  if (directCollisions + bufferCollisions >= maxCapacity) {
    if (directCollisions > 0) {
      return { available: false, reason: 'Slot is already booked for this staff member' };
    }
    return {
      available: false,
      reason: 'Slot conflicts with the cleaning buffer window of another appointment',
    };
  }

  return { available: true };
}
