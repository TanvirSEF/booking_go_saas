import { type NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { authenticateApiRequest, apiSuccess, apiError } from '@/lib/api-auth';
import { Appointment } from '@/models/Appointment';
import { Service } from '@/models/Service';

export const dynamic = 'force-dynamic';

/**
 * Mobile / Headless REST API Appointments Management Handler.
 * GET /api/v1/appointments
 * DELETE /api/v1/appointments
 */

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await authenticateApiRequest(req);
    if (!businessId) {
      return apiError('Active business not established.', 400);
    }

    const businessObjId = new Types.ObjectId(businessId);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const skip = (page - 1) * limit;
    const serviceIdParam = searchParams.get('service_id');

    // Load services for filter dropdown
    const services = await Service.find({ businessId: businessObjId }).lean();
    const service_list = [
      { id: '0', name: 'All' },
      ...services.map((s) => ({ id: String(s._id), name: s.name })),
    ];

    const filter: Record<string, unknown> = { businessId: businessObjId };
    if (serviceIdParam && serviceIdParam !== '0' && Types.ObjectId.isValid(serviceIdParam)) {
      filter.serviceId = new Types.ObjectId(serviceIdParam);
    }

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('staffId', 'name')
        .populate('serviceId', 'name')
        .populate('locationId', 'name')
        .lean(),
    ]);

    interface PopulatedApptDoc {
      _id: unknown;
      appointmentNumber?: string;
      date?: string;
      time?: string;
      durationMinutes?: number;
      name?: string;
      email?: string;
      contact?: string;
      staffId?: { name?: string };
      serviceId?: { name?: string };
      locationId?: { name?: string };
      paymentType?: string;
      appointmentStatus?: string;
      statusColor?: string;
    }

    const appointment_list = (appointments as unknown as PopulatedApptDoc[]).map((a) => ({
      id: String(a._id),
      appointment_number: a.appointmentNumber || `#APP-${String(a._id).slice(-6)}`,
      date: a.date,
      duration: `${a.time} (${a.durationMinutes || 60}m)`,
      customer: a.name || 'Guest',
      email: a.email || '-',
      contact: a.contact || '-',
      staff: a.staffId?.name || '-',
      service: a.serviceId?.name || '-',
      location: a.locationId?.name || '-',
      payment: a.paymentType || '-',
      status: a.appointmentStatus || 'Pending',
      status_color: a.statusColor || '#21c9b0',
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return apiSuccess({
      service_list,
      appointment_list,
      total,
      per_page: limit,
      current_page: page,
      last_page: totalPages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve appointments.';
    return apiError(message, 401);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { businessId } = await authenticateApiRequest(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('Appointment id query param is required.', 400);
    }

    const appointment = await Appointment.findOne({ _id: id, businessId });
    if (!appointment) {
      return apiError('Appointment not found.', 404);
    }

    await appointment.deleteOne();

    return apiSuccess({ message: 'Appointment successfully deleted.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete appointment.';
    return apiError(message, 400);
  }
}
