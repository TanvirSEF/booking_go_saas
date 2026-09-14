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
  availableStaffIds: string[];
}

export interface ValidateSlotParams {
  businessId: string;
  serviceId: string;
  staffId: string;
  date: string;
  time: string;
  durationMinutes: number;
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
    .select('time staffId durationMinutes')
    .lean();

  const bookedAppointmentsParsed = activeAppointments.map((app) => {
    const parsed = parseBookedTime(app.time, app.durationMinutes || duration);
    return {
      staffId: String(app.staffId),
      startMin: parsed?.startMin ?? 0,
      endMin: parsed?.endMin ?? 0,
    };
  });

  const now = new Date();
  const todayNormalized = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const isToday = normalizedDate === todayNormalized;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: CalculatedSlot[] = [];

  for (let slotStart = startMinutes; slotStart + duration <= endMinutes; slotStart += duration) {
    const slotEnd = slotStart + duration;

    const fallsInBreak = breakIntervals.some((b) =>
      isIntervalOverlapping(slotStart, slotEnd, b.startMin, b.endMin)
    );
    if (fallsInBreak) {
      continue;
    }

    if (isToday && slotStart <= currentMinutes) {
      continue;
    }

    const availableStaff = eligibleStaff.filter((staffMember) => {
      const staffMemberId = String(staffMember._id);
      const overlappingBookingsCount = bookedAppointmentsParsed.filter(
        (b) =>
          b.staffId === staffMemberId &&
          isIntervalOverlapping(slotStart, slotEnd, b.startMin, b.endMin)
      ).length;

      return overlappingBookingsCount < maxCapacity;
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

  const { businessId, serviceId, staffId, date, time, durationMinutes } = params;
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

  const breakIntervals = (daySchedule.breakHours || []).map((b) => ({
    startMin: timeToMinutes(b.start),
    endMin: timeToMinutes(b.end),
  }));

  const fallsInBreak = breakIntervals.some((b) =>
    isIntervalOverlapping(slotStart, slotEnd, b.startMin, b.endMin)
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
    .select('time durationMinutes')
    .lean();

  let overlapCount = 0;
  for (const app of conflictingAppointments) {
    const appParsed = parseBookedTime(app.time, app.durationMinutes || durationMinutes);
    if (appParsed && isIntervalOverlapping(slotStart, slotEnd, appParsed.startMin, appParsed.endMin)) {
      overlapCount++;
    }
  }

  if (overlapCount >= maxCapacity) {
    return { available: false, reason: 'Slot is fully booked for this staff member' };
  }

  return { available: true };
}
