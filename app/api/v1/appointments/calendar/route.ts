import { type NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { authenticateApiRequest, apiSuccess, apiError } from '@/lib/api-auth';
import { Appointment } from '@/models/Appointment';

export const dynamic = 'force-dynamic';

/**
 * Mobile / Headless REST API Appointment Calendar Data Handler.
 * GET /api/v1/appointments/calendar?year=YYYY&month=M
 */
export async function GET(req: NextRequest) {
  try {
    const { businessId } = await authenticateApiRequest(req);
    if (!businessId) {
      return apiError('Active business not established.', 400);
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);

    const padMonth = String(month).padStart(2, '0');
    // Date formats in appointments are either YYYY-MM-DD or DD-MM-YYYY
    // We match any date containing the month and year
    const dateRegex = new RegExp(`(${year}-${padMonth}|${padMonth}-${year})`);

    const appointments = await Appointment.find({
      businessId: new Types.ObjectId(businessId),
      date: { $regex: dateRegex },
    })
      .populate('serviceId', 'name')
      .lean();

    interface CalendarApptDoc {
  _id: unknown;
  appointmentNumber?: string;
  serviceId?: { name?: string };
  time?: string;
  date?: string;
  appointmentStatus?: string;
  statusColor?: string;
}

    const calendarList = (appointments as unknown as CalendarApptDoc[]).map((a) => {
      const timeStr = String(a.time || '10:00');
      let from_time = timeStr;
      let to_time = timeStr;

      if (timeStr.includes('-')) {
        const parts = timeStr.split('-');
        from_time = parts[0]?.trim() || '';
        to_time = parts[1]?.trim() || '';
      }

      return {
        id: String(a._id),
        appointment_number: a.appointmentNumber || `#APP-${String(a._id).slice(-6)}`,
        service: a.serviceId?.name || '-',
        from_time,
        to_time,
        date: a.date,
        status: a.appointmentStatus || 'Confirmed',
        status_color: a.statusColor || '#21c9b0',
      };
    });

    return apiSuccess(calendarList);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve calendar data.';
    return apiError(message, 401);
  }
}
