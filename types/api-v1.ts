export interface ApiJwtPayload {
  userId: string;
  email: string;
  role: string;
  activeBusinessId?: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiBusinessDto {
  id: string;
  name: string;
  slug: string;
  url: string;
}

export interface ApiServiceDto {
  id: string;
  name: string;
  category: string;
  image: string;
  price: string | number;
  duration: number;
  description: string;
}

export interface ApiAppointmentDto {
  id: string;
  appointment_number: string;
  date: string;
  duration: string;
  customer: string;
  email: string;
  contact: string;
  staff: string;
  service: string;
  location: string;
  payment: string;
  status: string;
  status_color: string;
}

export interface ApiCustomStatusDto {
  id: string;
  title: string;
  status_color: string;
}

export interface ApiDashboardData {
  total_business: number;
  total_appointment: number;
  total_revenue: string;
  business_url: string;
  appointmentChart: Array<{ date: string; appointment: number }>;
  product: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
  }>;
  appointment: ApiAppointmentDto[];
}
