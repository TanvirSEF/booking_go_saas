import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type WebhookProvider = 'stripe' | 'paypal' | 'manual';
export type WebhookEventStatus = 'processing' | 'processed' | 'failed' | 'ignored';

export interface IWebhookEvent {
  eventId: string;
  provider: WebhookProvider;
  eventType: string;
  status: WebhookEventStatus;
  payloadSummary?: Record<string, unknown>;
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebhookEventDocument extends IWebhookEvent, Document {}

const WebhookEventSchema = new Schema<IWebhookEventDocument>(
  {
    eventId: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'paypal', 'manual'],
      required: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['processing', 'processed', 'failed', 'ignored'],
      default: 'processing',
      index: true,
    },
    payloadSummary: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    errorMessage: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

WebhookEventSchema.index({ eventId: 1, provider: 1 }, { unique: true });
WebhookEventSchema.index({ provider: 1, createdAt: -1 });

export const WebhookEvent: Model<IWebhookEventDocument> =
  (mongoose.models.WebhookEvent as Model<IWebhookEventDocument>) ||
  mongoose.model<IWebhookEventDocument>('WebhookEvent', WebhookEventSchema);

export default WebhookEvent;
