import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export const CUSTOM_STATUS_DEFAULT_ICONS: string[] = [
  'ti-loader',
  'ti-shield-check',
  'ti-check',
  'ti-circle-x',
  'ti-star',
  'ti-home',
  'ti-alert-circle',
  'ti-calendar-event',
  'ti-truck-delivery',
  'ti-ban',
  'ti-thumb-up',
];

export interface ICustomStatus {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  title: string;
  statusColor: string;
  icon: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomStatusDocument extends ICustomStatus, Document {}

const CustomStatusSchema = new Schema<ICustomStatusDocument>(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    statusColor: {
      type: String,
      default: '#21c9b0',
    },
    icon: {
      type: String,
      default: 'ti-loader',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

CustomStatusSchema.index({ businessId: 1, title: 1 });

export const CustomStatus: Model<ICustomStatusDocument> =
  (mongoose.models.CustomStatus as Model<ICustomStatusDocument>) ||
  mongoose.model<ICustomStatusDocument>('CustomStatus', CustomStatusSchema);

export default CustomStatus;
