import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface ICustomer {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  userId?: Types.ObjectId;
  name: string;
  email: string;
  contact: string;
  gender?: 'male' | 'female' | 'other' | string;
  dob?: string;
  description?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerDocument extends ICustomer, Document {}

const CustomerSchema = new Schema<ICustomerDocument>(
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: '',
    },
    dob: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

CustomerSchema.index({ businessId: 1, email: 1 });

export const Customer: Model<ICustomerDocument> =
  (mongoose.models.Customer as Model<ICustomerDocument>) ||
  mongoose.model<ICustomerDocument>('Customer', CustomerSchema);

export default Customer;
