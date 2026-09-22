import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Appointment, type IAppointmentDocument } from '@/models/Appointment';
import { Business, type IBusiness } from '@/models/Business';
import { dispatchAppointmentEmailEvent } from '@/lib/email-events';
import type {
  ReminderProcessOptions,
  ReminderProcessResult,
  ReminderItemResult,
} from '@/types/email-events';

/**
 * Parses appointment date and time into a reliable JavaScript Date object.
 * Handles both 'YYYY-MM-DD' and 'DD-MM-YYYY' date patterns and 'HH:mm' or 'HH:mm-HH:mm' time patterns.
 */
export function parseAppointmentDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) {
    return null;
  }

  const cleanDate = dateStr.trim();
  const startTime = timeStr.split('-')[0].trim();
  const timeParts = startTime.split(':');
  if (timeParts.length < 2) {
    return null;
  }

  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const dateParts = cleanDate.split(/[-/]/);
  if (dateParts.length !== 3) {
    return null;
  }

  let year: number;
  let month: number;
  let day: number;

  if (dateParts[0].length === 4) {
    // YYYY-MM-DD
    year = parseInt(dateParts[0], 10);
    month = parseInt(dateParts[1], 10) - 1;
    day = parseInt(dateParts[2], 10);
  } else if (dateParts[2].length === 4) {
    // DD-MM-YYYY
    day = parseInt(dateParts[0], 10);
    month = parseInt(dateParts[1], 10) - 1;
    year = parseInt(dateParts[2], 10);
  } else {
    return null;
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }

  // Create Date using local time coordinates
  const parsed = new Date(year, month, day, hours, minutes, 0, 0);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Checks whether an appointment start time falls within the lookahead reminder window.
 * An appointment is eligible if its start timestamp is between `referenceDate` and `referenceDate + lookaheadHours`.
 */
export function isAppointmentWithinReminderWindow(
  appointmentDate: string,
  appointmentTime: string,
  lookaheadHours: number,
  referenceDate: Date = new Date()
): boolean {
  const appDate = parseAppointmentDateTime(appointmentDate, appointmentTime);
  if (!appDate) {
    return false;
  }

  const nowMs = referenceDate.getTime();
  const appMs = appDate.getTime();
  const maxMs = nowMs + lookaheadHours * 60 * 60 * 1000;

  // Must be in the future (appMs >= nowMs) and within the lookahead window (appMs <= maxMs)
  return appMs >= nowMs && appMs <= maxMs;
}

/**
 * Core appointment reminder cron processor.
 * Queries eligible pending/confirmed appointments within the lookahead window,
 * dispatches unified transactional reminder emails, and idempotently records reminder delivery.
 */
export async function processAppointmentReminders(
  options?: ReminderProcessOptions
): Promise<ReminderProcessResult> {
  const now = new Date();
  const dryRun = Boolean(options?.dryRun);
  const defaultLookahead = options?.lookaheadHours ?? 24;
  const limit = options?.limit ?? 100;

  await connectToDatabase();

  const query: Record<string, unknown> = {
    isReminderSent: { $ne: true },
    appointmentStatus: { $in: ['Confirmed', 'Pending', 'confirmed', 'pending'] },
  };

  if (options?.businessId && Types.ObjectId.isValid(options.businessId)) {
    query.businessId = new Types.ObjectId(options.businessId);
  }

  // Find candidate appointments
  const candidates: IAppointmentDocument[] = await Appointment.find(query)
    .sort({ date: 1, time: 1 })
    .limit(limit * 3) // fetch extra to account for date filter
    .lean();

  const businessCache = new Map<string, IBusiness | null>();

  async function getBusiness(bId: Types.ObjectId | string): Promise<IBusiness | null> {
    const idStr = String(bId);
    if (businessCache.has(idStr)) {
      return businessCache.get(idStr)!;
    }
    const b = await Business.findById(idStr).lean<IBusiness>();
    businessCache.set(idStr, b);
    return b;
  }

  const results: ReminderItemResult[] = [];
  let dispatched = 0;
  let failed = 0;
  let skipped = 0;
  let matched = 0;

  for (const app of candidates) {
    if (results.length >= limit) {
      break;
    }

    if (!app.email || !app.email.includes('@')) {
      skipped++;
      continue;
    }

    // Resolve tenant specific lookahead window if configured
    let lookaheadHours = defaultLookahead;
    if (app.businessId) {
      const biz = await getBusiness(app.businessId);
      const bizReminderHours = (biz as unknown as { appointmentReminderHours?: number })?.appointmentReminderHours;
      if (typeof bizReminderHours === 'number' && bizReminderHours > 0) {
        lookaheadHours = bizReminderHours;
      }
    }

    const isEligible = isAppointmentWithinReminderWindow(
      app.date,
      app.time,
      lookaheadHours,
      now
    );

    if (!isEligible) {
      continue;
    }

    matched++;

    if (dryRun) {
      results.push({
        appointmentId: String(app._id),
        appointmentNumber: app.appointmentNumber,
        email: app.email,
        date: app.date,
        time: app.time,
        success: true,
      });
      continue;
    }

    try {
      const dispatchResult = await dispatchAppointmentEmailEvent(
        'appointment_reminder',
        app._id
      );

      if (dispatchResult.success || dispatchResult.customerDelivered) {
        // Atomically flag reminder as dispatched in Atlas
        await Appointment.findByIdAndUpdate(app._id, {
          isReminderSent: true,
          reminderSentAt: new Date(),
        });

        dispatched++;
        results.push({
          appointmentId: String(app._id),
          appointmentNumber: app.appointmentNumber,
          email: app.email,
          date: app.date,
          time: app.time,
          success: true,
        });
      } else {
        failed++;
        results.push({
          appointmentId: String(app._id),
          appointmentNumber: app.appointmentNumber,
          email: app.email,
          date: app.date,
          time: app.time,
          success: false,
          error: dispatchResult.error || dispatchResult.customerError || 'Failed to deliver reminder.',
        });
      }
    } catch (err) {
      failed++;
      results.push({
        appointmentId: String(app._id),
        appointmentNumber: app.appointmentNumber,
        email: app.email,
        date: app.date,
        time: app.time,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown reminder dispatch error.',
      });
    }
  }

  return {
    success: true,
    timestamp: now.toISOString(),
    dryRun,
    lookaheadHours: defaultLookahead,
    matched,
    dispatched,
    failed,
    skipped,
    results,
  };
}
