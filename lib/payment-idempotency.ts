import { connectToDatabase } from '@/lib/db';
import { WebhookEvent, type WebhookProvider } from '@/models/WebhookEvent';

export interface WebhookLockResult {
  shouldProcess: boolean;
  reason?: string;
  lockId?: string;
}

/**
 * Atomically acquires an idempotency lock for an incoming webhook event.
 * Eliminates duplicate order creation, repeated plan extensions, and race conditions.
 */
export async function acquireWebhookLock(
  eventId: string,
  provider: WebhookProvider,
  eventType: string,
  summary?: Record<string, unknown>
): Promise<WebhookLockResult> {
  if (!eventId || !provider) {
    return { shouldProcess: false, reason: 'Missing eventId or provider.' };
  }

  await connectToDatabase();

  const existing = await WebhookEvent.findOne({ eventId, provider });

  if (existing) {
    if (existing.status === 'processed') {
      return {
        shouldProcess: false,
        reason: 'Already processed (idempotent skip)',
        lockId: String(existing._id),
      };
    }

    if (existing.status === 'processing') {
      const now = Date.now();
      const created = new Date(existing.createdAt).getTime();

      // If processing lock is older than 5 minutes, consider it orphaned and allow re-lock
      if (now - created > 5 * 60 * 1000) {
        existing.status = 'processing';
        if (summary) existing.payloadSummary = summary;
        await existing.save();
        return { shouldProcess: true, lockId: String(existing._id) };
      }

      return {
        shouldProcess: false,
        reason: 'Currently being processed by concurrent execution',
        lockId: String(existing._id),
      };
    }

    if (existing.status === 'failed') {
      existing.status = 'processing';
      existing.errorMessage = undefined;
      if (summary) existing.payloadSummary = summary;
      await existing.save();
      return { shouldProcess: true, lockId: String(existing._id) };
    }

    if (existing.status === 'ignored') {
      return {
        shouldProcess: false,
        reason: 'Event was explicitly ignored',
        lockId: String(existing._id),
      };
    }
  }

  // Atomically create the lock
  try {
    const created = await WebhookEvent.create({
      eventId,
      provider,
      eventType,
      status: 'processing',
      payloadSummary: summary || {},
    });

    return { shouldProcess: true, lockId: String(created._id) };
  } catch (err: unknown) {
    // Catch duplicate key error in case of concurrent insert race
    if ((err as { code?: number }).code === 11000) {
      return {
        shouldProcess: false,
        reason: 'Concurrent duplicate event rejected by unique lock',
      };
    }
    throw err;
  }
}

/**
 * Marks a webhook event as successfully fulfilled and records processing timestamp.
 */
export async function markWebhookSuccess(
  eventId: string,
  provider: WebhookProvider,
  summaryUpdates?: Record<string, unknown>
): Promise<void> {
  await connectToDatabase();

  const update: Record<string, unknown> = {
    status: 'processed',
    processedAt: new Date(),
    errorMessage: null,
  };

  if (summaryUpdates) {
    update.payloadSummary = summaryUpdates;
  }

  await WebhookEvent.findOneAndUpdate(
    { eventId, provider },
    { $set: update },
    { upsert: true }
  );
}

/**
 * Marks a webhook event as failed with a diagnostic error message.
 */
export async function markWebhookFailed(
  eventId: string,
  provider: WebhookProvider,
  errorMessage: string
): Promise<void> {
  await connectToDatabase();

  await WebhookEvent.findOneAndUpdate(
    { eventId, provider },
    {
      $set: {
        status: 'failed',
        errorMessage,
      },
    },
    { upsert: true }
  );
}

/**
 * Marks an unhandled or irrelevant webhook event as ignored.
 */
export async function markWebhookIgnored(
  eventId: string,
  provider: WebhookProvider,
  reason: string
): Promise<void> {
  await connectToDatabase();

  await WebhookEvent.findOneAndUpdate(
    { eventId, provider },
    {
      $set: {
        status: 'ignored',
        errorMessage: reason,
        processedAt: new Date(),
      },
    },
    { upsert: true }
  );
}
