import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type OrderBillingCycle = 'monthly' | 'yearly';
export type OrderPaymentStatus = 'succeeded' | 'pending' | 'failed' | 'Approved' | 'Rejected';

export interface IOrder {
  orderNumber: string;
  companyId: Types.ObjectId;
  planId: Types.ObjectId;
  planName: string;
  billingCycle: OrderBillingCycle;
  price: number;
  discountAmount: number;
  currency: string;
  paymentType: string;
  paymentStatus: OrderPaymentStatus;
  txnId?: string;
  receiptUrl?: string;
  couponCode?: string;
  cardNumber?: string;
  cardExpMonth?: string;
  cardExpYear?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderDocument extends IOrder, Document {}

const OrderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    planName: {
      type: String,
      required: true,
      trim: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    paymentType: {
      type: String,
      default: 'Manually',
    },
    paymentStatus: {
      type: String,
      enum: ['succeeded', 'pending', 'failed', 'Approved', 'Rejected'],
      default: 'pending',
      index: true,
    },
    txnId: {
      type: String,
      default: '',
      trim: true,
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    couponCode: {
      type: String,
      default: '',
      trim: true,
    },
    cardNumber: {
      type: String,
      default: '',
    },
    cardExpMonth: {
      type: String,
      default: '',
    },
    cardExpYear: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ companyId: 1, createdAt: -1 });

export const Order: Model<IOrderDocument> =
  (mongoose.models.Order as Model<IOrderDocument>) ||
  mongoose.model<IOrderDocument>('Order', OrderSchema);

export default Order;
