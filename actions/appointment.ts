'use server';

import { type Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import { Service } from '@/models/Service';
import { Staff } from '@/models/Staff';
import { Location } from '@/models/Location';
import { User } from '@/models/User';
import { Customer } from '@/models/Customer';
import { Appointment, type CustomerType } from '@/models/Appointment';
import { AppointmentPayment } from '@/models/AppointmentPayment';
import { Counter } from '@/models/Counter';
import { validateSlotAvailability, normalizeDateString } from '@/lib/booking-engine';
import { hashPassword, verifyPassword } from '@/lib/password';
import { dispatchAppointmentEmailEvent } from '@/lib/email-events';
import { validateAndSanitizeCustomFields } from '@/lib/custom-fields';

export interface CreateAppointmentInput {
  businessId: string;
  serviceId: string;
  staffId: string;
  locationId: string;
  date: string;
  time: string;
  customerType: CustomerType;
  name: string;
  email: string;
  contact: string;
  password?: string;
  gender?: 'male' | 'female' | 'other' | '';
  dob?: string;
  description?: string;
  paymentType?: string;
  notes?: string;
  attachment?: string;
  customFields?: Record<string, unknown>;
  recaptchaToken?: string;
}

export interface BookingResponse {
  success: boolean;
  appointmentId?: string;
  appointmentNumber?: string;
  message?: string;
  error?: string;
}

export interface TrackingDetails {
  appointmentNumber: string;
  date: string;
  time: string;
  durationMinutes: number;
  appointmentStatus: string;
  statusColor: string;
  serviceName: string;
  staffName: string;
  locationName: string;
  customerName: string;
  customerEmail: string;
  customerContact: string;
  price: number;
  paymentType: string;
  paymentStatus: string;
  notes?: string;
  attachment?: string;
  customFields?: Record<string, unknown>;
  createdAt: string;
}

export interface TrackingResponse {
  success: boolean;
  appointment?: TrackingDetails;
  error?: string;
}

export async function createAppointment(
  data: CreateAppointmentInput
): Promise<BookingResponse> {
  try {
    const {
      businessId,
      serviceId,
      staffId,
      locationId,
      date,
      time,
      customerType,
      name,
      email,
      contact,
      password,
      gender,
      dob,
      description,
      paymentType = 'Manually',
      notes,
      attachment,
      customFields,
    } = data;

    if (
      !businessId ||
      !serviceId ||
      !staffId ||
      !locationId ||
      !date ||
      !time ||
      !name ||
      !email ||
      !contact
    ) {
      return { success: false, error: 'All primary booking fields are required.' };
    }

    // Validate Google reCAPTCHA (bypassed if disabled or in dev)
    const { verifyRecaptchaToken } = await import('@/lib/recaptcha');
    const recaptchaCheck = await verifyRecaptchaToken(data.recaptchaToken, {
      expectedAction: 'book_appointment',
    });
    if (!recaptchaCheck.success) {
      return {
        success: false,
        error: recaptchaCheck.error || 'reCAPTCHA verification failed. Please try again.',
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();
    const normalizedContact = contact.trim();
    const normalizedDate = normalizeDateString(date);

    await connectToDatabase();

    const [business, service, staffMember, location] = await Promise.all([
      Business.findById(businessId),
      Service.findById(serviceId),
      Staff.findById(staffId),
      Location.findById(locationId),
    ]);

    if (!business) {
      return { success: false, error: 'Target business profile not found.' };
    }

    if (!service || !service.isActive) {
      return { success: false, error: 'Selected service is inactive or unavailable.' };
    }

    if (!staffMember || !staffMember.isActive) {
      return { success: false, error: 'Selected staff member is unavailable.' };
    }

    if (!location || !location.isActive) {
      return { success: false, error: 'Selected branch location is unavailable.' };
    }

    const duration = Math.max(1, service.durationMinutes || 30);
    const resolvedBuffer =
      service.bufferMinutes !== undefined && service.bufferMinutes !== null && service.bufferMinutes >= 0
        ? service.bufferMinutes
        : (business.timeInterval ?? 0);

    const slotCheck = await validateSlotAvailability({
      businessId,
      serviceId,
      staffId,
      date: normalizedDate,
      time,
      durationMinutes: duration,
      bufferMinutes: resolvedBuffer,
    });

    if (!slotCheck.available) {
      return {
        success: false,
        error: slotCheck.reason || 'This slot was just booked by another customer.',
      };
    }

    const customFieldsCheck = await validateAndSanitizeCustomFields(
      business._id,
      customFields
    );
    if (!customFieldsCheck.success) {
      return {
        success: false,
        error: customFieldsCheck.error || 'Custom fields validation failed.',
      };
    }
    const sanitizedCustomFields = customFieldsCheck.data || {};

    let customerId: Types.ObjectId | undefined;

    if (customerType === 'new-user') {
      if (!password || password.length < 4) {
        return {
          success: false,
          error: 'Please provide a valid password of at least 4 characters.',
        };
      }

      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return {
          success: false,
          error: 'An account with this email already exists. Please choose Existing User or log in.',
        };
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        mobileNo: normalizedContact,
        password: hashedPassword,
        role: 'customer',
        companyId: business.companyId,
        activeBusinessId: business._id,
      });

      const newCustomer = await Customer.create({
        companyId: business.companyId,
        businessId: business._id,
        userId: newUser._id,
        name: normalizedName,
        email: normalizedEmail,
        contact: normalizedContact,
        gender: gender || '',
        dob: dob || '',
        description: description || '',
      });

      customerId = newCustomer._id;
    } else if (customerType === 'existing-user') {
      if (!password) {
        return { success: false, error: 'Password is required for existing customer accounts.' };
      }

      const user = await User.findOne({ email: normalizedEmail });
      if (!user || !user.password) {
        return { success: false, error: 'Customer account not found with this email.' };
      }

      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return { success: false, error: 'Incorrect password for this account.' };
      }

      let customerDoc = await Customer.findOne({
        userId: user._id,
        businessId: business._id,
      });

      if (!customerDoc) {
        customerDoc = await Customer.create({
          companyId: business.companyId,
          businessId: business._id,
          userId: user._id,
          name: user.name || normalizedName,
          email: user.email,
          contact: user.mobileNo || normalizedContact,
          gender: gender || '',
          dob: dob || '',
          description: description || '',
        });
      }

      customerId = customerDoc._id;
    }

    const counterKey = `appointment_${business._id}`;
    const seq = await Counter.getNextSequence(counterKey);
    const prefix = business.appointmentPrefix || '#APP0000';
    const appointmentNumber = `${prefix}${seq}`;

    const isServiceFree = service.isFree || service.price === 0;

    const appointment = await Appointment.create({
      appointmentNumber,
      companyId: business.companyId,
      businessId: business._id,
      customerId,
      customerType,
      name: normalizedName,
      email: normalizedEmail,
      contact: normalizedContact,
      locationId: location._id,
      serviceId: service._id,
      staffId: staffMember._id,
      date: normalizedDate,
      time,
      durationMinutes: duration,
      bufferMinutes: resolvedBuffer,
      price: service.price || 0,
      notes: notes || '',
      paymentType,
      paymentStatus: isServiceFree ? 'paid' : 'unpaid',
      appointmentStatus: 'Pending',
      statusColor: '#21c9b0',
      attachment: attachment || '',
      customFields: sanitizedCustomFields,
    });

    await AppointmentPayment.create({
      appointmentId: appointment._id,
      companyId: business.companyId,
      businessId: business._id,
      paymentType,
      amount: service.price || 0,
      discountAmount: 0,
      couponAmount: 0,
      taxAmount: 0,
      finalAmount: service.price || 0,
      paymentDate: new Date(),
      status: isServiceFree ? 'completed' : 'pending',
    });

    // Fire automated templated email event to customer and assigned staff asynchronously
    void dispatchAppointmentEmailEvent('appointment_created', appointment._id)
      .catch((err) => console.error('[EmailEvents] Booking confirmation dispatch failed:', err));

    return {
      success: true,
      appointmentId: String(appointment._id),
      appointmentNumber,
      message: 'Appointment has been booked successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to book appointment.';
    return { success: false, error: message };
  }
}

export async function getAppointmentTracking(
  appointmentNumber: string,
  email: string
): Promise<TrackingResponse> {
  try {
    if (!appointmentNumber || !email) {
      return { success: false, error: 'Appointment number and email are required.' };
    }

    await connectToDatabase();

    const normalizedNumber = appointmentNumber.trim();
    const normalizedEmail = email.toLowerCase().trim();

    const appointment = await Appointment.findOne({
      appointmentNumber: normalizedNumber,
      email: normalizedEmail,
    })
      .populate<{ serviceId: { name: string } }>('serviceId', 'name')
      .populate<{ staffId: { name: string } }>('staffId', 'name')
      .populate<{ locationId: { name: string } }>('locationId', 'name')
      .lean();

    if (!appointment) {
      return { success: false, error: 'No appointment found matching these details.' };
    }

    return {
      success: true,
      appointment: {
        appointmentNumber: appointment.appointmentNumber,
        date: appointment.date,
        time: appointment.time,
        durationMinutes: appointment.durationMinutes,
        appointmentStatus: appointment.appointmentStatus,
        statusColor: appointment.statusColor,
        serviceName: appointment.serviceId?.name || 'Standard Service',
        staffName: appointment.staffId?.name || 'Staff Member',
        locationName: appointment.locationId?.name || 'Branch Location',
        customerName: appointment.name,
        customerEmail: appointment.email,
        customerContact: appointment.contact,
        price: appointment.price,
        paymentType: appointment.paymentType,
        paymentStatus: appointment.paymentStatus,
        notes: appointment.notes,
        attachment: appointment.attachment,
        customFields: appointment.customFields,
        createdAt: appointment.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error retrieving tracking details.';
    return { success: false, error: message };
  }
}
