import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type CouponDiscountType = 'percentage' | 'flat';

export interface ICoupon {
  name: string;
  code: string;
  discountType: CouponDiscountType;
  discount: number;
  limit: number;
  usedCount: number;
  minimumSpend: number;
  maximumSpend?: number;
  expiryDate?: Date;
  maxUsagePerUser?: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICouponDocument extends ICoupon, Document {}

const CouponSchema = new Schema<ICouponDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      default: 'percentage',
      required: true,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
    },
    limit: {
      type: Number,
      default: 0,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    maxUsagePerUser: {
      type: Number,
      default: 1,
    },
    minimumSpend: {
      type: Number,
      default: 0,
    },
    maximumSpend: {
      type: Number,
      default: 0,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CouponSchema.index({ code: 1, isActive: 1 });

export const Coupon: Model<ICouponDocument> =
  (mongoose.models.Coupon as Model<ICouponDocument>) ||
  mongoose.model<ICouponDocument>('Coupon', CouponSchema);

export default Coupon;
