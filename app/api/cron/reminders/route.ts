import { NextRequest, NextResponse } from 'next/server';
import { processAppointmentReminders } from '@/lib/cron-reminder';

export const dynamic = 'force-dynamic';

/**
 * Automated cron trigger to dispatch appointment reminders to customers.
 * Designed for Vercel Cron, external scheduler triggers, or administrative maintenance jobs.
 *
 * GET /api/cron/reminders
 * Header: Authorization: Bearer <CRON_SECRET>
 * Optional Query Params:
 *  - dryRun=true: calculate eligible reminders without dispatching emails or modifying records
 *  - lookaheadHours=24: override default lookahead window (in hours)
 *  - businessId=...: scope processing to a specific tenant business
 *  - limit=50: maximum number of reminders to dispatch in this execution batch
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');

    // If CRON_SECRET is configured in environment, enforce strict bearer authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid cron authorization token.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const lookaheadParam = searchParams.get('lookaheadHours');
    const businessIdParam = searchParams.get('businessId') || undefined;
    const limitParam = searchParams.get('limit');

    const lookaheadHours = lookaheadParam ? parseInt(lookaheadParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const result = await processAppointmentReminders({
      dryRun,
      lookaheadHours: !isNaN(Number(lookaheadHours)) ? lookaheadHours : undefined,
      businessId: businessIdParam,
      limit: !isNaN(Number(limit)) ? limit : undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cron reminder dispatch failed.';
    console.error('[Cron Reminder Route Error]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
