import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IEmailTemplateTranslation {
  lang: string;
  subject: string;
  content: string;
}

export interface IEmailTemplate {
  name: string;
  slug: string;
  from: string;
  moduleName: string;
  companyId?: Types.ObjectId | null;
  businessId?: Types.ObjectId | null;
  variables: string[];
  translations: IEmailTemplateTranslation[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailTemplateDocument extends IEmailTemplate, Document {}

const EmailTemplateTranslationSchema = new Schema<IEmailTemplateTranslation>(
  {
    lang: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const EmailTemplateSchema = new Schema<IEmailTemplateDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    from: {
      type: String,
      required: true,
      default: 'BookingGo Notifications',
      trim: true,
    },
    moduleName: {
      type: String,
      default: 'General',
      trim: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      index: true,
    },
    variables: {
      type: [String],
      default: [],
    },
    translations: {
      type: [EmailTemplateTranslationSchema],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
EmailTemplateSchema.index({ slug: 1, companyId: 1, businessId: 1 }, { unique: true });
EmailTemplateSchema.index({ companyId: 1, isSystem: 1 });
EmailTemplateSchema.index({ name: 1 });

export const EmailTemplate: Model<IEmailTemplateDocument> =
  (mongoose.models.EmailTemplate as Model<IEmailTemplateDocument>) ||
  mongoose.model<IEmailTemplateDocument>('EmailTemplate', EmailTemplateSchema);

export default EmailTemplate;
