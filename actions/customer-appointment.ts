'use server';

import { Types } from 'mongoose';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Appointment } from '@/models/Appointment';
import { Service, type IService } from '@/models/Service';
import { Staff, type IStaff } from '@/models/Staff';
import { Business, type IBusiness } from '@/models/Business';
import { User } from '@/models/User';
import { Customer } from '@/models/Customer';
import { normalizeDateString } from '@/lib/booking-engine';
import { hashPassword, verifyPassword } from '@/lib/password';
import type { AppointmentItem } from '@/components/customer/appointment-card';

export interface CustomerDashboardData {
  metrics: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  };
  upcoming: AppointmentItem[];
  past: AppointmentItem[];
}

export interface CustomerProfileData {
  name: string;
  email: string;
  contact: string;
  gender: string;
  dob: string;
}

interface PopulatedAppointment {
  _id: Types.ObjectId;
  appointmentNumber: string;
  serviceId?: (IService & { _id: Types.ObjectId }) | null;
  staffId?: (IStaff & { _id: Types.ObjectId }) | null;
  businessId?: (IBusiness & { _id: Types.ObjectId }) | null;
  date: string;
  time: string;
  price: number;
  appointmentStatus: string;
  paymentStatus: string;
  attachment?: string;
  customerType: string;
}

export async function getCustomerDashboardAction(): Promise<CustomerDashboardData> {
  const session = await auth();
  if (!session?.user?.email) {
    return {
      metrics: { total: 0, upcoming: 0, completed: 0, cancelled: 0 },
      upcoming: [],
      past: [],
    };
  }

  await connectToDatabase();
  const userEmail = session.user.email.toLowerCase().trim();
  const userId = session.user.id;

  const query: Record<string, unknown> = {
    $or: [
      { email: userEmail },
      ...(userId && Types.ObjectId.isValid(userId) ? [{ customerId: new Types.ObjectId(userId) }] : []),
    ],
  };

  const appointments = (await Appointment.find(query)
    .populate({
      path: 'serviceId',
      model: Service,
      select: 'name durationMinutes price image',
    })
    .populate({
      path: 'staffId',
      model: Staff,
      select: 'name description colorCode',
    })
    .populate({
      path: 'businessId',
      model: Business,
      select: 'name slug currency',
    })
    .sort({ date: -1, time: -1 })
    .lean()) as unknown as PopulatedAppointment[];

  const todayStr = normalizeDateString(new Date().toISOString().split('T')[0]);

  const upcoming: AppointmentItem[] = [];
  const past: AppointmentItem[] = [];
  const total = appointments.length;
  let upcomingCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  for (const apt of appointments) {
    const aptDate = apt.date;
    const isCancelled = apt.appointmentStatus?.toLowerCase() === 'cancelled';
    const isCompleted = apt.appointmentStatus?.toLowerCase() === 'completed';

    if (isCancelled) {
      cancelledCount++;
    } else if (isCompleted) {
      completedCount++;
    }

    const service = apt.serviceId;
    const staff = apt.staffId;
    const business = apt.businessId;

    const formattedItem: AppointmentItem = {
      id: String(apt._id),
      slug: business?.slug,
      serviceTitle: service?.name || 'General Service',
      specialistName: staff?.name || undefined,
      companyName: business?.name || undefined,
      companySlug: business?.slug || undefined,
      date: apt.date,
      startTime: apt.time,
      endTime: apt.time,
      price: apt.price || service?.price || 0,
      currency: business?.currency || '$',
      status: apt.appointmentStatus || 'pending',
      paymentStatus: apt.paymentStatus || 'unpaid',
      receiptUrl: apt.attachment || undefined,
      isGuestBooking: apt.customerType === 'guest-user',
    };

    if (!isCancelled && aptDate >= todayStr && !isCompleted) {
      upcomingCount++;
      upcoming.push(formattedItem);
    } else {
      past.push(formattedItem);
    }
  }

  return {
    metrics: {
      total,
      upcoming: upcomingCount,
      completed: completedCount,
      cancelled: cancelledCount,
    },
    upcoming,
    past,
  };
}

