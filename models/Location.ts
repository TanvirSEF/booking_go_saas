import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface ILocation {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  image?: string;
  phone?: string;
  address?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILocationDocument extends ILocation, Document {}

const LocationSchema = new Schema<ILocationDocument>(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
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

export const Location: Model<ILocationDocument> =
  (mongoose.models.Location as Model<ILocationDocument>) ||
  mongoose.model<ILocationDocument>('Location', LocationSchema);

export default Location;
