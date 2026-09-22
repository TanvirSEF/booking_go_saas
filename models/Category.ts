import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface ICategory {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  description?: string;
  order?: number;
  isActive?: boolean;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategoryDocument extends ICategory, Document {}

const CategorySchema = new Schema<ICategoryDocument>(
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
    },
    description: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    icon: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

CategorySchema.index({ businessId: 1, order: 1 });
CategorySchema.index({ businessId: 1, name: 1 });

export const Category: Model<ICategoryDocument> =
  (mongoose.models.Category as Model<ICategoryDocument>) ||
  mongoose.model<ICategoryDocument>('Category', CategorySchema);

export default Category;
