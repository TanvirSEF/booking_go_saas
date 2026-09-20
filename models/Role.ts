import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IRole {
  companyId: Types.ObjectId;
  name: string;
  description?: string;
  permissions: string[];
  isDefault: boolean;
  systemKey?: 'manager' | 'receptionist' | 'staff' | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoleDocument extends IRole, Document {}

const RoleSchema = new Schema<IRoleDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
      trim: true,
    },
    permissions: [
      {
        type: String,
        trim: true,
      },
    ],
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    systemKey: {
      type: String,
      enum: ['manager', 'receptionist', 'staff', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate role names per company
RoleSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const Role: Model<IRoleDocument> =
  (mongoose.models.Role as Model<IRoleDocument>) ||
  mongoose.model<IRoleDocument>('Role', RoleSchema);

export default Role;
