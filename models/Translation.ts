import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface ITranslation {
  languageCode: string;
  group: string;
  key: string;
  value: string;
  companyId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITranslationDocument extends ITranslation, Document {}

const TranslationSchema = new Schema<ITranslationDocument>(
  {
    languageCode: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    group: {
      type: String,
      required: true,
      default: 'general',
      trim: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      default: '',
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring no duplicate keys per language, group, and tenant scope
TranslationSchema.index({ languageCode: 1, group: 1, key: 1, companyId: 1 }, { unique: true });

export const Translation: Model<ITranslationDocument> =
  (mongoose.models.Translation as Model<ITranslationDocument>) ||
  mongoose.model<ITranslationDocument>('Translation', TranslationSchema);

export default Translation;
