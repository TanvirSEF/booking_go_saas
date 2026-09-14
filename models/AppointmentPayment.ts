import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type PaymentRecordStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface IAppointmentPayment {
  appointmentId: Types.ObjectId;
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  paymentType: string;
  amount: number;
  discountAmount: number;
  couponAmount: number;
  taxAmount: number;
  finalAmount: number;
  promoCodeId?: Types.ObjectId;
  paymentDate: Date;
  txnId?: string;
  receiptUrl?: string;
  status: PaymentRecordStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAppointmentPaymentDocument extends IAppointmentPayment, Document {}

const AppointmentPaymentSchema = new Schema<IAppointmentPaymentDocument>(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
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
    paymentType: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    couponAmount: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    promoCodeId: {
      type: Schema.Types.ObjectId,
      sparse: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    txnId: {
      type: String,
      default: '',
      trim: true,
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

AppointmentPaymentSchema.index({ businessId: 1, paymentDate: -1 });
AppointmentPaymentSchema.index({ companyId: 1, createdAt: -1 });

export const AppointmentPayment: Model<IAppointmentPaymentDocument> =
  (mongoose.models.AppointmentPayment as Model<IAppointmentPaymentDocument>) ||
  mongoose.model<IAppointmentPaymentDocument>('AppointmentPayment', AppointmentPaymentSchema);

export default AppointmentPayment;
