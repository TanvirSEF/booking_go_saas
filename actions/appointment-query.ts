'use server';

import { Types } from 'mongoose';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Appointment } from '@/models/Appointment';
import { AppointmentPayment } from '@/models/AppointmentPayment';
import { Service } from '@/models/Service';
import { Staff } from '@/models/Staff';
import { Location } from '@/models/Location';
import { CustomStatus } from '@/models/CustomStatus';
import { validateSlotAvailability } from '@/lib/booking-engine';
import { dispatchAppointmentEmailEvent } from '@/lib/email-events';
import type {
  CalendarEvent,
  CalendarEventsResponse,
  AppointmentQueryFilters,
  AppointmentListItem,
  PaginatedAppointmentsResponse,
  DashboardMetricsResponse,
  RescheduleAppointmentInput,
  MutationResponse,
} from '@/types/appointment-query';

interface TenantContext {
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
}

/**
 * Resolves and validates the authenticated tenant context (companyId and activeBusinessId).
 */
async function getTenantContext(requestedBusinessId?: string): Promise<{
  context?: TenantContext;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized. Please log in to proceed.' };
  }

  await connectToDatabase();

  let companyId: Types.ObjectId | null = null;
  if (session.user.role === 'company') {
    companyId = new Types.ObjectId(session.user.id);
  } else if (session.user.companyId) {
    companyId = new Types.ObjectId(session.user.companyId);
  } else if (session.user.role === 'super admin' && requestedBusinessId) {
    return {
      context: {
        companyId: new Types.ObjectId(session.user.id),
        businessId: new Types.ObjectId(requestedBusinessId),
      },
    };
  }

  if (!companyId) {
    return { error: 'Unable to resolve tenant organization context.' };
  }

  const rawBusinessId = requestedBusinessId || session.user.activeBusinessId;
  if (!rawBusinessId || !Types.ObjectId.isValid(rawBusinessId)) {
    return { error: 'No active business selected. Please select a business from the switcher.' };
  }

  const businessId = new Types.ObjectId(rawBusinessId);

  return { context: { companyId, businessId } };
}

/**
 * Parses time window e.g. "09:00 - 09:30" into { start: "09:00", end: "09:30" }.
 */
function parseTimeSlot(timeStr: string): { start: string; end: string } {
  const parts = timeStr.split('-').map((s) => s.trim());
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { start: parts[0], end: parts[1] };
  }
  return { start: timeStr, end: timeStr };
}

/**
 * Retrieves appointments formatted as FullCalendar v6 events for the tenant calendar view.
 */
