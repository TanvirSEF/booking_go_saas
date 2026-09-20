import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type UserRole = 'super admin' | 'company' | 'staff' | 'customer';

export interface IUser {
  name: string;
  email: string;
  password?: string;
  mobileNo?: string;
  role: UserRole;
  roleId?: Types.ObjectId;
  companyId?: Types.ObjectId;
  activeBusinessId?: Types.ObjectId;
  avatar?: string;
  lang: string;
  darkMode: boolean;
  isActive: boolean;
  emailVerifiedAt?: Date;
  activePlanId?: Types.ObjectId;
  billingType?: 'monthly' | 'yearly';
  planExpireDate?: Date;
  trialExpireDate?: Date;
  isTrialDone?: boolean;
  totalBusiness?: number;
  totalUser?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: false,
    },
    mobileNo: {
      type: String,
      required: false,
      trim: true,
    },
    role: {
      type: String,
      enum: ['super admin', 'company', 'staff', 'customer'],
      default: 'customer',
      index: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    activeBusinessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
    },
    avatar: {
      type: String,
      default: 'uploads/users-avatar/avatar.png',
    },
    lang: {
      type: String,
      default: 'en',
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    activePlanId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      sparse: true,
    },
    billingType: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    planExpireDate: {
      type: Date,
      default: null,
    },
    trialExpireDate: {
      type: Date,
      default: null,
    },
    isTrialDone: {
      type: Boolean,
      default: false,
    },
    totalBusiness: {
      type: Number,
      default: 0,
    },
    totalUser: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>('User', UserSchema);

export default User;
