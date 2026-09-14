import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IUserCoupon {
  userId: Types.ObjectId;
  couponId: Types.ObjectId;
  orderId?: Types.ObjectId;
  usedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCouponDocument extends IUserCoupon, Document {}

const UserCouponSchema = new Schema<IUserCouponDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      sparse: true,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

UserCouponSchema.index({ userId: 1, couponId: 1 });

export const UserCoupon: Model<IUserCouponDocument> =
  (mongoose.models.UserCoupon as Model<IUserCouponDocument>) ||
  mongoose.model<IUserCouponDocument>('UserCoupon', UserCouponSchema);

export default UserCoupon;
