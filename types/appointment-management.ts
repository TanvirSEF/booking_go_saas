export interface AdminAppointmentDTO {
  _id: string;
  appointmentNumber: string;
  businessId: string;
  companyId: string;
  customerId?: string;
  customerType: string;
  name: string;
  email: string;
  contact: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  staffId: string;
  staffName: string;
  staffColor: string;
  locationId: string;
  locationName: string;
  date: string;
  time: string;
  paymentType: string;
  paymentStatus: string;
  appointmentStatus: string;
  statusColor?: string;
  attachment?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  paymentDetails?: {
    amount: number;
    discountAmount: number;
    finalAmount: number;
    paymentDate?: string;
    status: string;
  };
}

export interface AppointmentFilterParams {
  search?: string;
  status?: string;
  paymentStatus?: string;
  staffId?: string;
  locationId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AppointmentListResponse {
  success: boolean;
  data?: AdminAppointmentDTO[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}

export interface VerifyBankSlipInput {
  appointmentId: string;
  decision: 'approve' | 'reject';
  adminNote?: string;
}

export interface AppointmentActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}
