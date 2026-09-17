'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Appointment } from '@/models/Appointment';
import { Customer } from '@/models/Customer';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { Service } from '@/models/Service';
import { Staff } from '@/models/Staff';
import { Location } from '@/models/Location';
import { validateSlotAvailability, normalizeDateString } from '@/lib/booking-engine';
import { hashPassword, verifyPassword } from '@/lib/password';
import { sendAppointmentCancellationEmail, sendAppointmentRescheduledEmail } from '@/lib/mailer';
import type {
  CustomerAppointmentItem,
  CustomerDashboardOverview,
  CustomerProfile,
  CustomerCancelInput,
  CustomerRescheduleInput,
  CustomerProfileUpdateInput,
  CustomerActionResponse,
} from '@/types/customer-appointment';

interface CustomerAuthContext {
  sessionUser: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  };
  userEmail: string;
  userId?: string;
  customerIds: Types.ObjectId[];
}

/**
 * Resolves the authenticated customer context from the active NextAuth session.
 */
async function getCustomerContext(): Promise<
  | { context: CustomerAuthContext; error?: never }
  | { context?: never; error: string }
> {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: 'Unauthorized. Please log in to access your appointments.' };
  }

  await connectToDatabase();
  const userEmail = session.user.email.toLowerCase().trim();
  const userId = session.user.id;

  const customerDocs = await Customer.find({
    $or: [
      { email: userEmail },
      ...(userId && Types.ObjectId.isValid(userId)
        ? [{ userId: new Types.ObjectId(userId) }]
        : []),
    ],
  })
    .select('_id')
    .lean();

  const customerIds = customerDocs.map((c) => c._id as Types.ObjectId);

  return {
    context: {
      sessionUser: session.user,
      userEmail,
      userId,
      customerIds,
    },
  };
}

/**
 * Checks whether an appointment's scheduled date and time is in the past.
 */
function isAppointmentInPast(dateStr: string, timeStr: string): boolean {
  try {
    const normalizedDate = normalizeDateString(dateStr);
    const startTime = timeStr.split('-')[0]?.trim() || '00:00';
    const [year, month, day] = normalizedDate.split('-').map(Number);
    const [hours, minutes] = startTime.split(':').map(Number);

    if (!year || !month || !day) return false;
    const appointmentDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0);
    return appointmentDateTime.getTime() < Date.now();
  } catch {
    return false;
  }
}

/**
 * Maps appointment status to standard UI color codes.
 */
function resolveStatusColor(status: string, defaultColor?: string): string {
  if (defaultColor) return defaultColor;
  switch (status.toLowerCase()) {
    case 'confirmed':
      return '#27a93d';
    case 'completed':
      return '#21c9b0';
    case 'cancelled':
      return '#f04c43';
    case 'pending':
    default:
      return '#fa9c30';
  }
}

/**
 * Fetches the customer dashboard overview, including segregated upcoming/past bookings
 * and calculated KPI summaries.
 */
export async function getCustomerDashboardAction(): Promise<
  CustomerActionResponse<CustomerDashboardOverview>
