'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Appointment } from '@/models/Appointment';
import { AppointmentPayment } from '@/models/AppointmentPayment';
import '@/models/Service';
import '@/models/Staff';
import '@/models/Location';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import type {
  AdminAppointmentDTO,
  AppointmentFilterParams,
  AppointmentListResponse,
  VerifyBankSlipInput,
  AppointmentActionResponse,
} from '@/types/appointment-management';

const verifyBankSlipSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  decision: z.enum(['approve', 'reject']),
  adminNote: z.string().max(250, 'Admin note cannot exceed 250 characters').optional(),
});

async function resolveTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User account not found.');
  }

  const companyId =
    user.role === 'company'
      ? user._id
      : user.companyId
        ? new Types.ObjectId(user.companyId)
        : null;

  if (!companyId) {
    throw new Error('Company context could not be determined.');
  }

  let activeBusinessId = user.activeBusinessId;
  if (!activeBusinessId) {
    const defaultBusiness = await Business.findOne({ companyId }).lean();
    if (defaultBusiness) {
      activeBusinessId = defaultBusiness._id;
      await User.findByIdAndUpdate(user._id, { activeBusinessId: defaultBusiness._id });
    }
  }

  if (!activeBusinessId) {
    throw new Error('No active business found for this organization.');
  }

  return {
    userId: user._id,
    companyId,
    businessId: activeBusinessId,
  };
}

/**
 * Fetch paginated appointments with search, date-range, and status filters.
 */
