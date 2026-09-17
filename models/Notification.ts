import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type NotificationType =
  | 'appointment_created'
  | 'appointment_status_changed'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'payment_received'
  | 'inquiry_received'
  | 'subscriber_joined'
  | 'system_alert';

export interface INotification {
  recipientId: Types.ObjectId;
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationDocument extends INotification, Document {}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'appointment_created',
        'appointment_status_changed',
        'appointment_cancelled',
        'appointment_reminder',
        'payment_received',
        'inquiry_received',
        'subscriber_joined',
        'system_alert',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// High-performance query indexes
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ businessId: 1, createdAt: -1 });
NotificationSchema.index({ companyId: 1, createdAt: -1 });

export const Notification: Model<INotificationDocument> =
  (mongoose.models.Notification as Model<INotificationDocument>) ||
  mongoose.model<INotificationDocument>('Notification', NotificationSchema);

export default Notification;
