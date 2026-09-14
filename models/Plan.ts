import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IPlan {
  name: string;
  packagePriceMonthly: number;
  packagePriceYearly: number;
  pricePerUserMonthly: number;
  pricePerUserYearly: number;
  pricePerBusinessMonthly: number;
  pricePerBusinessYearly: number;
  maxUsers: number;
  maxBusinesses: number;
  maxLocations: number;
  maxServices: number;
  storageLimitMb: number;
  modules: string[];
  isCustomPlan: boolean;
  isFreePlan: boolean;
  hasTrial: boolean;
  trialDays: number;
  isEnabled: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlanDocument extends IPlan, Document {}

const PlanSchema = new Schema<IPlanDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    packagePriceMonthly: {
      type: Number,
      required: true,
      default: 0,
    },
    packagePriceYearly: {
      type: Number,
      required: true,
      default: 0,
    },
    pricePerUserMonthly: {
      type: Number,
      default: 0,
    },
    pricePerUserYearly: {
      type: Number,
      default: 0,
    },
    pricePerBusinessMonthly: {
      type: Number,
      default: 0,
    },
    pricePerBusinessYearly: {
      type: Number,
      default: 0,
    },
    maxUsers: {
      type: Number,
      default: 5,
    },
    maxBusinesses: {
      type: Number,
      default: 5,
    },
    maxLocations: {
      type: Number,
      default: -1,
    },
    maxServices: {
      type: Number,
      default: -1,
    },
    storageLimitMb: {
      type: Number,
      default: 1024,
    },
    modules: {
      type: [String],
      default: [],
    },
    isCustomPlan: {
      type: Boolean,
      default: false,
    },
    isFreePlan: {
      type: Boolean,
      default: false,
    },
    hasTrial: {
      type: Boolean,
      default: false,
    },
    trialDays: {
      type: Number,
      default: 0,
    },
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Plan: Model<IPlanDocument> =
  (mongoose.models.Plan as Model<IPlanDocument>) ||
  mongoose.model<IPlanDocument>('Plan', PlanSchema);

export default Plan;
