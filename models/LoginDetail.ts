import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { DeviceType } from '@/lib/user-agent';
import type { UserRole } from '@/models/User';

export type LoginStatus = 'success' | 'failed';

export interface ILoginDetail {
  userId: Types.ObjectId;
  companyId?: Types.ObjectId | null;
  businessId?: Types.ObjectId | null;
  role: UserRole;
  ip: string;
  userAgent?: string;
  browser: string;
  os: string;
  deviceType: DeviceType;
  country?: string;
  city?: string;
  status: LoginStatus;
  loginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoginDetailDocument extends ILoginDetail, Document {}

const LoginDetailSchema = new Schema<ILoginDetailDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ['super admin', 'company', 'staff', 'customer'],
      required: true,
      index: true,
    },
    ip: {
      type: String,
      required: true,
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
    browser: {
      type: String,
      default: 'Unknown Browser',
      trim: true,
    },
    os: {
      type: String,
      default: 'Unknown OS',
      trim: true,
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'bot', 'unknown'],
      default: 'desktop',
    },
    country: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success',
      index: true,
    },
    loginAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance audit log indexes
LoginDetailSchema.index({ userId: 1, loginAt: -1 });
LoginDetailSchema.index({ companyId: 1, loginAt: -1 });
LoginDetailSchema.index({ role: 1, loginAt: -1 });
LoginDetailSchema.index({ businessId: 1, loginAt: -1 });

export const LoginDetail: Model<ILoginDetailDocument> =
  (mongoose.models.LoginDetail as Model<ILoginDetailDocument>) ||
  mongoose.model<ILoginDetailDocument>('LoginDetail', LoginDetailSchema);

export default LoginDetail;
