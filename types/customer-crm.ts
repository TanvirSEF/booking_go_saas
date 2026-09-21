export interface CustomerCRMItem {
  id: string;
  name: string;
  email: string;
  contact: string;
  gender?: string;
  dob?: string;
  description?: string;
  avatar?: string;
  userId?: string | null;
  isActive?: boolean;
  isEnableLogin?: boolean;
  suspendedReason?: string | null;
  suspendedAt?: string | null;
  totalAppointments: number;
  completedAppointments: number;
  totalSpent: number;
  lastAppointmentDate?: string | null;
  createdAt: string;
}

export interface CustomerAppointmentSummary {
  id: string;
  appointmentNumber: string;
  serviceName: string;
  staffName: string;
  locationName: string;
  date: string;
  time: string;
  price: number;
  paymentType: string;
  paymentStatus: string;
  appointmentStatus: string;
  statusColor: string;
  createdAt: string;
}

export interface CustomerDetailDTO {
  customer: CustomerCRMItem;
  appointments: CustomerAppointmentSummary[];
}

export interface CustomerFilterParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name' | 'totalSpent' | 'totalAppointments';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerListResponse {
  customers: CustomerCRMItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  contact: string;
  gender?: 'male' | 'female' | 'other' | '';
  dob?: string;
  description?: string;
  password?: string;
}

export interface UpdateCustomerInput {
  id: string;
  name?: string;
  email?: string;
  contact?: string;
  gender?: 'male' | 'female' | 'other' | '';
  dob?: string;
  description?: string;
}

export interface CustomerActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
