import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export const STAFF_DEFAULT_COLORS: string[] = [
  '#CEEDC1', '#FFEDD2', '#B4E4CD', '#C1E6F9', '#FFF5C1',
  '#C3DEFB', '#F9D2FF', '#B6EDEF', '#FFCDB2', '#C1CBFF',
  '#FFD8D8', '#C9D6DE', '#D6C9F2', '#DAD4B5', '#CDE8E5',
];

export interface IStaff {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  roleId?: Types.ObjectId;
  customPermissions?: string[];
  locationIds: Types.ObjectId[];
  serviceIds: Types.ObjectId[];
  description?: string;
  colorCode: string;
  isActive: boolean;
  calendarFeedToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaffDocument extends IStaff, Document {}

const StaffSchema = new Schema<IStaffDocument>(
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
      index: true,
    },
    customPermissions: [
      {
        type: String,
        trim: true,
      },
    ],
    locationIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Location',
      },
    ],
    serviceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    description: {
      type: String,
      default: '',
    },
    colorCode: {
      type: String,
      default: '#CEEDC1',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    calendarFeedToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

StaffSchema.index({ calendarFeedToken: 1 }, { unique: true, sparse: true });

export const Staff: Model<IStaffDocument> =
  (mongoose.models.Staff as Model<IStaffDocument>) ||
  mongoose.model<IStaffDocument>('Staff', StaffSchema);

export default Staff;
