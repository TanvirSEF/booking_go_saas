import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import { Staff } from '@/models/Staff';
import { Appointment } from '@/models/Appointment';
import '@/models/Service';
import '@/models/Location';
import '@/models/Customer';
import { parseAppointmentDateTimes } from '@/lib/calendar-link';
import type {
  ResolvedFeedContext,
  CalendarFeedSummary,
} from '@/types/calendar-feed';

/**
 * Generates a high-entropy 48-character cryptographic hexadecimal token.
 */
export function generateFeedToken(): string {
  return randomBytes(24).toString('hex');
}

/**
 * Retrieves or lazily provisions a persistent calendar feed token for a business.
 */
export async function ensureBusinessFeedToken(businessId: string): Promise<string> {
  await connectToDatabase();
  const bId = new Types.ObjectId(businessId);

  const business = await Business.findById(bId).select('calendarFeedToken').lean();
  if (!business) {
    throw new Error('Business not found.');
  }

  if (business.calendarFeedToken) {
    return business.calendarFeedToken;
  }

  const newToken = generateFeedToken();
  await Business.findByIdAndUpdate(bId, { calendarFeedToken: newToken });
  return newToken;
}

/**
 * Retrieves or lazily provisions a persistent calendar feed token for a staff member.
 */
export async function ensureStaffFeedToken(staffId: string): Promise<string> {
  await connectToDatabase();
  const sId = new Types.ObjectId(staffId);

  const staff = await Staff.findById(sId).select('calendarFeedToken').lean();
  if (!staff) {
    throw new Error('Staff record not found.');
  }

  if (staff.calendarFeedToken) {
    return staff.calendarFeedToken;
  }

  const newToken = generateFeedToken();
  await Staff.findByIdAndUpdate(sId, { calendarFeedToken: newToken });
  return newToken;
}

/**
 * Atomically rotates the calendar feed token for a business, invalidating any previous URLs.
 */
export async function rotateBusinessFeedToken(businessId: string): Promise<string> {
  await connectToDatabase();
  const bId = new Types.ObjectId(businessId);
  const newToken = generateFeedToken();

  const updated = await Business.findByIdAndUpdate(
    bId,
    { calendarFeedToken: newToken },
    { returnDocument: 'after' }
  ).select('calendarFeedToken');

  if (!updated) {
    throw new Error('Failed to rotate business feed token: Business not found.');
  }

  return newToken;
}

/**
 * Atomically rotates the calendar feed token for a staff member, invalidating any previous URLs.
 */
export async function rotateStaffFeedToken(staffId: string): Promise<string> {
  await connectToDatabase();
  const sId = new Types.ObjectId(staffId);
  const newToken = generateFeedToken();

  const updated = await Staff.findByIdAndUpdate(
    sId,
    { calendarFeedToken: newToken },
    { returnDocument: 'after' }
  ).select('calendarFeedToken');

  if (!updated) {
    throw new Error('Failed to rotate staff feed token: Staff record not found.');
  }

  return newToken;
}

/**
 * Resolves a raw feed token to its authenticated tenant context (Business or Staff scope).
 */
export async function resolveFeedToken(token: string): Promise<ResolvedFeedContext | null> {
  if (!token || typeof token !== 'string') return null;

  const cleanToken = token.trim().replace(/\.ics$/, '');
  if (!cleanToken) return null;

  await connectToDatabase();

  // 1. Try resolving as Business-wide token
  const business = await Business.findOne({ calendarFeedToken: cleanToken })
    .select('_id name companyId')
    .lean();

  if (business) {
    return {
      scope: 'business',
      businessId: String(business._id),
      businessName: business.name || 'Business Appointments',
      companyId: String(business.companyId),
    };
  }

  // 2. Try resolving as Staff-specific token
  const staff = await Staff.findOne({ calendarFeedToken: cleanToken })
    .populate('businessId', '_id name companyId')
    .populate('userId', 'email')
    .select('_id name businessId userId')
    .lean();

  if (staff && staff.businessId) {
    const b = staff.businessId as unknown as { _id: Types.ObjectId; name: string; companyId: Types.ObjectId };
    const userObj = staff.userId as unknown as { email?: string } | null;

    return {
      scope: 'staff',
      businessId: String(b._id),
      businessName: b.name || 'Business Appointments',
      companyId: String(b.companyId),
      staffId: String(staff._id),
      staffName: staff.name,
      staffEmail: userObj?.email,
    };
  }

  return null;
}

/**
 * Escapes characters according to RFC 5545 section 3.3.11 specifications.
 */
export function escapeIcsText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
}

/**
 * Formats a Date object into UTC iCalendar timestamp: YYYYMMDDTHHmmssZ
 */
export function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Folds a single ICS line according to RFC 5545 line length limit (75 octets).
 */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;

  const chunks: string[] = [];
  let remaining = line;

  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);

  while (remaining.length > 0) {
    chunks.push(' ' + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }

  return chunks.join('\r\n');
}

/**
 * Computes calendar feed summary statistics for a given token context.
 */
