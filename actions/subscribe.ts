'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Subscribe } from '@/models/Subscribe';
import { Business } from '@/models/Business';
import { User } from '@/models/User';
import type {
  SubscriberDTO,
  SubscribeNewsletterInput,
  SubscriberFilterParams,
  PaginatedSubscribersResult,
  ExportSubscribersResult,
  SubscriberActionResponse,
} from '@/types/subscribe';

const subscribeSchema = z.object({
  businessSlug: z.string().min(1, 'Business slug is required').trim(),
  email: z.string().email('Please enter a valid email address').max(150).trim().toLowerCase(),
  theme: z.string().trim().optional().default('default'),
  source: z.string().trim().optional().default('footer'),
});

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

async function resolveTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User account not found.');
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
 * Public action: Opt-in to newsletter subscription from public landing page or booking wizard.
 * Idempotent: re-activates unsubscribed users or confirms existing subscriptions without throwing errors.
 */
export async function subscribeNewsletterAction(
  rawInput: SubscribeNewsletterInput
): Promise<SubscriberActionResponse<{ id: string }>> {
  try {
    await connectToDatabase();

    const input = subscribeSchema.parse(rawInput);

    const business = await Business.findOne({
      slug: input.businessSlug,
      isActive: { $ne: false },
    }).lean();

    if (!business) {
      return { success: false, error: 'Business could not be found or is inactive.' };
    }

    const existing = await Subscribe.findOne({
      businessId: business._id,
      email: input.email,
    });

    if (existing) {
      if (existing.status === 'active') {
        return {
          success: true,
          message: 'You are already subscribed to our newsletter!',
          data: { id: String(existing._id) },
        };
      }

      // Re-activate previously unsubscribed subscriber
      existing.status = 'active';
      existing.unsubscribedAt = undefined;
      existing.theme = input.theme || existing.theme;
      existing.source = input.source || existing.source;
      await existing.save();

      return {
        success: true,
        message: 'Welcome back! Your subscription has been reactivated.',
        data: { id: String(existing._id) },
      };
    }

    const subscriber = await Subscribe.create({
      companyId: business.companyId,
      businessId: business._id,
      email: input.email,
      theme: input.theme || 'default',
      source: input.source || 'footer',
      status: 'active',
    });

    return {
      success: true,
      message: 'Thank you for subscribing to our newsletter!',
      data: { id: String(subscriber._id) },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Validation error.' };
    }
    const message = error instanceof Error ? error.message : 'Failed to subscribe.';
    return { success: false, error: message };
  }
}

/**
 * Public action: Unsubscribe email from newsletter (1-click unsubscribe compliant).
 */
export async function unsubscribeNewsletterAction(
  businessSlug: string,
  email: string
): Promise<SubscriberActionResponse> {
  try {
    await connectToDatabase();

    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Email is required to unsubscribe.' };
    }

    const business = await Business.findOne({ slug: businessSlug }).lean();
    if (!business) {
      return { success: false, error: 'Business not found.' };
    }

    const subscriber = await Subscribe.findOne({
      businessId: business._id,
      email: cleanEmail,
    });

    if (subscriber && subscriber.status === 'active') {
      subscriber.status = 'unsubscribed';
      subscriber.unsubscribedAt = new Date();
      await subscriber.save();
    }

    return {
      success: true,
      message: 'You have been successfully unsubscribed from the newsletter.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unsubscribe.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Query subscribers list with pagination, search, status filtering, and count breakdown.
 */
export async function getCompanySubscribersAction(
  params: SubscriberFilterParams = {}
): Promise<SubscriberActionResponse<PaginatedSubscribersResult>> {
  try {
    const { businessId } = await resolveTenantContext();

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const bId = new Types.ObjectId(businessId);
    const query: Record<string, unknown> = { businessId: bId };

    if (params.status && params.status !== 'all') {
      query.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const sanitized = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.email = new RegExp(sanitized, 'i');
    }

    const [items, totalFiltered, countAggregation] = await Promise.all([
      Subscribe.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscribe.countDocuments(query),
      Subscribe.aggregate([
        { $match: { businessId: bId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const counts = {
      total: 0,
      active: 0,
      unsubscribed: 0,
    };

    countAggregation.forEach((entry: { _id: string; count: number }) => {
      counts.total += entry.count;
      if (entry._id === 'active') counts.active = entry.count;
      else if (entry._id === 'unsubscribed') counts.unsubscribed = entry.count;
    });

    const subscribers: SubscriberDTO[] = items.map((doc) => ({
      id: String(doc._id),
      email: doc.email,
      theme: doc.theme,
      source: doc.source,
      status: doc.status,
      unsubscribedAt: doc.unsubscribedAt ? doc.unsubscribedAt.toISOString() : undefined,
      createdAt: doc.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        subscribers,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages: Math.ceil(totalFiltered / limit) || 1,
        },
        counts,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve subscribers.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Delete an individual subscriber.
 */
export async function deleteSubscriberAction(
  id: string
): Promise<SubscriberActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid subscriber ID format.' };
    }

    const result = await Subscribe.deleteOne({
      _id: new Types.ObjectId(id),
      businessId: new Types.ObjectId(businessId),
    });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Subscriber not found or already removed.' };
    }

    revalidatePath('/subscribers');

    return {
      success: true,
      message: 'Subscriber deleted successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete subscriber.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Bulk delete subscribers.
 */
export async function bulkDeleteSubscribersAction(
  ids: string[]
): Promise<SubscriberActionResponse<{ deletedCount: number }>> {
  try {
    const { businessId } = await resolveTenantContext();

    const validIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (validIds.length === 0) {
      return { success: false, error: 'No valid subscriber IDs provided.' };
    }

    const result = await Subscribe.deleteMany({
      _id: { $in: validIds },
      businessId: new Types.ObjectId(businessId),
    });

    revalidatePath('/subscribers');

    return {
      success: true,
      message: `Successfully deleted ${result.deletedCount} subscribers.`,
      data: { deletedCount: result.deletedCount },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk delete subscribers.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Export all subscribers for the active business as an RFC 4180 CSV string.
 */
export async function exportSubscribersCsvAction(): Promise<
  SubscriberActionResponse<ExportSubscribersResult>
> {
  try {
    const { businessId } = await resolveTenantContext();

    const subscribers = await Subscribe.find({
      businessId: new Types.ObjectId(businessId),
    })
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Email',
      'Status',
      'Theme',
      'Source',
      'Subscribed Date',
      'Unsubscribed Date',
    ];

    const rows = subscribers.map((sub) => [
      escapeCsvCell(sub.email),
      escapeCsvCell(sub.status),
      escapeCsvCell(sub.theme),
      escapeCsvCell(sub.source),
      escapeCsvCell(sub.createdAt ? sub.createdAt.toISOString() : ''),
      escapeCsvCell(sub.unsubscribedAt ? sub.unsubscribedAt.toISOString() : ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const filename = `subscribers_${new Date().toISOString().slice(0, 10)}.csv`;

    return {
      success: true,
      data: {
        csvContent,
        filename,
        totalCount: subscribers.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export subscribers.';
    return { success: false, error: message };
  }
}
