'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Notification } from '@/models/Notification';
import type {
  NotificationDTO,
  NotificationFilterParams,
  PaginatedNotificationsResult,
  NotificationActionResponse,
} from '@/types/notification';

async function resolveAuthUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();
  return new Types.ObjectId(session.user.id);
}

/**
 * Retrieves paginated in-app notifications for the logged-in user.
 */
export async function getNotificationsAction(
  params: NotificationFilterParams = {}
): Promise<NotificationActionResponse<PaginatedNotificationsResult>> {
  try {
    const userId = await resolveAuthUser();

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { recipientId: userId };
    if (params.filter === 'unread') {
      query.isRead = false;
    }

    const [items, totalFiltered, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipientId: userId, isRead: false }),
    ]);

    const notifications: NotificationDTO[] = items.map((doc) => ({
      id: String(doc._id),
      type: doc.type,
      title: doc.title,
      message: doc.message,
      link: doc.link || '',
      isRead: doc.isRead,
      readAt: doc.readAt ? doc.readAt.toISOString() : undefined,
      createdAt: doc.createdAt.toISOString(),
      metadata: doc.metadata as Record<string, unknown> | undefined,
    }));

    return {
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages: Math.ceil(totalFiltered / limit) || 1,
        },
        unreadCount,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve notifications.';
    return { success: false, error: message };
  }
}

/**
 * Ultra-lightweight endpoint returning unread notifications count for header bell badge polling.
 */
export async function getUnreadNotificationCountAction(): Promise<
  NotificationActionResponse<{ unreadCount: number }>
> {
  try {
    const userId = await resolveAuthUser();

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    return {
      success: true,
      data: { unreadCount },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve unread count.';
    return { success: false, error: message };
  }
}

/**
 * Marks an individual notification as read.
 */
export async function markNotificationAsReadAction(
  id: string
): Promise<NotificationActionResponse> {
  try {
    const userId = await resolveAuthUser();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid notification ID format.' };
    }

    const result = await Notification.updateOne(
      {
        _id: new Types.ObjectId(id),
        recipientId: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return { success: true, message: 'Notification already marked as read.' };
    }

    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Notification marked as read.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark notification as read.';
    return { success: false, error: message };
  }
}

/**
 * Marks all unread notifications for the user as read.
 */
export async function markAllNotificationsAsReadAction(): Promise<
  NotificationActionResponse<{ updatedCount: number }>
> {
  try {
    const userId = await resolveAuthUser();

    const result = await Notification.updateMany(
      {
        recipientId: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'All notifications marked as read.',
      data: { updatedCount: result.modifiedCount },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark all as read.';
    return { success: false, error: message };
  }
}

/**
 * Deletes an individual notification.
 */
export async function deleteNotificationAction(
  id: string
): Promise<NotificationActionResponse> {
  try {
    const userId = await resolveAuthUser();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid notification ID format.' };
    }

    const result = await Notification.deleteOne({
      _id: new Types.ObjectId(id),
      recipientId: userId,
    });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Notification not found or already removed.' };
    }

    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Notification deleted.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete notification.';
    return { success: false, error: message };
  }
}

/**
 * Clears all read notifications for the current user.
 */
export async function clearAllReadNotificationsAction(): Promise<
  NotificationActionResponse<{ deletedCount: number }>
> {
  try {
    const userId = await resolveAuthUser();

    const result = await Notification.deleteMany({
      recipientId: userId,
      isRead: true,
    });

    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Cleared ${result.deletedCount} read notifications.`,
      data: { deletedCount: result.deletedCount },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear read notifications.';
    return { success: false, error: message };
  }
}
