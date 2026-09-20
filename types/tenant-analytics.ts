import { z } from 'zod';

export interface TenantKpiMetrics {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalRevenue: number;
  formattedRevenue: string;
  todayAppointmentsCount: number;
  uniqueCustomersCount: number;
}

export interface DailyAppointmentRevenueMetric {
  date: string; // "20-Sep"
  fullDate: string; // "2026-09-20"
  appointments: number;
  revenue: number;
}

export interface StaffWorkloadMetric {
  staffId: string;
  staffName: string;
  staffColor: string;
  appointmentCount: number;
  revenue: number;
}

export interface TopServiceMetric {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  totalRevenue: number;
  percentageShare: number;
}

export interface StatusBreakdownMetric {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TodayAppointmentItem {
  id: string;
  appointmentNumber: string;
  customerName: string;
  customerEmail: string;
  customerContact: string;
  serviceName: string;
  servicePrice: number;
  staffName: string;
  staffColor: string;
  locationName: string;
  date: string;
  time: string;
  status: string;
  statusColor: string;
  paymentType: string;
  paymentStatus: string;
}

export interface TenantTimelineChartData {
  days: string[]; // ["14-Sep", "15-Sep", ...]
  fullDates: string[]; // ["2026-09-14", "2026-09-15", ...]
  appointmentsPerDay: Record<string, number>;
  revenuePerDay: Record<string, number>;
  maxDayAppointments: number;
  maxDayRevenue: number;
}

export interface TenantDashboardAnalyticsDTO {
  kpis: TenantKpiMetrics;
  chart: TenantTimelineChartData;
  staffWorkload: StaffWorkloadMetric[];
  topServices: TopServiceMetric[];
  statusBreakdown: StatusBreakdownMetric[];
  todayAppointments: TodayAppointmentItem[];
}

export const tenantAnalyticsFilterSchema = z.object({
  durationDays: z.number().int().min(1).max(90).optional().default(7),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  staffId: z.string().optional(),
  requestedBusinessId: z.string().optional(),
});

export type TenantAnalyticsFilterInput = z.infer<typeof tenantAnalyticsFilterSchema>;

export interface TenantAnalyticsActionResponse {
  success: boolean;
  data?: TenantDashboardAnalyticsDTO;
  error?: string;
}
