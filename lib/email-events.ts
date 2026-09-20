import { Types } from 'mongoose';
import { connectToDatabase } from './db';
import { Appointment, type IAppointmentDocument } from '@/models/Appointment';
import { Service, type IServiceDocument } from '@/models/Service';
import { Staff, type IStaffDocument } from '@/models/Staff';
import { Location, type ILocationDocument } from '@/models/Location';
import { Business, type IBusiness } from '@/models/Business';
import { User } from '@/models/User';
import { sendTemplatedEmail, ensureSystemTemplatesSeeded } from './email-engine';
import { getGoogleCalendarUrl, getOutlookCalendarUrl } from './calendar-link';
import type {
  AppointmentEmailEventType,
  EmailDispatchResult,
} from '@/types/email-events';

/**
 * Centrally dispatches transactional email events for appointments.
 * Resolves company-customized or global email templates, interpolates
 * all shortcodes, and notifies both customer and staff asynchronously.
 */
export async function dispatchAppointmentEmailEvent(
  eventType: AppointmentEmailEventType,
  appointmentId: string | Types.ObjectId,
  extraVariables?: Record<string, string | number | undefined | null>
): Promise<EmailDispatchResult> {
  try {
    await connectToDatabase();
    await ensureSystemTemplatesSeeded();

    const targetId =
      typeof appointmentId === 'string'
        ? new Types.ObjectId(appointmentId)
        : appointmentId;

    const appointment = await Appointment.findById(targetId).lean<IAppointmentDocument>();
    if (!appointment) {
      return {
        success: false,
        event: eventType,
        customerDelivered: false,
        staffDelivered: false,
        recipientCount: 0,
        error: 'Appointment not found for email dispatch.',
      };
    }

    // Populate associated entities concurrently
    const [service, staff, location, business] = await Promise.all([
      appointment.serviceId ? Service.findById(appointment.serviceId).lean<IServiceDocument>() : null,
      appointment.staffId ? Staff.findById(appointment.staffId).lean<IStaffDocument>() : null,
      appointment.locationId ? Location.findById(appointment.locationId).lean<ILocationDocument>() : null,
      appointment.businessId ? Business.findById(appointment.businessId).lean<IBusiness>() : null,
    ]);

    // Resolve staff email from linked User account if available
    let staffEmail = '';
    if (staff?.userId) {
      const staffUser = await User.findById(staff.userId).select('email').lean();
      if (staffUser?.email) {
        staffEmail = staffUser.email.trim();
      }
    }

    const defaultAppName = process.env.APP_NAME || 'BookingGo';
    const defaultAppUrl =
      process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
    const businessName = business?.name || defaultAppName;
    const businessSlug = business?.slug || '';
    const currencySymbol = business?.currencySymbol || '$';
    const trackingUrl = businessSlug
      ? `${defaultAppUrl}/find-appointment/${businessSlug}`
      : defaultAppUrl;

    const googleCalUrl = getGoogleCalendarUrl({
      title: `${service?.name || 'Appointment'} with ${businessName}`,
      description: `Appointment #${appointment.appointmentNumber}. Specialist: ${staff?.name || 'Assigned Staff'}`,
      location: location?.name || location?.address || '',
      dateStr: appointment.date,
      timeSlot: appointment.time,
      appointmentNumber: appointment.appointmentNumber,
    });

    const outlookCalUrl = getOutlookCalendarUrl({
      title: `${service?.name || 'Appointment'} with ${businessName}`,
      description: `Appointment #${appointment.appointmentNumber}. Specialist: ${staff?.name || 'Assigned Staff'}`,
      location: location?.name || location?.address || '',
      dateStr: appointment.date,
      timeSlot: appointment.time,
      appointmentNumber: appointment.appointmentNumber,
    });

    // Map all dynamic template variables
    const variables: Record<string, string | number | undefined | null> = {
      app_name: defaultAppName,
      company_name: businessName,
      business_name: businessName,
      app_url: defaultAppUrl,
      tracking_url: trackingUrl,
      appointment_number: appointment.appointmentNumber,
      appointment_date: appointment.date,
      appointment_time: appointment.time,
      duration: `${appointment.durationMinutes || 30} mins`,
      service: service?.name || 'Standard Service',
      service_name: service?.name || 'Standard Service',
      service_price: `${currencySymbol}${(appointment.price || 0).toFixed(2)}`,
      staff: staff?.name || 'Assigned Specialist',
      staff_name: staff?.name || 'Assigned Specialist',
      location: location?.name || 'Main Location',
      location_name: location?.name || 'Main Location',
      location_address: location?.address || '',
      customer: appointment.name,
      customer_name: appointment.name,
      customer_email: appointment.email,
      customer_contact: appointment.contact,
      status: appointment.appointmentStatus || 'Pending',
      appointment_status: appointment.appointmentStatus || 'Pending',
      payment_type: appointment.paymentType || 'Manual',
      payment_status: appointment.paymentStatus || 'unpaid',
      google_calendar_url: googleCalUrl,
      outlook_calendar_url: outlookCalUrl,
      ...extraVariables,
    };

    // Determine target template slug based on event type
    let templateSlug = 'appointment-status-change';
    if (eventType === 'appointment_created') {
      templateSlug = 'create-appointment';
    }

    const companyIdStr = appointment.companyId ? String(appointment.companyId) : undefined;
    const businessIdStr = appointment.businessId ? String(appointment.businessId) : undefined;

    let customerDelivered = false;
    let customerError: string | undefined;
    let staffDelivered = false;
    let staffError: string | undefined;
    let recipientCount = 0;

    // 1. Send confirmation to Customer
    if (appointment.email && appointment.email.includes('@')) {
      recipientCount++;
      const customerRes = await sendTemplatedEmail({
        to: appointment.email.trim(),
        templateNameOrSlug: templateSlug,
        variables,
        companyId: companyIdStr,
        businessId: businessIdStr,
      });

      customerDelivered = customerRes.success;
      if (!customerRes.success) {
        customerError = customerRes.error;
      }
    }

    // 2. Send notification to Staff Specialist if distinct email available
    if (
      staffEmail &&
      staffEmail.includes('@') &&
      staffEmail.toLowerCase() !== appointment.email.toLowerCase()
    ) {
      recipientCount++;
      const staffVariables = {
        ...variables,
        customer_notification: `New customer booking: ${appointment.name} (${appointment.contact})`,
      };

      const staffRes = await sendTemplatedEmail({
        to: staffEmail,
        templateNameOrSlug: templateSlug,
        variables: staffVariables,
        companyId: companyIdStr,
        businessId: businessIdStr,
      });

      staffDelivered = staffRes.success;
      if (!staffRes.success) {
        staffError = staffRes.error;
      }
    }

    return {
      success: customerDelivered || staffDelivered,
      event: eventType,
      customerDelivered,
      staffDelivered,
      recipientCount,
      customerError,
      staffError,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during email dispatch';
    console.error(`[EmailEvents] Failed to dispatch ${eventType}:`, error);
    return {
      success: false,
      event: eventType,
      customerDelivered: false,
      staffDelivered: false,
      recipientCount: 0,
      error: message,
    };
  }
}