export async function getCalendarAppointments(params: {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  staffId?: string;
  locationId?: string;
  businessId?: string;
}): Promise<CalendarEventsResponse> {
  try {
    const { context, error } = await getTenantContext(params.businessId);
    if (error || !context) {
      return { success: false, error };
    }

    const query: Record<string, unknown> = {
      businessId: context.businessId,
      companyId: context.companyId,
      date: { $gte: params.startDate, $lte: params.endDate },
    };

    if (params.staffId && Types.ObjectId.isValid(params.staffId)) {
      query.staffId = new Types.ObjectId(params.staffId);
    }

    if (params.locationId && Types.ObjectId.isValid(params.locationId)) {
      query.locationId = new Types.ObjectId(params.locationId);
    }

    const appointments = await Appointment.find(query).sort({ date: 1, time: 1 }).lean();

    if (appointments.length === 0) {
      return { success: true, data: [] };
    }

    const serviceIds = [...new Set(appointments.map((a) => a.serviceId))];
    const staffIds = [...new Set(appointments.map((a) => a.staffId))];
    const locationIds = [...new Set(appointments.map((a) => a.locationId))];
    const appointmentIds = appointments.map((a) => a._id);

    const [services, staffs, locations, payments, customStatuses] = await Promise.all([
      Service.find({ _id: { $in: serviceIds } }).select('name price durationMinutes').lean(),
      Staff.find({ _id: { $in: staffIds } }).select('name colorCode').lean(),
      Location.find({ _id: { $in: locationIds } }).select('name').lean(),
      AppointmentPayment.find({ appointmentId: { $in: appointmentIds } }).select('appointmentId amount status paymentType').lean(),
      CustomStatus.find({ businessId: context.businessId }).select('title statusColor').lean(),
    ]);

    const serviceMap = new Map(services.map((s) => [String(s._id), s]));
    const staffMap = new Map(staffs.map((st) => [String(st._id), st]));
    const locationMap = new Map(locations.map((l) => [String(l._id), l]));
    const paymentMap = new Map(payments.map((p) => [String(p.appointmentId), p]));
    const statusMap = new Map(customStatuses.map((cs) => [cs.title.toLowerCase(), cs.statusColor]));

    const events: CalendarEvent[] = appointments.map((apt) => {
      const service = serviceMap.get(String(apt.serviceId));
      const staff = staffMap.get(String(apt.staffId));
      const location = locationMap.get(String(apt.locationId));
      const payment = paymentMap.get(String(apt._id));

      const { start: startTime, end: endTime } = parseTimeSlot(apt.time);
      const startIso = `${apt.date}T${startTime}:00`;
      const endIso = `${apt.date}T${endTime}:00`;

      const status = apt.appointmentStatus || 'Pending';
      const statusColor = statusMap.get(status.toLowerCase()) || '#3b82f6';
      const staffColor = staff?.colorCode || '#CEEDC1';

      return {
        id: String(apt._id),
        title: `${service?.name || 'Appointment'} - ${apt.name}`,
        start: startIso,
        end: endIso,
        backgroundColor: staffColor,
        borderColor: statusColor,
        textColor: '#1f2937',
        extendedProps: {
          appointmentNumber: apt.appointmentNumber,
          customerName: apt.name,
          customerEmail: apt.email,
          customerType: apt.customerType || 'guest-user',
          customerContact: apt.contact,
          serviceName: service?.name || 'Standard Service',
          durationMinutes: apt.durationMinutes || service?.durationMinutes || 30,
          date: apt.date,
          time: apt.time,
          staffId: String(apt.staffId),
          staffName: staff?.name || 'Assigned Staff',
          staffColor,
          locationId: String(apt.locationId),
          locationName: location?.name || 'Downtown Location',
          status,
          statusColor,
          price: apt.price ?? service?.price ?? 0,
          paymentType: apt.paymentType || 'Cash',
          paymentStatus: payment?.status || apt.paymentStatus || 'unpaid',
          notes: apt.notes,
        },
      };
    });

    return { success: true, data: events };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch calendar appointments.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves paginated, filterable, and searchable appointments for company dashboard data tables.
 */
export async function getCompanyAppointments(
  filters: AppointmentQueryFilters = {}
): Promise<PaginatedAppointmentsResponse> {
  try {
    const { context, error } = await getTenantContext(filters.businessId);
    if (error || !context) {
      return { success: false, error };
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 10));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      businessId: context.businessId,
      companyId: context.companyId,
    };

    if (filters.status && filters.status !== 'all') {
      query.appointmentStatus = filters.status;
    }

    if (filters.staffId && Types.ObjectId.isValid(filters.staffId)) {
      query.staffId = new Types.ObjectId(filters.staffId);
    }

    if (filters.locationId && Types.ObjectId.isValid(filters.locationId)) {
      query.locationId = new Types.ObjectId(filters.locationId);
    }

    if (filters.serviceId && Types.ObjectId.isValid(filters.serviceId)) {
      query.serviceId = new Types.ObjectId(filters.serviceId);
    }

    if (filters.startDate && filters.endDate) {
      query.date = { $gte: filters.startDate, $lte: filters.endDate };
    } else if (filters.startDate) {
      query.date = { $gte: filters.startDate };
    } else if (filters.endDate) {
      query.date = { $lte: filters.endDate };
    }

    if (filters.search && filters.search.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      query.$or = [
        { appointmentNumber: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
        { contact: searchRegex },
      ];
    }

    const [total, rawAppointments] = await Promise.all([
      Appointment.countDocuments(query),
      Appointment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    if (rawAppointments.length === 0) {
      return {
        success: true,
        data: {
          appointments: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          totalRevenue: 0,
        },
      };
    }

    const serviceIds = [...new Set(rawAppointments.map((a) => a.serviceId))];
    const staffIds = [...new Set(rawAppointments.map((a) => a.staffId))];
    const locationIds = [...new Set(rawAppointments.map((a) => a.locationId))];
    const appointmentIds = rawAppointments.map((a) => a._id);

    const [services, staffs, locations, payments, customStatuses, revenueAgg] = await Promise.all([
      Service.find({ _id: { $in: serviceIds } }).select('name price durationMinutes').lean(),
      Staff.find({ _id: { $in: staffIds } }).select('name colorCode').lean(),
      Location.find({ _id: { $in: locationIds } }).select('name').lean(),
      AppointmentPayment.find({ appointmentId: { $in: appointmentIds } }).select('appointmentId amount status paymentType').lean(),
      CustomStatus.find({ businessId: context.businessId }).select('title statusColor').lean(),
      AppointmentPayment.aggregate([
        { $match: { businessId: context.businessId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const serviceMap = new Map(services.map((s) => [String(s._id), s]));
    const staffMap = new Map(staffs.map((st) => [String(st._id), st]));
    const locationMap = new Map(locations.map((l) => [String(l._id), l]));
    const paymentMap = new Map(payments.map((p) => [String(p.appointmentId), p]));
    const statusMap = new Map(customStatuses.map((cs) => [cs.title.toLowerCase(), cs.statusColor]));
    const totalRevenue = revenueAgg[0]?.total || 0;

    const appointments: AppointmentListItem[] = rawAppointments.map((apt) => {
      const service = serviceMap.get(String(apt.serviceId));
      const staff = staffMap.get(String(apt.staffId));
      const location = locationMap.get(String(apt.locationId));
      const payment = paymentMap.get(String(apt._id));
      const status = apt.appointmentStatus || 'Pending';
      const statusColor = statusMap.get(status.toLowerCase()) || '#3b82f6';

      return {
        id: String(apt._id),
        appointmentNumber: apt.appointmentNumber,
        date: apt.date,
        time: apt.time,
        customerName: apt.name,
        customerEmail: apt.email,
        customerContact: apt.contact,
        serviceId: apt.serviceId ? String(apt.serviceId) : undefined,
        serviceName: service?.name || 'Standard Service',
        servicePrice: service?.price || 0,
        durationMinutes: apt.durationMinutes || service?.durationMinutes || 30,
        staffId: apt.staffId ? String(apt.staffId) : undefined,
        staffName: staff?.name || 'Assigned Staff',
        staffColor: staff?.colorCode || '#CEEDC1',
        locationId: apt.locationId ? String(apt.locationId) : undefined,
        locationName: location?.name || 'Downtown Location',
        businessId: apt.businessId ? String(apt.businessId) : undefined,
        status,
        statusColor,
        paymentType: apt.paymentType || 'Manually',
        paymentStatus: payment?.status || 'unpaid',
        notes: apt.notes,
        createdAt: apt.createdAt ? apt.createdAt.toISOString() : new Date().toISOString(),
      };
    });

    return {
      success: true,
      data: {
        appointments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalRevenue,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve appointments.';
    return { success: false, error: message };
  }
}

/**
 * Updates an appointment's lifecycle status (Pending -> Confirmed -> Completed -> Cancelled).
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: string
): Promise<MutationResponse> {
  try {
    const { context, error } = await getTenantContext();
    if (error || !context) {
      return { success: false, error };
    }

    if (!Types.ObjectId.isValid(appointmentId)) {
      return { success: false, error: 'Invalid appointment ID.' };
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found.' };
    }

    if (String(appointment.companyId) !== String(context.companyId)) {
      return { success: false, error: 'Permission denied. Unauthorized appointment modification.' };
    }

    appointment.appointmentStatus = newStatus.trim();
    await appointment.save();

    // Dispatch status update email event asynchronously
    void dispatchAppointmentEmailEvent('appointment_status_changed', appointment._id, {
      status: newStatus.trim(),
    }).catch((err) => console.error('[EmailEvents] Status update email dispatch failed:', err));

    return {
      success: true,
      message: `Appointment ${appointment.appointmentNumber} status updated to ${newStatus}.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update appointment status.';
    return { success: false, error: message };
  }
}

/**
 * Safely reschedules an appointment to a new date and time slot with concurrency validation.
 */
export async function rescheduleAppointment(
  input: RescheduleAppointmentInput
): Promise<MutationResponse> {
  try {
    const { context, error } = await getTenantContext();
    if (error || !context) {
      return { success: false, error };
    }

    if (!Types.ObjectId.isValid(input.appointmentId)) {
      return { success: false, error: 'Invalid appointment ID.' };
    }

    const appointment = await Appointment.findById(input.appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found.' };
    }

    if (String(appointment.companyId) !== String(context.companyId)) {
      return { success: false, error: 'Permission denied. Unauthorized appointment modification.' };
    }

    const targetStaffId = input.newStaffId || String(appointment.staffId);

    const slotValidation = await validateSlotAvailability({
      businessId: String(appointment.businessId),
      serviceId: String(appointment.serviceId),
      staffId: targetStaffId,
      date: input.newDate,
      time: input.newTime,
      durationMinutes: appointment.durationMinutes || 30,
    });

    if (!slotValidation.available) {
      return {
        success: false,
        error: slotValidation.reason || 'The requested slot is already booked or outside working hours.',
      };
    }

    appointment.date = input.newDate;
    appointment.time = input.newTime;
    if (input.newStaffId && Types.ObjectId.isValid(input.newStaffId)) {
      appointment.staffId = new Types.ObjectId(input.newStaffId);
    }

    await appointment.save();

    // Dispatch reschedule email event asynchronously
    void dispatchAppointmentEmailEvent('appointment_rescheduled', appointment._id, {
      status: appointment.appointmentStatus,
      new_date: input.newDate,
      new_time: input.newTime,
    }).catch((err) => console.error('[EmailEvents] Reschedule email dispatch failed:', err));

    return {
      success: true,
      message: `Appointment ${appointment.appointmentNumber} successfully rescheduled to ${input.newDate} (${input.newTime}).`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reschedule appointment.';
    return { success: false, error: message };
  }
}

/**
 * Cancels an appointment safely.
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<MutationResponse> {
  try {
    const { context, error } = await getTenantContext();
    if (error || !context) {
      return { success: false, error };
    }

    if (!Types.ObjectId.isValid(appointmentId)) {
      return { success: false, error: 'Invalid appointment ID.' };
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found.' };
    }

    if (String(appointment.companyId) !== String(context.companyId)) {
      return { success: false, error: 'Permission denied.' };
    }

    appointment.appointmentStatus = 'Cancelled';
    if (reason && reason.trim()) {
      appointment.notes = appointment.notes
        ? `${appointment.notes}\n[Cancelled: ${reason.trim()}]`
        : `[Cancelled: ${reason.trim()}]`;
    }

    await appointment.save();

    // Dispatch cancellation email event asynchronously
    void dispatchAppointmentEmailEvent('appointment_cancelled', appointment._id, {
      status: 'Cancelled',
      cancellation_reason: reason || '',
    }).catch((err) => console.error('[EmailEvents] Cancellation email dispatch failed:', err));

    return {
      success: true,
      message: `Appointment ${appointment.appointmentNumber} has been marked as Cancelled.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel appointment.';
    return { success: false, error: message };
  }
}

/**
 * Aggregates high-level KPI metrics for the company admin dashboard overview screen.
 */
export async function getTenantDashboardMetrics(
  requestedBusinessId?: string
): Promise<DashboardMetricsResponse> {
  try {
    const { context, error } = await getTenantContext(requestedBusinessId);
    if (error || !context) {
      return { success: false, error };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const [
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      cancelledAppointments,
      revenueAgg,
      todayAppointmentsCount,
      recentRaw,
    ] = await Promise.all([
      Appointment.countDocuments({ businessId: context.businessId }),
      Appointment.countDocuments({ businessId: context.businessId, appointmentStatus: 'Pending' }),
      Appointment.countDocuments({ businessId: context.businessId, appointmentStatus: 'Completed' }),
      Appointment.countDocuments({ businessId: context.businessId, appointmentStatus: 'Cancelled' }),
      AppointmentPayment.aggregate([
        { $match: { businessId: context.businessId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Appointment.countDocuments({ businessId: context.businessId, date: todayStr }),
      Appointment.find({ businessId: context.businessId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    const serviceIds = [...new Set(recentRaw.map((a) => a.serviceId))];
    const staffIds = [...new Set(recentRaw.map((a) => a.staffId))];
    const locationIds = [...new Set(recentRaw.map((a) => a.locationId))];

    const [services, staffs, locations] = await Promise.all([
      Service.find({ _id: { $in: serviceIds } }).select('name price').lean(),
      Staff.find({ _id: { $in: staffIds } }).select('name colorCode').lean(),
      Location.find({ _id: { $in: locationIds } }).select('name').lean(),
    ]);

    const serviceMap = new Map(services.map((s) => [String(s._id), s]));
    const staffMap = new Map(staffs.map((st) => [String(st._id), st]));
    const locationMap = new Map(locations.map((l) => [String(l._id), l]));

    const recentAppointments: AppointmentListItem[] = recentRaw.map((apt) => {
      const service = serviceMap.get(String(apt.serviceId));
      const staff = staffMap.get(String(apt.staffId));
      const location = locationMap.get(String(apt.locationId));

      return {
        id: String(apt._id),
        appointmentNumber: apt.appointmentNumber,
        date: apt.date,
        time: apt.time,
        customerName: apt.name,
        customerEmail: apt.email,
        customerContact: apt.contact,
        serviceName: service?.name || 'Standard Service',
        servicePrice: service?.price || 0,
        staffName: staff?.name || 'Assigned Staff',
        staffColor: staff?.colorCode || '#CEEDC1',
        locationName: location?.name || 'Downtown Location',
        status: apt.appointmentStatus || 'Pending',
        statusColor: apt.appointmentStatus === 'Completed' ? '#8b5cf6' : '#3b82f6',
        paymentType: apt.paymentType || 'Manually',
        paymentStatus: 'unpaid',
        notes: apt.notes,
        createdAt: apt.createdAt ? apt.createdAt.toISOString() : new Date().toISOString(),
      };
    });

    return {
      success: true,
      data: {
        totalAppointments,
        pendingAppointments,
        completedAppointments,
        cancelledAppointments,
        totalRevenue,
        todayAppointmentsCount,
        todayAppointments: [],
        recentAppointments,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve dashboard metrics.';
    return { success: false, error: message };
  }
}