> {
  try {
    const authResult = await getCustomerContext();
    if (authResult.error || !authResult.context) {
      return { success: false, error: authResult.error };
    }

    const { userEmail, customerIds, userId } = authResult.context;

    const appointmentFilter = {
      $or: [
        { email: userEmail },
        ...(customerIds.length > 0 ? [{ customerId: { $in: customerIds } }] : []),
      ],
    };

    const [appointmentsRaw, userDoc, customerProfileDoc] = await Promise.all([
      Appointment.find(appointmentFilter).sort({ createdAt: -1 }).lean(),
      userId && Types.ObjectId.isValid(userId) ? User.findById(userId).lean() : null,
      Customer.findOne({
        $or: [
          { email: userEmail },
          ...(userId && Types.ObjectId.isValid(userId)
            ? [{ userId: new Types.ObjectId(userId) }]
            : []),
        ],
      })
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    const businessIds = [...new Set(appointmentsRaw.map((a) => String(a.businessId)))];
    const serviceIds = [...new Set(appointmentsRaw.map((a) => String(a.serviceId)))];
    const staffIds = [...new Set(appointmentsRaw.map((a) => String(a.staffId)))];
    const locationIds = [...new Set(appointmentsRaw.map((a) => String(a.locationId)))];

    const [businesses, services, staffs, locations] = await Promise.all([
      Business.find({ _id: { $in: businessIds } })
        .select('name slug currency currencySymbol')
        .lean(),
      Service.find({ _id: { $in: serviceIds } })
        .select('name durationMinutes price')
        .lean(),
      Staff.find({ _id: { $in: staffIds } })
        .select('name colorCode')
        .lean(),
      Location.find({ _id: { $in: locationIds } })
        .select('name address')
        .lean(),
    ]);

    const businessMap = new Map(businesses.map((b) => [String(b._id), b]));
    const serviceMap = new Map(services.map((s) => [String(s._id), s]));
    const staffMap = new Map(staffs.map((st) => [String(st._id), st]));
    const locationMap = new Map(locations.map((l) => [String(l._id), l]));

    const upcomingAppointments: CustomerAppointmentItem[] = [];
    const pastAppointments: CustomerAppointmentItem[] = [];

    let totalBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;

    for (const app of appointmentsRaw) {
      totalBookings += 1;
      const statusLower = (app.appointmentStatus || 'Pending').toLowerCase();
      if (statusLower === 'completed') completedBookings += 1;
      if (statusLower === 'cancelled') cancelledBookings += 1;

      const biz = businessMap.get(String(app.businessId));
      const srv = serviceMap.get(String(app.serviceId));
      const stf = staffMap.get(String(app.staffId));
      const loc = locationMap.get(String(app.locationId));

      const isPast = isAppointmentInPast(app.date, app.time);
      const isCancelled = statusLower === 'cancelled';
      const isCompleted = statusLower === 'completed';

      const canCancel = !isPast && !isCancelled && !isCompleted;
      const canReschedule = !isPast && !isCancelled && !isCompleted;

      const item: CustomerAppointmentItem = {
        id: String(app._id),
        appointmentNumber: app.appointmentNumber,
        businessId: String(app.businessId),
        businessName: biz?.name || 'Service Business',
        businessSlug: biz?.slug || 'business',
        businessCurrency: biz?.currency || 'USD',
        businessCurrencySymbol: biz?.currencySymbol || '$',
        serviceId: String(app.serviceId),
        serviceName: srv?.name || 'Scheduled Service',
        serviceDuration: srv?.durationMinutes || app.durationMinutes || 30,
        servicePrice: srv?.price ?? app.price ?? 0,
        staffId: String(app.staffId),
        staffName: stf?.name || 'Assigned Specialist',
        staffColor: stf?.colorCode || '#21c9b0',
        locationId: String(app.locationId),
        locationName: loc?.name || 'Main Branch',
        locationAddress: loc?.address,
        date: app.date,
        time: app.time,
        appointmentStatus: app.appointmentStatus || 'Pending',
        statusColor: resolveStatusColor(app.appointmentStatus, app.statusColor),
        paymentType: app.paymentType || 'Manually',
        paymentStatus: app.paymentStatus || 'unpaid',
        notes: app.notes,
        isPast,
        canCancel,
        canReschedule,
        createdAt: app.createdAt ? new Date(app.createdAt).toISOString() : new Date().toISOString(),
      };

      if (!isPast && !isCancelled && !isCompleted) {
        upcomingAppointments.push(item);
      } else {
        pastAppointments.push(item);
      }
    }

    const customerProfile: CustomerProfile = {
      id: userId || String(customerProfileDoc?._id || ''),
      name: userDoc?.name || customerProfileDoc?.name || authResult.context.sessionUser.name || 'Customer',
      email: userEmail,
      contact: userDoc?.mobileNo || customerProfileDoc?.contact || '',
      avatar: userDoc?.avatar || customerProfileDoc?.avatar,
      gender: customerProfileDoc?.gender || '',
      dob: customerProfileDoc?.dob,
    };

    return {
      success: true,
      data: {
        upcomingAppointments,
        pastAppointments,
        totalBookings,
        completedBookings,
        cancelledBookings,
        customerProfile,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve customer dashboard.';
    return { success: false, error: message };
  }
}

/**
 * Allows a customer to cancel their own upcoming appointment with optional cancellation reason.
 */
export async function customerCancelAppointmentAction(
  input: CustomerCancelInput
): Promise<CustomerActionResponse<{ appointmentNumber: string }>> {
  try {
    const authResult = await getCustomerContext();
    if (authResult.error || !authResult.context) {
      return { success: false, error: authResult.error };
    }

    const { userEmail, customerIds } = authResult.context;
    const { appointmentId, reason } = input;

    if (!appointmentId || !Types.ObjectId.isValid(appointmentId)) {
      return { success: false, error: 'Invalid appointment ID provided.' };
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found.' };
    }

    const isOwner =
      appointment.email.toLowerCase() === userEmail ||
      (appointment.customerId && customerIds.some((cId) => String(cId) === String(appointment.customerId)));

    if (!isOwner) {
      return { success: false, error: 'Access denied: You do not own this appointment.' };
    }

    const statusLower = (appointment.appointmentStatus || '').toLowerCase();
    if (statusLower === 'cancelled') {
      return { success: false, error: 'This appointment is already cancelled.' };
    }
    if (statusLower === 'completed') {
      return { success: false, error: 'Completed appointments cannot be cancelled.' };
    }
    if (isAppointmentInPast(appointment.date, appointment.time)) {
      return { success: false, error: 'Past appointments cannot be cancelled.' };
    }

    appointment.appointmentStatus = 'Cancelled';
    appointment.statusColor = '#f04c43';

    const timestamp = new Date().toLocaleString();
    const reasonText = reason?.trim() ? `Reason: ${reason.trim()}` : 'Cancelled by customer';
    appointment.notes = appointment.notes
      ? `${appointment.notes}\n[${timestamp}] ${reasonText}`
      : `[${timestamp}] ${reasonText}`;

    await appointment.save();
    revalidatePath('/customer');

    // Asynchronously dispatch cancellation email
    void (async () => {
      try {
        const [biz, svc] = await Promise.all([
          Business.findById(appointment.businessId).select('name slug').lean(),
          Service.findById(appointment.serviceId).select('name').lean(),
        ]);
        await sendAppointmentCancellationEmail({
          customerName: appointment.name,
          customerEmail: appointment.email,
          appointmentNumber: appointment.appointmentNumber,
          serviceName: svc?.name || 'Appointment Service',
          date: appointment.date,
          time: appointment.time,
          reason: reason?.trim(),
          businessName: biz?.name || 'BookingGo',
        });
      } catch (e) {
        console.error('[Mailer] Cancellation email notification error:', e);
      }
    })();

    return {
      success: true,
      message: `Appointment ${appointment.appointmentNumber} has been successfully cancelled.`,
      data: { appointmentNumber: appointment.appointmentNumber },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel appointment.';
    return { success: false, error: message };
  }
}

/**
 * Reschedules a customer's appointment to a new date and time slot with atomic collision verification.
 */
export async function customerRescheduleAppointmentAction(
  input: CustomerRescheduleInput
): Promise<CustomerActionResponse<{ appointmentNumber: string; newDate: string; newTime: string }>> {
  try {
    const authResult = await getCustomerContext();
    if (authResult.error || !authResult.context) {
      return { success: false, error: authResult.error };
    }

    const { userEmail, customerIds } = authResult.context;
    const { appointmentId, newDate, newTime, newStaffId } = input;

    if (!appointmentId || !Types.ObjectId.isValid(appointmentId)) {
      return { success: false, error: 'Invalid appointment ID provided.' };
    }

    if (!newDate || !newTime) {
      return { success: false, error: 'Please select both a new date and time slot.' };
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found.' };
    }

    const isOwner =
      appointment.email.toLowerCase() === userEmail ||
      (appointment.customerId && customerIds.some((cId) => String(cId) === String(appointment.customerId)));

    if (!isOwner) {
      return { success: false, error: 'Access denied: You do not own this appointment.' };
    }

    const statusLower = (appointment.appointmentStatus || '').toLowerCase();
    if (statusLower === 'cancelled' || statusLower === 'completed') {
      return { success: false, error: `Cannot reschedule an appointment marked as ${appointment.appointmentStatus}.` };
    }

    const normalizedDate = normalizeDateString(newDate);
    if (isAppointmentInPast(normalizedDate, newTime)) {
      return { success: false, error: 'Cannot reschedule to a past date or time slot.' };
    }

    const targetStaffId = newStaffId && Types.ObjectId.isValid(newStaffId)
      ? newStaffId
      : String(appointment.staffId);

    const service = await Service.findById(appointment.serviceId).select('durationMinutes').lean();
    const duration = service?.durationMinutes || appointment.durationMinutes || 30;

    const slotCheck = await validateSlotAvailability({
      businessId: String(appointment.businessId),
      serviceId: String(appointment.serviceId),
      staffId: targetStaffId,
      date: normalizedDate,
      time: newTime,
      durationMinutes: duration,
    });

    if (!slotCheck.available) {
      return {
        success: false,
        error: slotCheck.reason || 'The requested slot is already booked or outside working hours.',
      };
    }

    const oldDate = appointment.date;
    const oldTime = appointment.time;

    appointment.date = normalizedDate;
    appointment.time = newTime;
    if (newStaffId && Types.ObjectId.isValid(newStaffId)) {
      appointment.staffId = new Types.ObjectId(newStaffId);
    }

    const timestamp = new Date().toLocaleString();
    const rescheduleLog = `[${timestamp}] Rescheduled by customer from ${oldDate} ${oldTime} to ${normalizedDate} ${newTime}`;
    appointment.notes = appointment.notes
      ? `${appointment.notes}\n${rescheduleLog}`
      : rescheduleLog;

    await appointment.save();
    revalidatePath('/customer');

    // Asynchronously dispatch rescheduled email
    void (async () => {
      try {
        const [biz, svc, staff, loc] = await Promise.all([
          Business.findById(appointment.businessId).select('name slug').lean(),
          Service.findById(appointment.serviceId).select('name').lean(),
          Staff.findById(appointment.staffId).select('name').lean(),
          Location.findById(appointment.locationId).select('name').lean(),
        ]);
        await sendAppointmentRescheduledEmail({
          customerName: appointment.name,
          customerEmail: appointment.email,
          appointmentNumber: appointment.appointmentNumber,
          serviceName: svc?.name || 'Appointment Service',
          staffName: staff?.name || 'Assigned Staff',
          locationName: loc?.name || 'Main Location',
          oldDate,
          oldTime,
          newDate: normalizedDate,
          newTime,
          businessName: biz?.name || 'BookingGo',
        });
      } catch (e) {
        console.error('[Mailer] Reschedule email notification error:', e);
      }
    })();

    return {
      success: true,
      message: `Appointment ${appointment.appointmentNumber} rescheduled to ${normalizedDate} (${newTime}).`,
      data: {
        appointmentNumber: appointment.appointmentNumber,
        newDate: normalizedDate,
        newTime,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reschedule appointment.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves the profile information for the authenticated customer.
 */
export async function getCustomerProfileAction(): Promise<
  CustomerActionResponse<CustomerProfile>
> {
  try {
    const authResult = await getCustomerContext();
    if (authResult.error || !authResult.context) {
      return { success: false, error: authResult.error };
    }

    const { userEmail, userId } = authResult.context;

    const [userDoc, customerDoc] = await Promise.all([
      userId && Types.ObjectId.isValid(userId) ? User.findById(userId).lean() : null,
      Customer.findOne({
        $or: [
          { email: userEmail },
          ...(userId && Types.ObjectId.isValid(userId)
            ? [{ userId: new Types.ObjectId(userId) }]
            : []),
        ],
      })
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    return {
      success: true,
      data: {
        id: userId || String(customerDoc?._id || ''),
        name: userDoc?.name || customerDoc?.name || authResult.context.sessionUser.name || 'Customer',
        email: userEmail,
        contact: userDoc?.mobileNo || customerDoc?.contact || '',
        avatar: userDoc?.avatar || customerDoc?.avatar,
        gender: customerDoc?.gender || '',
        dob: customerDoc?.dob,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve profile.';
    return { success: false, error: message };
  }
}

/**
 * Updates customer profile information (name, phone, gender, birth date, password).
 */
export async function updateCustomerProfileAction(
  input: CustomerProfileUpdateInput
): Promise<CustomerActionResponse<CustomerProfile>> {
  try {
    const authResult = await getCustomerContext();
    if (authResult.error || !authResult.context) {
      return { success: false, error: authResult.error };
    }

    const { userEmail, userId } = authResult.context;
    const { name, contact, gender, dob, currentPassword, newPassword } = input;

    if (!name?.trim()) {
      return { success: false, error: 'Name is required.' };
    }

    let user = userId && Types.ObjectId.isValid(userId) ? await User.findById(userId) : null;
    if (!user) {
      user = await User.findOne({ email: userEmail });
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return { success: false, error: 'New password must be at least 6 characters long.' };
      }

      if (user?.password) {
        if (!currentPassword) {
          return { success: false, error: 'Current password is required to set a new password.' };
        }
        const isMatch = await verifyPassword(currentPassword, user.password);
        if (!isMatch) {
          return { success: false, error: 'Current password does not match.' };
        }
      }

      if (user) {
        user.password = await hashPassword(newPassword);
      }
    }

    if (user) {
      user.name = name.trim();
      if (contact?.trim()) user.mobileNo = contact.trim();
      await user.save();
    }

    await Customer.updateMany(
      {
        $or: [
          { email: userEmail },
          ...(userId && Types.ObjectId.isValid(userId)
            ? [{ userId: new Types.ObjectId(userId) }]
            : []),
        ],
      },
      {
        $set: {
          name: name.trim(),
          ...(contact?.trim() ? { contact: contact.trim() } : {}),
          ...(gender !== undefined ? { gender } : {}),
          ...(dob !== undefined ? { dob } : {}),
        },
      }
    );

    revalidatePath('/customer');

    return {
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: String(user?._id || userId || ''),
        name: name.trim(),
        email: userEmail,
        contact: contact?.trim() || user?.mobileNo || '',
        avatar: user?.avatar,
        gender: gender || '',
        dob,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update profile.';
    return { success: false, error: message };
  }
}
