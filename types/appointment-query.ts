export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    appointmentNumber: string;
    customerName: string;
    customerEmail: string;
    customerType?: string;
    customerContact: string;
    serviceName: string;
    durationMinutes?: number;
    time?: string;
    date?: string;
    staffId?: string;
    staffName: string;
    staffColor: string;
    locationId?: string;
    locationName: string;
    status: string;
    statusColor: string;
    price: number;
    paymentType: string;
    paymentStatus: string;
    notes?: string;
  };
}

export interface AppointmentQueryFilters {
  page?: number;
  limit?: number;
  status?: string;
  staffId?: string;
  locationId?: string;
  serviceId?: string;
  search?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  businessId?: string;
}

export interface AppointmentListItem {
  id: string;
  appointmentNumber: string;
  date: string;
  time: string;
  customerName: string;
  customerEmail: string;
  customerContact: string;
  serviceName: string;
  servicePrice: number;
  staffName: string;
  staffColor: string;
  locationName: string;
  status: string;
  statusColor: string;
  paymentType: string;
  paymentStatus: string;
  notes?: string;
  createdAt: string;
}

export interface PaginatedAppointmentsResponse {
  success: boolean;
  data?: {
    appointments: AppointmentListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    totalRevenue: number;
  };
  error?: string;
}

export interface CalendarEventsResponse {
  success: boolean;
  data?: CalendarEvent[];
  error?: string;
}

export interface TenantDashboardMetrics {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalRevenue: number;
  todayAppointmentsCount: number;
  todayAppointments: AppointmentListItem[];
  recentAppointments: AppointmentListItem[];
}

export interface DashboardMetricsResponse {
  success: boolean;
  data?: TenantDashboardMetrics;
  error?: string;
}

export interface RescheduleAppointmentInput {
  appointmentId: string;
  newDate: string; // YYYY-MM-DD
  newTime: string; // "10:00 - 10:30"
  newStaffId?: string;
}

export interface MutationResponse {
  success: boolean;
  message?: string;
  error?: string;
}
