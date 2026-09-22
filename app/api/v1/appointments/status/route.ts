import { type NextRequest } from 'next/server';
import { authenticateApiRequest, apiSuccess, apiError } from '@/lib/api-auth';
import { Appointment } from '@/models/Appointment';

export const dynamic = 'force-dynamic';

/**
 * Mobile / Headless REST API Appointment Status Update Handler.
 * PATCH /api/v1/appointments/status
 * Body: { appointment_id, status, status_color }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { businessId } = await authenticateApiRequest(req);
    const body = await req.json().catch(() => ({}));
    const { appointment_id, status, status_color } = body;

    if (!appointment_id || !status) {
      return apiError('appointment_id and status are required.', 400);
    }

    const appointment = await Appointment.findOne({ _id: appointment_id, businessId });
    if (!appointment) {
      return apiError('Appointment not found.', 404);
    }

    appointment.appointmentStatus = status.trim();
    if (status_color) {
      appointment.statusColor = status_color;
    }
    await appointment.save();

    return apiSuccess({ message: 'Appointment Status updated successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update appointment status.';
    return apiError(message, 400);
  }
}
