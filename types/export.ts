export type TenantResetScope =
  | 'appointments_and_payments'
  | 'test_data_with_customers'
  | 'full_catalog_and_bookings';

export interface TenantBackupMeta {
  version: string;
  platform: string;
  exportedAt: string;
  companyId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  counts: {
    locations: number;
    categories: number;
    services: number;
    staff: number;
    customStatuses: number;
    customFields: number;
    customers: number;
    appointments: number;
    payments: number;
    testimonials: number;
    blogs: number;
  };
}

export interface TenantBackupBundle {
  meta: TenantBackupMeta;
  business: Record<string, unknown>;
  locations: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  services: Array<Record<string, unknown>>;
  staff: Array<Record<string, unknown>>;
  customStatuses: Array<Record<string, unknown>>;
  customFields: Array<Record<string, unknown>>;
  customers: Array<Record<string, unknown>>;
  appointments: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  testimonials: Array<Record<string, unknown>>;
  blogs: Array<Record<string, unknown>>;
}

export interface ExportActionResult {
  success: boolean;
  data?: string;
  filename?: string;
  contentType?: string;
  error?: string;
}

export interface AppointmentExportFilter {
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
}

export interface ServiceExportFilter {
  categoryId?: string;
  status?: 'all' | 'active' | 'inactive';
}

export interface PaymentExportFilter {
  paymentMethod?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
}

export interface StaffExportFilter {
  status?: 'all' | 'active' | 'inactive';
  locationId?: string;
}

export interface ResetTenantDataInput {
  scope: TenantResetScope;
  confirmationText: string;
}

export interface ResetTenantDataResult {
  success: boolean;
  scope?: TenantResetScope;
  deletedCounts?: Record<string, number>;
  purgedAt?: string;
  error?: string;
}

export interface ValidateBackupResult {
  valid: boolean;
  version?: string;
  exportedAt?: string;
  businessName?: string;
  counts?: Record<string, number>;
  errors?: string[];
}
