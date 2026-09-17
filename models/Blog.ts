import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type BlogStatus = 'draft' | 'published' | 'archived';

export interface IBlog {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  authorId: Types.ObjectId;
  title: string;
  slug: string;
  summary: string;
  content: string;
  image?: string;
  category: string;
  tags: string[];
  status: BlogStatus;
  publishedAt: Date;
  theme: string;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBlogDocument extends IBlog, Document {}

const BlogSchema = new Schema<IBlogDocument>(
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
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
      maxlength: 350,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    theme: {
      type: String,
      default: 'default',
      trim: true,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance SEO & tenant compound indexes
BlogSchema.index({ businessId: 1, slug: 1 }, { unique: true });
BlogSchema.index({ businessId: 1, status: 1, publishedAt: -1 });
BlogSchema.index({ companyId: 1, createdAt: -1 });

export const Blog: Model<IBlogDocument> =
  (mongoose.models.Blog as Model<IBlogDocument>) ||
  mongoose.model<IBlogDocument>('Blog', BlogSchema);

export default Blog;