export async function getCalendarFeedSummary(
  context: ResolvedFeedContext
): Promise<CalendarFeedSummary> {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    businessId: new Types.ObjectId(context.businessId),
  };

  if (context.scope === 'staff' && context.staffId) {
    query.staffId = new Types.ObjectId(context.staffId);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const [totalEvents, upcomingEvents] = await Promise.all([
    Appointment.countDocuments(query),
    Appointment.countDocuments({ ...query, date: { $gte: todayStr } }),
  ]);

  const entityName =
    context.scope === 'staff'
      ? `${context.staffName || 'Staff Specialist'} (${context.businessName})`
      : context.businessName;

  return {
    scope: context.scope,
    entityName,
    totalEvents,
    upcomingEvents,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generates a standard RFC 5545 iCalendar stream for a resolved feed context.
 */
export async function generateIcsFeed(
  context: ResolvedFeedContext,
  options: { lookbackDays?: number; lookaheadDays?: number } = {}
): Promise<string> {
  await connectToDatabase();

  const lookback = options.lookbackDays ?? 30;
  const lookahead = options.lookaheadDays ?? 180;

  const now = new Date();
  const pastDate = new Date(now.getTime() - lookback * 24 * 60 * 60 * 1000);
  const futureDate = new Date(now.getTime() + lookahead * 24 * 60 * 60 * 1000);

  const minDateStr = pastDate.toISOString().split('T')[0];
  const maxDateStr = futureDate.toISOString().split('T')[0];

  const query: Record<string, unknown> = {
    businessId: new Types.ObjectId(context.businessId),
    date: { $gte: minDateStr, $lte: maxDateStr },
  };

  if (context.scope === 'staff' && context.staffId) {
    query.staffId = new Types.ObjectId(context.staffId);
  }

  const appointments = await Appointment.find(query)
    .populate('serviceId', 'name price durationMinutes')
    .populate('locationId', 'name address')
    .populate('staffId', 'name')
    .sort({ date: 1, time: 1 })
    .lean();

  const calTitle =
    context.scope === 'staff'
      ? `${context.staffName || 'Specialist'} - ${context.businessName}`
      : `${context.businessName} - Appointments`;

  const nowIcs = formatIcsDateTime(new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookingGo SaaS//Calendar Feed 2.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calTitle)}`,
    `X-WR-CALDESC:${escapeIcsText(`Live appointment schedule for ${calTitle}`)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT30M',
    'X-PUBLISHED-TTL:PT30M',
  ];

  for (const app of appointments) {
    const serviceObj = app.serviceId as { name?: string; price?: number; durationMinutes?: number } | null;
    const locationObj = app.locationId as { name?: string; address?: string } | null;
    const staffObj = app.staffId as { name?: string } | null;

    const { startDate, endDate } = parseAppointmentDateTimes(app.date, app.time);

    // If service has explicit duration, apply duration override
    if (serviceObj?.durationMinutes && serviceObj.durationMinutes > 0) {
      endDate.setTime(startDate.getTime() + serviceObj.durationMinutes * 60 * 1000);
    }

    const startUtc = formatIcsDateTime(startDate);
    const endUtc = formatIcsDateTime(endDate);

    const isCancelled =
      (app.appointmentStatus || '').toLowerCase() === 'cancelled' ||
      (app.appointmentStatus || '').toLowerCase() === 'canceled';

    const serviceName = serviceObj?.name || 'Appointment';
    const customerName = app.name || 'Customer';
    const summary = `${serviceName} - ${customerName}`;

    const locationText = locationObj
      ? `${locationObj.name || ''}${locationObj.address ? ` (${locationObj.address})` : ''}`
      : 'Main Office';

    const descLines = [
      `Appointment: #${app.appointmentNumber}`,
      `Service: ${serviceName}${serviceObj?.price ? ` ($${serviceObj.price})` : ''}`,
      `Customer: ${customerName}`,
      `Email: ${app.email || 'N/A'}`,
      `Phone: ${app.contact || 'N/A'}`,
      `Staff: ${staffObj?.name || context.staffName || 'Assigned Specialist'}`,
      `Status: ${app.appointmentStatus || 'Confirmed'}`,
      `Payment: ${app.paymentType || 'Manual'} (${app.paymentStatus || 'unpaid'})`,
    ];

    if (app.notes) {
      descLines.push(`Notes: ${app.notes}`);
    }

    const description = descLines.join('\n');
    const uid = `appointment_${app._id}@bookinggo.saas`;
    const sequence = app.updatedAt ? Math.floor(new Date(app.updatedAt).getTime() / 1000) : 0;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`SEQUENCE:${sequence}`);
    lines.push(`DTSTAMP:${nowIcs}`);
    lines.push(`DTSTART:${startUtc}`);
    lines.push(`DTEND:${endUtc}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push(`LOCATION:${escapeIcsText(locationText)}`);
    lines.push(isCancelled ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED');
    lines.push(isCancelled ? 'TRANSP:TRANSPARENT' : 'TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.map(foldIcsLine).join('\r\n');
}

/**
 * Builds standard HTTPS and webcal:// subscription URLs for a given feed token.
 */
export function buildFeedUrls(
  token: string,
  baseUrl?: string
): { feedUrl: string; webcalUrl: string } {
  const host =
    baseUrl ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  const cleanHost = host.replace(/\/$/, '');
  const feedUrl = `${cleanHost}/api/calendar/feed/${token}.ics`;
  const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://');

  return { feedUrl, webcalUrl };
}
