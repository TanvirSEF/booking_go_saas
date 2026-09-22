import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type FormLayoutType = 'form-layout' | 'theme';
export type DayName =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface IBreakHour {
  start: string;
  end: string;
}

export interface IBusinessHour {
  dayName: DayName;
  isOpen: boolean;
  startTime: string;
  endTime: string;
  breakHours: IBreakHour[];
}

export interface IBusinessHoliday {
  date: string;
  description?: string;
}

export interface IBusinessSeo {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  metaImage?: string;
  canonicalUrl?: string;
  ogType?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
}

export interface IBusiness {
  companyId: Types.ObjectId;
  name: string;
  slug: string;
  formType: FormLayoutType;
  layout: string;
  themeColor: string;
  logoDark?: string;
  logoLight?: string;
  currency: string;
  currencySymbol: string;
  appointmentPrefix: string;
  maximumSlot: number;
  appointmentReminderHours: number;
  timeInterval?: number;
  minimumNoticeHours?: number;
  maxAdvanceBookingDays?: number;
  domain?: string;
  businessHours: IBusinessHour[];
  holidays: IBusinessHoliday[];
  settings: Record<string, string>;
  seo?: IBusinessSeo;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBusinessDocument extends IBusiness, Document {}

const BreakHourSchema = new Schema<IBreakHour>(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false }
);

const BusinessHourSchema = new Schema<IBusinessHour>(
  {
    dayName: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    isOpen: { type: Boolean, default: true },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '18:00' },
    breakHours: [BreakHourSchema],
  },
  { _id: false }
);

const BusinessHolidaySchema = new Schema<IBusinessHoliday>(
  {
    date: { type: String, required: true },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const BusinessSeoSchema = new Schema<IBusinessSeo>(
  {
    metaTitle: { type: String, trim: true, default: '' },
    metaDescription: { type: String, trim: true, default: '' },
    metaKeywords: { type: String, trim: true, default: '' },
    metaImage: { type: String, trim: true, default: '' },
    canonicalUrl: { type: String, trim: true, default: '' },
    ogType: { type: String, trim: true, default: 'website' },
    twitterCard: {
      type: String,
      enum: ['summary', 'summary_large_image'],
      default: 'summary_large_image',
    },
    noIndex: { type: Boolean, default: false },
  },
  { _id: false }
);

const BusinessSchema = new Schema<IBusinessDocument>(
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
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    formType: {
      type: String,
      enum: ['form-layout', 'theme'],
      default: 'form-layout',
    },
    layout: {
      type: String,
      default: 'Formlayout1',
    },
    themeColor: {
      type: String,
      default: 'color1-Formlayout1',
    },
    logoDark: { type: String },
    logoLight: { type: String },
    currency: { type: String, default: 'USD' },
    currencySymbol: { type: String, default: '$' },
    appointmentPrefix: { type: String, default: '#APP000' },
    maximumSlot: { type: Number, default: 1 },
    appointmentReminderHours: { type: Number, default: 24 },
    timeInterval: { type: Number, default: 0 },
    minimumNoticeHours: { type: Number, default: 1 },
    maxAdvanceBookingDays: { type: Number, default: 90 },
    domain: { type: String, trim: true },
    businessHours: {
      type: [BusinessHourSchema],
      default: () => [
        { dayName: 'Monday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
        { dayName: 'Tuesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
        { dayName: 'Wednesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
        { dayName: 'Thursday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
        { dayName: 'Friday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
        { dayName: 'Saturday', isOpen: false, startTime: '09:00', endTime: '18:00', breakHours: [] },
        { dayName: 'Sunday', isOpen: false, startTime: '09:00', endTime: '18:00', breakHours: [] },
      ],
    },
    holidays: {
      type: [BusinessHolidaySchema],
      default: [],
    },
    settings: {
      type: Map,
      of: String,
      default: {},
    },
    seo: {
      type: BusinessSeoSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

export const Business: Model<IBusinessDocument> =
  (mongoose.models.Business as Model<IBusinessDocument>) ||
  mongoose.model<IBusinessDocument>('Business', BusinessSchema);

export default Business;
