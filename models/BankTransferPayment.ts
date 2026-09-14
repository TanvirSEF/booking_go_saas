import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type BankTransferStatus = 'Pending' | 'Approved' | 'Rejected';

export interface IBankTransferPayment {
  orderId: Types.ObjectId;
  companyId: Types.ObjectId;
  price: number;
  currency: string;
  attachment: string;
  status: BankTransferStatus;
  notes?: string;
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
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    attachment: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

BankTransferPaymentSchema.index({ companyId: 1, createdAt: -1 });

export const BankTransferPayment: Model<IBankTransferPaymentDocument> =
  (mongoose.models.BankTransferPayment as Model<IBankTransferPaymentDocument>) ||
  mongoose.model<IBankTransferPaymentDocument>('BankTransferPayment', BankTransferPaymentSchema);

export default BankTransferPayment;
