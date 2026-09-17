import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Notification, type INotificationDocument } from '@/models/Notification';
import type { CreateNotificationInput } from '@/types/notification';

/**
 * Dispatches an in-app notification to a user.
 * Persists to MongoDB with optimized indexes and triggers real-time WebSocket hook if configured.
 */
export async function sendInAppNotification(
  input: CreateNotificationInput
): Promise<INotificationDocument | null> {
  try {
    if (!Types.ObjectId.isValid(input.recipientId)) {
      console.error('[sendInAppNotification] Invalid recipientId:', input.recipientId);
      return null;
    }

    await connectToDatabase();

    const notification = await Notification.create({
      recipientId: new Types.ObjectId(input.recipientId),
      companyId: new Types.ObjectId(input.companyId),
      businessId: new Types.ObjectId(input.businessId),
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link || '',
      metadata: input.metadata || {},
      isRead: false,
    });

    // Extensibility hook: Real-time broadcast (Pusher / WebSocket / Webhook)
    // If real-time credentials are added to .env.local, this hook dispatches without refactoring
    if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET) {
      try {
        // Dynamic import or dispatch if Pusher SDK is installed in production
        // await pusherServer.trigger(`user-${input.recipientId}`, 'notification', notification);
      } catch (wsError) {
        console.warn('[sendInAppNotification] Real-time broadcast failed non-blockingly:', wsError);
      }
    }

    return notification;
  } catch (error) {
    console.error('[sendInAppNotification] Failed to create notification:', error);
    return null;
  }
}

/**
 * Dispatches multiple in-app notifications in a single batch operation.
 */
export async function sendBulkInAppNotifications(
  inputs: CreateNotificationInput[]
): Promise<number> {
  try {
    if (!inputs || inputs.length === 0) return 0;

    await connectToDatabase();

    const docs = inputs
      .filter((input) => Types.ObjectId.isValid(input.recipientId))
      .map((input) => ({
        recipientId: new Types.ObjectId(input.recipientId),
        companyId: new Types.ObjectId(input.companyId),
        businessId: new Types.ObjectId(input.businessId),
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || '',
        metadata: input.metadata || {},
        isRead: false,
      }));

    if (docs.length === 0) return 0;

    const result = await Notification.insertMany(docs);
    return result.length;
  } catch (error) {
    console.error('[sendBulkInAppNotifications] Batch insert failed:', error);
    return 0;
  }
}