export async function getCompanyAppointmentsAction(
  params: AppointmentFilterParams = {}
): Promise<AppointmentListResponse> {
  try {
    const { companyId, businessId } = await resolveTenantContext();

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      companyId,
      businessId,
    };

    if (params.status && params.status !== 'all') {
      query.appointmentStatus = params.status;
    }

    if (params.paymentStatus && params.paymentStatus !== 'all') {
      query.paymentStatus = params.paymentStatus;
    }

    if (params.staffId && params.staffId !== 'all') {
      query.staffId = new Types.ObjectId(params.staffId);
    }

    if (params.locationId && params.locationId !== 'all') {
      query.locationId = new Types.ObjectId(params.locationId);
    }

    if (params.date) {
      query.date = params.date;
    } else if (params.startDate && params.endDate) {
      query.date = { $gte: params.startDate, $lte: params.endDate };
    }

    if (params.search && params.search.trim()) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [
        { appointmentNumber: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
        { contact: searchRegex },
      ];
    }

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(query),
      Appointment.find(query)
        .populate<{ serviceId: { _id: Types.ObjectId; name: string; price: number; duration: number } }>('serviceId', 'name price duration')
        .populate<{ staffId: { _id: Types.ObjectId; name: string; colorCode: string } }>('staffId', 'name colorCode')
        .populate<{ locationId: { _id: Types.ObjectId; name: string } }>('locationId', 'name')
        .sort({ date: -1, time: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const appointmentIds = appointments.map((a) => a._id);
    const payments = await AppointmentPayment.find({
      appointmentId: { $in: appointmentIds },
    }).lean();

    const paymentMap = new Map<string, typeof payments[0]>();
    payments.forEach((p) => {
      paymentMap.set(String(p.appointmentId), p);
    });

    const data: AdminAppointmentDTO[] = appointments.map((doc) => {
      const service = doc.serviceId as unknown as { _id?: Types.ObjectId; name?: string; price?: number; duration?: number } | null;
      const staff = doc.staffId as unknown as { _id?: Types.ObjectId; name?: string; colorCode?: string } | null;
      const location = doc.locationId as unknown as { _id?: Types.ObjectId; name?: string } | null;
      const payment = paymentMap.get(String(doc._id));

      return {
        _id: String(doc._id),
        appointmentNumber: doc.appointmentNumber || '',
        businessId: String(doc.businessId),
        companyId: String(doc.companyId),
        customerId: doc.customerId ? String(doc.customerId) : undefined,
        customerType: doc.customerType || 'guest-user',
        name: doc.name || 'Guest',
        email: doc.email || '',
        contact: doc.contact || '',
        serviceId: service?._id ? String(service._id) : String(doc.serviceId || ''),
        serviceName: service?.name || 'Custom Service',
        servicePrice: service?.price || doc.price || 0,
        serviceDuration: service?.duration || doc.durationMinutes || 30,
        staffId: staff?._id ? String(staff._id) : String(doc.staffId || ''),
        staffName: staff?.name || 'Assigned Staff',
        staffColor: staff?.colorCode || '#CEEDC1',
        locationId: location?._id ? String(location._id) : String(doc.locationId || ''),
        locationName: location?.name || 'Main Location',
        date: doc.date,
        time: doc.time,
        paymentType: doc.paymentType || 'Cash',
        paymentStatus: doc.paymentStatus || 'unpaid',
        appointmentStatus: doc.appointmentStatus || 'Pending',
        statusColor: doc.statusColor,
        attachment: doc.attachment || '',
        notes: doc.notes || '',
        customFields: (doc.customFields as Record<string, unknown>) || {},
        createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
        paymentDetails: payment
          ? {
              amount: payment.amount,
              discountAmount: payment.discountAmount,
              finalAmount: payment.finalAmount,
              paymentDate: payment.paymentDate ? payment.paymentDate.toISOString() : undefined,
              status: payment.status,
            }
          : undefined,
      };
    });

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve appointments.';
    return { success: false, error: message };
  }
}

/**
 * Verify customer bank transfer deposit slip (Approve or Reject).
 */
export async function verifyBankTransferSlipAction(
  input: VerifyBankSlipInput
): Promise<AppointmentActionResponse> {
  try {
    const { companyId } = await resolveTenantContext();

    const validated = verifyBankSlipSchema.parse(input);

    const appointment = await Appointment.findOne({
      _id: new Types.ObjectId(validated.appointmentId),
      companyId,
    });

    if (!appointment) {
      return { success: false, error: 'Appointment record not found.' };
    }

    if (validated.decision === 'approve') {
      appointment.paymentStatus = 'paid';
      appointment.appointmentStatus = 'Confirmed';
      appointment.statusColor = '#10b981';

      if (validated.adminNote) {
        appointment.notes = appointment.notes
          ? `${appointment.notes}\n[Admin Verification]: ${validated.adminNote}`
          : `[Admin Verification]: ${validated.adminNote}`;
      }

      await appointment.save();

      await AppointmentPayment.findOneAndUpdate(
        { appointmentId: appointment._id },
        {
          status: 'completed',
          paymentDate: new Date(),
        },
        { new: true }
      );
    } else {
      appointment.paymentStatus = 'unpaid';
      appointment.appointmentStatus = 'Cancelled';
      appointment.statusColor = '#ef4444';

      if (validated.adminNote) {
        appointment.notes = appointment.notes
          ? `${appointment.notes}\n[Receipt Rejected]: ${validated.adminNote}`
          : `[Receipt Rejected]: ${validated.adminNote}`;
      }

      await appointment.save();

      await AppointmentPayment.findOneAndUpdate(
        { appointmentId: appointment._id },
        {
          status: 'failed',
        },
        { new: true }
      );
    }

    revalidatePath('/dashboard/appointments');
    revalidatePath('/dashboard');

    return {
      success: true,
      message:
        validated.decision === 'approve'
          ? 'Payment approved and appointment confirmed successfully.'
          : 'Receipt rejected and appointment cancelled.',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((i) => i.message).join(', ') };
    }
    const message = error instanceof Error ? error.message : 'Failed to verify bank transfer slip.';
    return { success: false, error: message };
  }
}

/**
 * Update general appointment status (e.g. Completed, Confirmed, Cancelled).
 */
export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
): Promise<AppointmentActionResponse> {
  try {
    const { companyId } = await resolveTenantContext();

    const appointment = await Appointment.findOne({
      _id: new Types.ObjectId(appointmentId),
      companyId,
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found.' };
    }

    const colorMap: Record<string, string> = {
      Pending: '#21c9b0',
      Confirmed: '#10b981',
      Completed: '#64748b',
      Cancelled: '#ef4444',
    };

    appointment.appointmentStatus = status;
    appointment.statusColor = colorMap[status] || '#21c9b0';
    await appointment.save();

    revalidatePath('/dashboard/appointments');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Appointment status updated to ${status}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update appointment status.';
    return { success: false, error: message };
  }
}
