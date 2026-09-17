import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface ITestimonial {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  title?: string;
  rating: number;
  description: string;
  image?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestimonialDocument extends ITestimonial, Document {}

const TestimonialSchema = new Schema<ITestimonialDocument>(
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
    title: {
      type: String,
      default: '',
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 5,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

TestimonialSchema.index({ businessId: 1, isActive: 1, order: 1 });
TestimonialSchema.index({ companyId: 1, createdAt: -1 });

export const Testimonial: Model<ITestimonialDocument> =
  (mongoose.models.Testimonial as Model<ITestimonialDocument>) ||
  mongoose.model<ITestimonialDocument>('Testimonial', TestimonialSchema);

export default Testimonial;
