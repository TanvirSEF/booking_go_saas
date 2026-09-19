import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type LanguageDirection = 'ltr' | 'rtl';

export interface ILanguage {
  code: string;
  name: string;
  direction: LanguageDirection;
  status: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILanguageDocument extends ILanguage, Document {}

const LanguageSchema = new Schema<ILanguageDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    direction: {
      type: String,
      enum: ['ltr', 'rtl'],
      default: 'ltr',
    },
    status: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Language: Model<ILanguageDocument> =
  (mongoose.models.Language as Model<ILanguageDocument>) ||
  mongoose.model<ILanguageDocument>('Language', LanguageSchema);

export default Language;
