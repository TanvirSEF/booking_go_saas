import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IService {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  image?: string;
  price: number;
  durationMinutes: number;
  bufferMinutes?: number;
  description?: string;
  isFree: boolean;
  onlineMeetingType?: 'none' | 'zoom' | 'google_meet';
  onlineMeetingUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IServiceDocument extends IService, Document {}

const ServiceSchema = new Schema<IServiceDocument>(
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
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      default: 0,
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 30,
    },
    bufferMinutes: {
      type: Number,
    },
    description: {
      type: String,
      default: '',
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    onlineMeetingType: {
      type: String,
      enum: ['none', 'zoom', 'google_meet'],
      default: 'none',
    },
    onlineMeetingUrl: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Service: Model<IServiceDocument> =
  (mongoose.models.Service as Model<IServiceDocument>) ||
  mongoose.model<IServiceDocument>('Service', ServiceSchema);

export default Service;
