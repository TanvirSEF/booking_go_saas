import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type SystemSettingGroup =
  | 'brand'
  | 'system'
  | 'stripe'
  | 'paypal'
  | 'bank_transfer'
  | 'email'
  | 'storage'
  | 'recaptcha'
  | 'auth';

export interface ISystemSetting {
  key: string;
  value: string;
  group: SystemSettingGroup;
  isPublic: boolean;
  isSensitive: boolean;
  description?: string;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISystemSettingDocument extends ISystemSetting, Document {}

const SystemSettingSchema = new Schema<ISystemSettingDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: String,
      default: '',
    },
    group: {
      type: String,
      required: true,
      enum: [
        'brand',
        'system',
        'stripe',
        'paypal',
        'bank_transfer',
        'email',
        'storage',
        'recaptcha',
        'auth',
      ],
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSensitive: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: '',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const SystemSetting: Model<ISystemSettingDocument> =
  (mongoose.models.SystemSetting as Model<ISystemSettingDocument>) ||
  mongoose.model<ISystemSettingDocument>('SystemSetting', SystemSettingSchema);

export default SystemSetting;
