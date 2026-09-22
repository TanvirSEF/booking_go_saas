import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  isManual: boolean;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExchangeRateDocument extends IExchangeRate, Document {}

const ExchangeRateSchema = new Schema<IExchangeRateDocument>(
  {
    baseCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    targetCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0.00000001,
    },
    isManual: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ExchangeRateSchema.index({ baseCurrency: 1, targetCurrency: 1 }, { unique: true });
ExchangeRateSchema.index({ targetCurrency: 1 });

export const ExchangeRate: Model<IExchangeRateDocument> =
  (mongoose.models.ExchangeRate as Model<IExchangeRateDocument>) ||
  mongoose.model<IExchangeRateDocument>('ExchangeRate', ExchangeRateSchema);

export default ExchangeRate;
