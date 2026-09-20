import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Appointment } from '@/models/Appointment';
import { AppointmentPayment } from '@/models/AppointmentPayment';
import { Staff } from '@/models/Staff';
import { Service } from '@/models/Service';
import { Location } from '@/models/Location';
import { Business } from '@/models/Business';
import type {
  TenantDashboardAnalyticsDTO,
  TenantKpiMetrics,
  TenantTimelineChartData,
  StaffWorkloadMetric,
  TopServiceMetric,
  StatusBreakdownMetric,
  TodayAppointmentItem,
} from '@/types/tenant-analytics';

export interface ComputeTenantAnalyticsParams {
  companyId: Types.ObjectId | string;
  businessId: Types.ObjectId | string;
  durationDays?: number;
  startDate?: string;
  endDate?: string;
  staffId?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDayLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[date.getMonth()];
  return `${day}-${month}`;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDmyDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function getStatusColor(status: string): string {
  const s = (status || '').toLowerCase().trim();
  if (s === 'completed') return '#10b981';
  if (s === 'confirmed') return '#3b82f6';
  if (s === 'pending') return '#f59e0b';
  if (s === 'cancelled' || s === 'canceled') return '#ef4444';
  return '#6b7280';
}

/**
 * High-performance, isolated tenant aggregation engine replicating
 * Laravel WorkDo's `HomeController@AppointmentDashboard` and `getDashboardChart`.
 */
export async function computeTenantDashboardAnalytics({
  companyId,
  businessId,
  durationDays = 7,
  startDate,
  endDate,
  staffId,
}: ComputeTenantAnalyticsParams): Promise<TenantDashboardAnalyticsDTO> {
  await connectToDatabase();

  const targetBusinessId =
    typeof businessId === 'string' ? new Types.ObjectId(businessId) : businessId;
  const targetCompanyId =
    typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;

  // Retrieve business settings for currency symbol
  const business = await Business.findById(targetBusinessId).select('currencySymbol name').lean();
  const currencySymbol = business?.currencySymbol || '$';

  // Base isolation filter ensuring no cross-tenant leakage
  const baseFilter: Record<string, unknown> = {
    businessId: targetBusinessId,
    ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
  };

  if (staffId && Types.ObjectId.isValid(staffId)) {
    baseFilter.staffId = new Types.ObjectId(staffId);
  }

  const today = new Date();
  const todayIso = formatIsoDate(today);
  const todayDmy = formatDmyDate(today);

  // 1. High-Level KPI Counts & Revenue Aggregation
  const [
    totalAppointments,
    pendingAppointments,
    completedAppointments,
    cancelledAppointments,
    revenueAgg,
    todayAppointmentsCount,
    distinctCustomers,
    todayRawList,
  ] = await Promise.all([
    Appointment.countDocuments(baseFilter),
    Appointment.countDocuments({
      ...baseFilter,
      appointmentStatus: { $regex: /^pending$/i },
    }),
    Appointment.countDocuments({
      ...baseFilter,
      appointmentStatus: { $regex: /^completed$/i },
    }),
    Appointment.countDocuments({
      ...baseFilter,
      appointmentStatus: { $regex: /^cancelled$|^canceled$/i },
    }),
    AppointmentPayment.aggregate([
      {
        $match: {
          businessId: targetBusinessId,
          status: { $ne: 'failed' },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]),
    Appointment.countDocuments({
      ...baseFilter,
      $or: [{ date: todayIso }, { date: todayDmy }],
    }),
    Appointment.distinct('email', baseFilter),
    Appointment.find({
      ...baseFilter,
      $or: [{ date: todayIso }, { date: todayDmy }],
    })
      .sort({ time: 1, createdAt: 1 })
      .limit(10)
      .lean(),
  ]);

  const totalRevenue = revenueAgg[0]?.total || 0;
  const formattedRevenue = `${currencySymbol}${totalRevenue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const kpis: TenantKpiMetrics = {
    totalAppointments,
    pendingAppointments,
    completedAppointments,
    cancelledAppointments,
    totalRevenue,
    formattedRevenue,
    todayAppointmentsCount,
    uniqueCustomersCount: (distinctCustomers || []).length,
  };

  // 2. Continuous Zero-Gap Rolling Timeline (Appointments & Revenue)
  const windowDays = Math.max(1, Math.min(durationDays, 90));
  const days: string[] = [];
  const fullDates: string[] = [];
  const appointmentsPerDay: Record<string, number> = {};
  const revenuePerDay: Record<string, number> = {};
  const isoToLabelMap: Record<string, string> = {};
  const dmyToLabelMap: Record<string, string> = {};

  let timelineStart: Date;
  let timelineEnd: Date;
  let calculatedWindowDays = windowDays;

  if (startDate && endDate) {
    timelineStart = new Date(startDate);
    timelineStart.setHours(0, 0, 0, 0);
    timelineEnd = new Date(endDate);
    timelineEnd.setHours(23, 59, 59, 999);
    const diffTime = Math.abs(timelineEnd.getTime() - timelineStart.getTime());
    calculatedWindowDays = Math.max(1, Math.min(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 90));
  } else {
    timelineStart = new Date(today);
    timelineStart.setDate(today.getDate() - (windowDays - 1));
    timelineStart.setHours(0, 0, 0, 0);
    timelineEnd = new Date(today);
    timelineEnd.setHours(23, 59, 59, 999);
  }

  for (let i = 0; i < calculatedWindowDays; i++) {
    const d = new Date(timelineStart);
    d.setDate(timelineStart.getDate() + i);

    const label = formatDayLabel(d);
    const iso = formatIsoDate(d);
    const dmy = formatDmyDate(d);

    days.push(label);
    fullDates.push(iso);
    appointmentsPerDay[label] = 0;
    revenuePerDay[label] = 0;
    isoToLabelMap[iso] = label;
    dmyToLabelMap[dmy] = label;
  }

  // Query appointments within the rolling timeline
  const targetDateKeys = [...Object.keys(isoToLabelMap), ...Object.keys(dmyToLabelMap)];
  const [appointmentsInTimeline, paymentsInTimeline] = await Promise.all([
    Appointment.find({
      ...baseFilter,
      date: { $in: targetDateKeys },
    })
      .select('date')
      .lean(),
    AppointmentPayment.aggregate([
      {
        $match: {
          businessId: targetBusinessId,
          status: { $ne: 'failed' },
          paymentDate: { $gte: timelineStart, $lte: timelineEnd },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' },
          },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  for (const apt of appointmentsInTimeline) {
    const rawDate = apt.date;
    const label = isoToLabelMap[rawDate] || dmyToLabelMap[rawDate];
    if (label && appointmentsPerDay[label] !== undefined) {
      appointmentsPerDay[label] += 1;
    }
  }

  for (const p of paymentsInTimeline) {
    const isoKey = p._id;
    const label = isoToLabelMap[isoKey];
    if (label && revenuePerDay[label] !== undefined) {
      revenuePerDay[label] = Number((revenuePerDay[label] + (p.totalAmount || 0)).toFixed(2));
    }
  }

  let maxDayAppointments = 0;
  let maxDayRevenue = 0;
  for (const d of days) {
    if (appointmentsPerDay[d] > maxDayAppointments) {
      maxDayAppointments = appointmentsPerDay[d];
    }
    if (revenuePerDay[d] > maxDayRevenue) {
      maxDayRevenue = revenuePerDay[d];
    }
  }

  const chart: TenantTimelineChartData = {
    days,
    fullDates,
    appointmentsPerDay,
    revenuePerDay,
    maxDayAppointments,
    maxDayRevenue,
  };

  // 3. Staff Workload Distribution
  const staffAgg = await Appointment.aggregate([
    { $match: { businessId: targetBusinessId } },
    {
      $group: {
        _id: '$staffId',
        appointmentCount: { $sum: 1 },
        revenue: { $sum: '$price' },
      },
    },
    { $sort: { appointmentCount: -1 } },
    { $limit: 10 },
  ]);

  const staffIds = staffAgg.map((s) => s._id).filter(Boolean);
  const staffRecords = await Staff.find({ _id: { $in: staffIds } })
    .select('name colorCode')
    .lean();
  const staffMap = new Map(staffRecords.map((st) => [String(st._id), st]));

  const staffWorkload: StaffWorkloadMetric[] = staffAgg.map((sa) => {
    const st = staffMap.get(String(sa._id));
    return {
      staffId: String(sa._id || ''),
      staffName: st?.name || 'Unassigned Staff',
      staffColor: st?.colorCode || '#CEEDC1',
      appointmentCount: sa.appointmentCount || 0,
      revenue: sa.revenue || 0,
    };
  });

  // 4. Top Booked Services Leaderboard
  const serviceAgg = await Appointment.aggregate([
    { $match: { businessId: targetBusinessId } },
    {
      $group: {
        _id: '$serviceId',
        bookingCount: { $sum: 1 },
        totalRevenue: { $sum: '$price' },
      },
    },
    { $sort: { bookingCount: -1 } },
    { $limit: 6 },
  ]);

  const serviceIds = serviceAgg.map((s) => s._id).filter(Boolean);
  const serviceRecords = await Service.find({ _id: { $in: serviceIds } })
    .select('name price')
    .lean();
  const serviceMap = new Map(serviceRecords.map((sr) => [String(sr._id), sr]));

  const totalBookingsCount = totalAppointments || 1;
  const topServices: TopServiceMetric[] = serviceAgg.map((sa) => {
    const s = serviceMap.get(String(sa._id));
    const bookingCount = sa.bookingCount || 0;
    const percentageShare = Math.round((bookingCount / totalBookingsCount) * 100);

    return {
      serviceId: String(sa._id || ''),
      serviceName: s?.name || 'Custom Service',
      bookingCount,
      totalRevenue: sa.totalRevenue || 0,
      percentageShare,
    };
  });

  // 5. Status Breakdown Distribution
  const statusAgg = await Appointment.aggregate([
    { $match: { businessId: targetBusinessId } },
    {
      $group: {
        _id: '$appointmentStatus',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const statusBreakdown: StatusBreakdownMetric[] = statusAgg.map((st) => {
    const statusName = st._id || 'Pending';
    const count = st.count || 0;
    const percentage = totalAppointments > 0 ? Math.round((count / totalAppointments) * 100) : 0;
    return {
      status: statusName,
      count,
      percentage,
      color: getStatusColor(statusName),
    };
  });

  // 6. Today's Appointments Details List (Replicating today-appointment-slider)
  const todayLocationIds = todayRawList.map((a) => a.locationId).filter(Boolean);
  const todayServiceIds = todayRawList.map((a) => a.serviceId).filter(Boolean);
  const todayStaffIds = todayRawList.map((a) => a.staffId).filter(Boolean);

  const [todayLocations, todayServices, todayStaffs] = await Promise.all([
    Location.find({ _id: { $in: todayLocationIds } }).select('name').lean(),
    Service.find({ _id: { $in: todayServiceIds } }).select('name price').lean(),
    Staff.find({ _id: { $in: todayStaffIds } }).select('name colorCode').lean(),
  ]);

  const todayLocMap = new Map(todayLocations.map((l) => [String(l._id), l]));
  const todaySvcMap = new Map(todayServices.map((s) => [String(s._id), s]));
  const todayStfMap = new Map(todayStaffs.map((st) => [String(st._id), st]));

  const todayAppointments: TodayAppointmentItem[] = todayRawList.map((apt) => {
    const loc = todayLocMap.get(String(apt.locationId));
    const svc = todaySvcMap.get(String(apt.serviceId));
    const stf = todayStfMap.get(String(apt.staffId));

    return {
      id: String(apt._id),
      appointmentNumber: apt.appointmentNumber || '',
      customerName: apt.name || 'Guest Customer',
      customerEmail: apt.email || '',
      customerContact: apt.contact || '',
      serviceName: svc?.name || 'Standard Service',
      servicePrice: svc?.price || apt.price || 0,
      staffName: stf?.name || 'Assigned Staff',
      staffColor: stf?.colorCode || '#CEEDC1',
      locationName: loc?.name || 'Main Branch',
      date: apt.date,
      time: apt.time,
      status: apt.appointmentStatus || 'Pending',
      statusColor: getStatusColor(apt.appointmentStatus),
      paymentType: apt.paymentType || 'Manual',
      paymentStatus: apt.paymentStatus || 'unpaid',
    };
  });

  return {
    kpis,
    chart,
    staffWorkload,
    topServices,
    statusBreakdown,
    todayAppointments,
  };
}
