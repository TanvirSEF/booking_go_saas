import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'date'
  | 'select'
  | 'textarea'
  | 'radio'
  | 'checkbox';

export interface ICustomField {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  label: string;
  type: CustomFieldType;
  options: string[];
  placeholder?: string;
  defaultValue?: string;
  isRequired: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomFieldDocument extends ICustomField, Document {}

const CustomFieldSchema = new Schema<ICustomFieldDocument>(
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
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'number', 'email', 'date', 'select', 'textarea', 'radio', 'checkbox'],
      default: 'text',
      required: true,
    },
    options: {
      type: [String],
      default: [],
    },
    placeholder: {
      type: String,
      default: '',
    },
    defaultValue: {
      type: String,
      default: '',
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

CustomFieldSchema.index({ businessId: 1, label: 1 });

export const CustomField: Model<ICustomFieldDocument> =
  (mongoose.models.CustomField as Model<ICustomFieldDocument>) ||
  mongoose.model<ICustomFieldDocument>('CustomField', CustomFieldSchema);

export default CustomField;
