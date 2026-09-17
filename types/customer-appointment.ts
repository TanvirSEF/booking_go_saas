export interface CustomerAppointmentItem {
  id: string;
  appointmentNumber: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  businessCurrency: string;
  businessCurrencySymbol: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  staffId: string;
  staffName: string;
  staffColor: string;
  locationId: string;
  locationName: string;
  locationAddress?: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "09:00 - 09:30"
  appointmentStatus: string;
  statusColor: string;
  paymentType: string;
  paymentStatus: string;
  notes?: string;
  isPast: boolean;
  canCancel: boolean;
  canReschedule: boolean;
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  contact: string;
  avatar?: string;
  gender?: string;
  dob?: string;
}

export interface CustomerDashboardOverview {
  upcomingAppointments: CustomerAppointmentItem[];
  pastAppointments: CustomerAppointmentItem[];
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  customerProfile: CustomerProfile;
}

export interface CustomerCancelInput {
  appointmentId: string;
  reason?: string;
}

export interface CustomerRescheduleInput {
  appointmentId: string;
  newDate: string; // YYYY-MM-DD or DD-MM-YYYY
  newTime: string; // e.g. "10:00 - 10:30"
  newStaffId?: string;
}

export interface CustomerProfileUpdateInput {
  name: string;
  contact: string;
  gender?: 'male' | 'female' | 'other' | '';
  dob?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface CustomerActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
