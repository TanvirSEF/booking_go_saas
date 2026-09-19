import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type BankTransferStatus = 'Pending' | 'Approved' | 'Rejected';
export type BankTransferType = 'plan' | 'appointment';

export interface IBankTransferPayment {
  orderId: Types.ObjectId;
  companyId: Types.ObjectId;
  businessId?: Types.ObjectId | null;
  userId?: Types.ObjectId | null;
  type: BankTransferType;
  planId?: Types.ObjectId | null;
  appointmentId?: Types.ObjectId | null;
  billingCycle?: 'monthly' | 'yearly';
  price: number;
  currency: string;
  attachment: string;
  status: BankTransferStatus;
  transactionRef?: string;
  notes?: string;
  rejectionReason?: string;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBankTransferPaymentDocument extends IBankTransferPayment, Document {}

const BankTransferPaymentSchema = new Schema<IBankTransferPaymentDocument>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
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
      default: null,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['plan', 'appointment'],
      default: 'plan',
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      index: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    attachment: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    transactionRef: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Query indexes
BankTransferPaymentSchema.index({ companyId: 1, createdAt: -1 });
BankTransferPaymentSchema.index({ type: 1, status: 1, createdAt: -1 });

export const BankTransferPayment: Model<IBankTransferPaymentDocument> =
  (mongoose.models.BankTransferPayment as Model<IBankTransferPaymentDocument>) ||
  mongoose.model<IBankTransferPaymentDocument>('BankTransferPayment', BankTransferPaymentSchema);

export default BankTransferPayment;
