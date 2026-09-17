import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type SubscriberStatus = 'active' | 'unsubscribed';

export interface ISubscribe {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  email: string;
  theme: string;
  source: string;
  status: SubscriberStatus;
  unsubscribedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscribeDocument extends ISubscribe, Document {}

const SubscribeSchema = new Schema<ISubscribeDocument>(
  {
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
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
    },
    theme: {
      type: String,
      default: 'default',
      trim: true,
    },
    source: {
      type: String,
      default: 'footer',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'unsubscribed'],
      default: 'active',
      index: true,
    },
    unsubscribedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

SubscribeSchema.index({ businessId: 1, email: 1 }, { unique: true });
SubscribeSchema.index({ businessId: 1, status: 1, createdAt: -1 });
SubscribeSchema.index({ companyId: 1, createdAt: -1 });

export const Subscribe: Model<ISubscribeDocument> =
  (mongoose.models.Subscribe as Model<ISubscribeDocument>) ||
  mongoose.model<ISubscribeDocument>('Subscribe', SubscribeSchema);

export default Subscribe;
