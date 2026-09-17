import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Appointment } from '@/models/Appointment';
import '@/models/Business';
import '@/models/Service';
import '@/models/Staff';
import '@/models/Location';
import { sendAppointmentReminderEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

/**
 * Automated cron trigger to dispatch appointment reminders to customers.
 * Designed for Vercel Cron or external scheduler triggers.
 *
 * GET /api/cron/reminders
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');

    // If CRON_SECRET is configured in environment, verify authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid cron authorization token.' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const now = new Date();
    // Compute date boundary: today and tomorrow
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Search for confirmed or pending upcoming appointments where reminder has not yet been sent
    const pendingAppointments = await Appointment.find({
      isReminderSent: { $ne: true },
      appointmentStatus: { $in: ['Confirmed', 'Pending', 'confirmed', 'pending'] },
      date: { $in: [todayStr, tomorrowStr] },
    })
      .populate('serviceId', 'name')
      .populate('staffId', 'name')
      .populate('locationId', 'name address')
      .populate('businessId', 'name slug appointmentReminderHours')
      .limit(50);

    let sentCount = 0;
    const results: Array<{ appointmentNumber: string; success: boolean }> = [];

    for (const app of pendingAppointments) {
      const business = app.businessId as unknown as {
        name?: string;
        slug?: string;
        appointmentReminderHours?: number;
      } | null;

      if (!business?.name || !app.email) {
        continue;
      }

      const serviceObj = app.serviceId as { name?: string } | null;
      const staffObj = app.staffId as { name?: string } | null;
      const locationObj = app.locationId as { name?: string; address?: string } | null;

      try {
        const mailResult = await sendAppointmentReminderEmail({
          customerName: app.name,
          customerEmail: app.email,
          appointmentNumber: app.appointmentNumber,
          serviceName: serviceObj?.name || 'Service',
          staffName: staffObj?.name || 'Staff Specialist',
          locationName: locationObj?.name || 'Location',
          locationAddress: locationObj?.address || '',
          date: app.date,
          time: app.time,
          durationMinutes: app.durationMinutes || 30,
          businessName: business.name,
          businessSlug: business.slug || '',
        });

        if (mailResult.success) {
          app.isReminderSent = true;
          app.reminderSentAt = new Date();
          await app.save();

          sentCount++;
          results.push({ appointmentNumber: app.appointmentNumber, success: true });
        } else {
          results.push({ appointmentNumber: app.appointmentNumber, success: false });
        }
      } catch (sendErr) {
        console.error(`[Cron Reminder] Failed for ${app.appointmentNumber}:`, sendErr);
        results.push({ appointmentNumber: app.appointmentNumber, success: false });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      matched: pendingAppointments.length,
      dispatched: sentCount,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cron reminder dispatch failed.';
    console.error('[Cron Reminder Error]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
