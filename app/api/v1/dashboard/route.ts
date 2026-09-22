import { type NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { authenticateApiRequest, apiSuccess, apiError } from '@/lib/api-auth';
import { Business } from '@/models/Business';
import { Appointment } from '@/models/Appointment';
import { AppointmentPayment } from '@/models/AppointmentPayment';
import { Service } from '@/models/Service';
import { formatBusinessPrice } from '@/lib/currency-engine';

export const dynamic = 'force-dynamic';

/**
 * Mobile / Headless REST API Tenant Dashboard Handler.
 * GET /api/v1/dashboard
 * Header: Authorization: Bearer <token>
 */
export async function GET(req: NextRequest) {
  try {
    const { user, businessId } = await authenticateApiRequest(req);

    if (!businessId) {
      return apiError('Active business not established for user.', 400);
    }

    const businessObjId = new Types.ObjectId(businessId);
    const business = await Business.findById(businessObjId).lean();
    if (!business) {
      return apiError('Active business not found.', 404);
    }

    const companyId = user.role === 'company' ? user._id : user.companyId || user._id;

    // 1. Total business count
    const totalBusiness = await Business.countDocuments({ companyId });

    // 2. Total appointments for this business
    const totalAppointment = await Appointment.countDocuments({ businessId: businessObjId });

    // 3. Total revenue
    const revenueAgg = await AppointmentPayment.aggregate([
      { $match: { businessId: businessObjId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const rawRevenue = revenueAgg[0]?.total || 0;
    const totalRevenue = await formatBusinessPrice(rawRevenue, businessObjId);

    // 4. Appointment chart for previous 7 days
    const appointmentChart: Array<{ date: string; appointment: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dayLabel = targetDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }); // "23-Sep"

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const count = await Appointment.countDocuments({
        businessId: businessObjId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });

      appointmentChart.push({
        date: dayLabel,
        appointment: count,
      });
    }

    // 5. Latest 5 services
    const latestServicesDocs = await Service.find({ businessId: businessObjId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const product = latestServicesDocs.map((s) => ({
      id: String(s._id),
      name: s.name,
      price: s.price,
      image: s.image || '',
    }));

    // 6. Latest 5 appointments
    const latestApptDocs = await Appointment.find({ businessId: businessObjId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('staffId', 'name')
      .populate('serviceId', 'name')
      .populate('locationId', 'name')
      .lean();

    interface DashboardApptItem {
      _id: unknown;
      appointmentNumber?: string;
      date: string;
      time: string;
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

    const appointment = latestApptDocs.map((doc: unknown) => {
      const a = doc as DashboardApptItem;
      return {
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
      };
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const businessUrl = `${baseUrl}/appointments/${business.slug}`;

    return apiSuccess({
      total_business: totalBusiness,
      total_appointment: totalAppointment,
      total_revenue: totalRevenue,
      business_url: businessUrl,
      appointmentChart,
      product,
      appointment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve dashboard.';
    return apiError(message, 401);
  }
}
