import type { DeviceType } from '@/lib/user-agent';
import type { LoginStatus } from '@/models/LoginDetail';

export interface LoginDetailDTO {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role: string;
  ip: string;
  browser: string;
  os: string;
  deviceType: DeviceType;
  country?: string;
  city?: string;
  status: LoginStatus;
  loginAt: string;
}

export interface LoginDetailFilterParams {
  page?: number;
  limit?: number;
  userId?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface DeviceTypeBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
  other: number;
}

export interface PaginatedLoginDetailsResult {
  logs: LoginDetailDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  deviceBreakdown: DeviceTypeBreakdown;
}

export interface RecordLoginInput {
  userId: string;
  companyId?: string | null;
  businessId?: string | null;
  role: string;
  ip: string;
  userAgent?: string;
  status?: LoginStatus;
}

export interface LoginDetailActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
