import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type CustomerType = 'new-user' | 'existing-user' | 'guest-user';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export const APPOINTMENT_STATUS_COLORS: string[] = [
  '#21c9b0', '#f04c43', '#fa9c30', '#a969ba', '#0080b6',
  '#27a93d', '#df3e9d', '#5c6bc0', '#f6c436',
];

export interface IAppointment {
  appointmentNumber: string;
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  customerId?: Types.ObjectId;
  customerType: CustomerType;
  name: string;
  email: string;
  contact: string;
  locationId: Types.ObjectId;
  serviceId: Types.ObjectId;
  staffId: Types.ObjectId;
  date: string;
  time: string;
  durationMinutes: number;
  price: number;
  notes?: string;
  paymentType: string;
  paymentStatus: PaymentStatus;
  appointmentStatus: string;
  statusColor: string;
  attachment?: string;
  customFields?: Record<string, unknown>;
  flexibleHourId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAppointmentDocument extends IAppointment, Document {}

const AppointmentSchema = new Schema<IAppointmentDocument>(
  {
    appointmentNumber: {
      type: String,
      required: true,
      trim: true,
    },
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
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      sparse: true,
      index: true,
    },
    customerType: {
      type: String,
      enum: ['new-user', 'existing-user', 'guest-user'],
      default: 'guest-user',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    time: {
      type: String,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 30,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    paymentType: {
      type: String,
      default: 'Manually',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
      index: true,
    },
    appointmentStatus: {
      type: String,
      default: 'Pending',
      index: true,
    },
    statusColor: {
      type: String,
      default: '#21c9b0',
    },
    attachment: {
      type: String,
      default: '',
    },
    customFields: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    flexibleHourId: {
      type: Schema.Types.ObjectId,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

AppointmentSchema.index({ businessId: 1, date: 1, staffId: 1 });
AppointmentSchema.index({ businessId: 1, appointmentNumber: 1 }, { unique: true });
AppointmentSchema.index({ businessId: 1, date: 1 });
AppointmentSchema.index({ companyId: 1, createdAt: -1 });

export const Appointment: Model<IAppointmentDocument> =
  (mongoose.models.Appointment as Model<IAppointmentDocument>) ||
  mongoose.model<IAppointmentDocument>('Appointment', AppointmentSchema);

export default Appointment;
