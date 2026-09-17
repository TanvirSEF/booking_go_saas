import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type ContactInquiryStatus = 'new' | 'read' | 'replied' | 'archived';

export interface IContactUs {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  email: string;
  contact: string;
  subject: string;
  message: string;
  theme: string;
  status: ContactInquiryStatus;
  replyNotes?: string;
  repliedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContactUsDocument extends IContactUs, Document {}

const ContactUsSchema = new Schema<IContactUsDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    theme: {
      type: String,
      default: 'default',
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'archived'],
      default: 'new',
      index: true,
    },
    replyNotes: {
      type: String,
      default: '',
      trim: true,
    },
    repliedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

ContactUsSchema.index({ businessId: 1, status: 1, createdAt: -1 });
ContactUsSchema.index({ companyId: 1, createdAt: -1 });
ContactUsSchema.index({ businessId: 1, email: 1, createdAt: -1 });

export const ContactUs: Model<IContactUsDocument> =
  (mongoose.models.ContactUs as Model<IContactUsDocument>) ||
  mongoose.model<IContactUsDocument>('ContactUs', ContactUsSchema);

export default ContactUs;
