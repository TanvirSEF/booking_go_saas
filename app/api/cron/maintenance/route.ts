import { NextRequest, NextResponse } from 'next/server';
import { vacuumDatabase } from '@/lib/database-maintenance-engine';
import type { VacuumOptions, VacuumScope } from '@/types/maintenance';

export const dynamic = 'force-dynamic';

/**
 * Automated Cron & Administrative Maintenance Endpoint.
 * Designed for scheduled Vercel Cron jobs, Kubernetes CronJobs, or automated platform maintenance.
 *
 * GET /api/cron/maintenance
 * POST /api/cron/maintenance
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * Query Params:
 *  - dryRun=true|false: default is true for safety
 *  - scope=all|orphans|stale_logs|stale_webhooks|read_notifications
 *  - businessId=...: optional tenant-specific scoping
 *  - loginLogsDays=90: retention window for login audit logs
 *  - webhooksDays=60: retention window for processed webhooks
 *  - notificationsDays=30: retention window for read notifications
 */
async function handleMaintenance(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');

    // If CRON_SECRET is configured, enforce strict bearer authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid cron authorization token.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dryRunParam = searchParams.get('dryRun');
    const scopeParam = searchParams.get('scope') as VacuumScope | null;
    const businessIdParam = searchParams.get('businessId') || undefined;

    const loginLogsDaysParam = searchParams.get('loginLogsDays');
    const webhooksDaysParam = searchParams.get('webhooksDays');
    const notificationsDaysParam = searchParams.get('notificationsDays');

    // Default to dry-run unless explicitly specified as 'false'
    const dryRun = dryRunParam !== 'false';

    const options: VacuumOptions = {
      dryRun,
      scope: scopeParam || 'all',
      businessId: businessIdParam,
      retention: {
        loginLogsDays: loginLogsDaysParam ? parseInt(loginLogsDaysParam, 10) : undefined,
        webhooksDays: webhooksDaysParam ? parseInt(webhooksDaysParam, 10) : undefined,
        notificationsDays: notificationsDaysParam ? parseInt(notificationsDaysParam, 10) : undefined,
      },
    };

    const result = await vacuumDatabase(options);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database maintenance execution failed.';
    console.error('[Cron Maintenance Route Error]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleMaintenance(req);
}

export async function POST(req: NextRequest) {
  return handleMaintenance(req);
}
