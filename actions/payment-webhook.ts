'use server';

import { Types } from 'mongoose';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { Order } from '@/models/Order';
import { WebhookEvent, type WebhookProvider, type WebhookEventStatus } from '@/models/WebhookEvent';
import { enforcePlanExpirations } from '@/lib/subscription-renewal-engine';

async function resolveAuthUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User account not found.');
  }

  return user;
}

/**
 * Super Admin diagnostics action to query recent webhook event delivery history and idempotency states.
 */
export async function getWebhookEventsAction(options: {
  provider?: WebhookProvider;
  status?: WebhookEventStatus;
  limit?: number;
} = {}): Promise<{
  success: boolean;
  data?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();

    if (user.role !== 'super admin') {
      return { success: false, error: 'Forbidden. Super Admin privileges required.' };
    }

    const query: Record<string, unknown> = {};
    if (options.provider) query.provider = options.provider;
    if (options.status) query.status = options.status;

    const limit = Math.min(options.limit || 50, 100);

    const events = await WebhookEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return {
      success: true,
      data: events.map((e) => ({
        id: String(e._id),
        eventId: e.eventId,
        provider: e.provider,
        eventType: e.eventType,
        status: e.status,
        payloadSummary: e.payloadSummary,
        errorMessage: e.errorMessage,
        processedAt: e.processedAt ? e.processedAt.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve webhook events.';
    return { success: false, error: message };
  }
}

/**
 * Super Admin / Cron action to enforce subscription expirations and downgrade accounts.
 */
export async function enforcePlanExpirationsAction(
  gracePeriodDays = 0
): Promise<{
  success: boolean;
  data?: { evaluatedCount: number; downgradedCount: number; gracePeriodDays: number };
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();

    if (user.role !== 'super admin') {
      return { success: false, error: 'Forbidden. Super Admin privileges required.' };
    }

    const result = await enforcePlanExpirations(gracePeriodDays);
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enforce plan expirations.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves the current tenant's active subscription status, expiration countdown, and recent invoices.
 */
export async function getTenantSubscriptionStatusAction(): Promise<{
  success: boolean;
  data?: {
    planName: string;
    isFreePlan: boolean;
    billingType: 'monthly' | 'yearly';
    planExpireDate: string | null;
    daysRemaining: number;
    isExpired: boolean;
    recentOrders: Array<Record<string, unknown>>;
  };
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();

    const companyId =
      user.role === 'company'
        ? user._id
        : user.companyId
          ? new Types.ObjectId(user.companyId)
          : user._id;

    const companyUser = await User.findById(companyId).lean();
    if (!companyUser) {
      return { success: false, error: 'Organization user not found.' };
    }

    let planName = 'Free Plan';
    let isFreePlan = true;

    if (companyUser.activePlanId) {
      const plan = await Plan.findById(companyUser.activePlanId).lean();
      if (plan) {
        planName = plan.name;
        isFreePlan = plan.isFreePlan;
      }
    }

    const now = new Date();
    const expireDate = companyUser.planExpireDate ? new Date(companyUser.planExpireDate) : null;
    const isExpired = expireDate ? expireDate < now : false;

    let daysRemaining = 0;
    if (expireDate && !isExpired) {
      daysRemaining = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const orders = await Order.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      success: true,
      data: {
        planName,
        isFreePlan,
        billingType: companyUser.billingType || 'monthly',
        planExpireDate: expireDate ? expireDate.toISOString() : null,
        daysRemaining,
        isExpired,
        recentOrders: orders.map((o) => ({
          id: String(o._id),
          orderNumber: o.orderNumber,
          planName: o.planName,
          price: o.price,
          currency: o.currency,
          paymentType: o.paymentType,
          paymentStatus: o.paymentStatus,
          createdAt: o.createdAt.toISOString(),
          receiptUrl: o.receiptUrl,
        })),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve subscription status.';
    return { success: false, error: message };
  }
}