export async function getCustomerProfileAction(): Promise<CustomerProfileData | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  await connectToDatabase();
  const userEmail = session.user.email.toLowerCase().trim();
  const user = await User.findOne({ email: userEmail }).lean();
  const customer = await Customer.findOne({ email: userEmail }).lean();

  return {
    name: user?.name || customer?.name || session.user.name || '',
    email: userEmail,
    contact: customer?.contact || user?.mobileNo || '',
    gender: (customer?.gender as string) || '',
    dob: customer?.dob || '',
  };
}

export async function updateCustomerProfileAction(input: {
  name?: string;
  contact?: string;
  gender?: string;
  dob?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized. Please sign in.' };
  }

  await connectToDatabase();
  const userEmail = session.user.email.toLowerCase().trim();
  const user = await User.findOne({ email: userEmail });

  if (!user) {
    return { success: false, error: 'User account not found.' };
  }

  // Handle password update if requested
  if (input.newPassword) {
    if (!input.currentPassword) {
      return { success: false, error: 'Current password is required to set a new password.' };
    }
    if (input.newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }

    const isMatch = await verifyPassword(input.currentPassword, user.password);
    if (!isMatch) {
      return { success: false, error: 'Current password does not match our records.' };
    }

    user.password = await hashPassword(input.newPassword);
  }

  // Update name and contact
  if (input.name !== undefined && input.name.trim()) {
    user.name = input.name.trim();
  }
  if (input.contact !== undefined) {
    user.mobileNo = input.contact.trim();
  }

  await user.save();

  // Also sync Customer record if it exists
  const customer = await Customer.findOne({ email: userEmail });
  if (customer) {
    if (input.name !== undefined && input.name.trim()) customer.name = input.name.trim();
    if (input.contact !== undefined) customer.contact = input.contact.trim();
    if (input.gender !== undefined) customer.gender = input.gender;
    if (input.dob !== undefined) customer.dob = input.dob;
    await customer.save();
  }

  return { success: true };
}

export async function customerCancelAppointmentAction(input: {
  appointmentId: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized. Please sign in.' };
  }

  await connectToDatabase();
  const appointment = await Appointment.findById(input.appointmentId);
  if (!appointment) {
    return { success: false, error: 'Appointment not found.' };
  }

  if (
    appointment.email.toLowerCase() !== session.user.email.toLowerCase() &&
    String(appointment.customerId) !== String(session.user.id)
  ) {
    return { success: false, error: 'Unauthorized to modify this appointment.' };
  }

  appointment.appointmentStatus = 'cancelled';
  appointment.statusColor = '#f04c43';
  if (input.reason) {
    appointment.notes =
      (appointment.notes ? appointment.notes + ' | ' : '') +
      'Cancelled by customer: ' +
      input.reason;
  }

  await appointment.save();
  return { success: true };
}

export async function customerRescheduleAppointmentAction(input: {
  appointmentId: string;
  newDate: string;
  newTime: string;
  newStaffId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized. Please sign in.' };
  }

  await connectToDatabase();
  const appointment = await Appointment.findById(input.appointmentId);
  if (!appointment) {
    return { success: false, error: 'Appointment not found.' };
  }

  if (
    appointment.email.toLowerCase() !== session.user.email.toLowerCase() &&
    String(appointment.customerId) !== String(session.user.id)
  ) {
    return { success: false, error: 'Unauthorized to modify this appointment.' };
  }

  appointment.date = input.newDate;
  appointment.time = input.newTime;
  if (input.newStaffId && Types.ObjectId.isValid(input.newStaffId)) {
    appointment.staffId = new Types.ObjectId(input.newStaffId);
  }

  await appointment.save();
  return { success: true };
}
