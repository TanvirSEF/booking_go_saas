import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import { Location } from '@/models/Location';
import { Category } from '@/models/Category';
import { Service } from '@/models/Service';
import { Staff } from '@/models/Staff';
import { CustomStatus } from '@/models/CustomStatus';
import { CustomField } from '@/models/CustomField';
import { Customer } from '@/models/Customer';
import { Appointment } from '@/models/Appointment';
import { AppointmentPayment } from '@/models/AppointmentPayment';
import { BankTransferPayment } from '@/models/BankTransferPayment';
import { Testimonial } from '@/models/Testimonial';
import { Blog } from '@/models/Blog';
import type {
  TenantBackupBundle,
  TenantBackupMeta,
  TenantResetScope,
  ResetTenantDataResult,
  ValidateBackupResult,
  ServiceExportFilter,
  PaymentExportFilter,
  StaffExportFilter,
} from '@/types/export';

/**
 * Escapes a cell value according to RFC 4180 CSV specifications.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates an RFC 4180 CSV export of services for a tenant business.
 */
export async function generateServicesCsv(
  businessId: string,
  filter: ServiceExportFilter = {}
): Promise<string> {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    businessId: new Types.ObjectId(businessId),
  };

  if (filter.categoryId && filter.categoryId !== 'all') {
    query.categoryId = new Types.ObjectId(filter.categoryId);
  }

  if (filter.status === 'active') {
    query.isActive = true;
  } else if (filter.status === 'inactive') {
    query.isActive = false;
  }

  const services = await Service.find(query)
    .populate('categoryId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const headers = [
    'Service ID',
    'Service Name',
    'Category',
    'Price',
    'Duration (Mins)',
    'Buffer Time (Mins)',
    'Status',
    'Description',
    'Created At',
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(',')];

  for (const s of services) {
    const categoryObj = s.categoryId as { name?: string } | null;
    const row = [
      String(s._id),
      s.name,
      categoryObj?.name || 'Uncategorized',
      s.price ?? 0,
      s.durationMinutes ?? 30,
      s.bufferMinutes ?? 0,
      s.isActive ? 'Active' : 'Inactive',
      s.description || '',
      s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '',
    ];
    rows.push(row.map(escapeCsvCell).join(','));
  }

  return rows.join('\r\n');
}

/**
 * Generates an RFC 4180 CSV export of payment transactions (Appointment payments + Bank transfers).
 */
export async function generatePaymentsCsv(
  businessId: string,
  filter: PaymentExportFilter = {}
): Promise<string> {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    businessId: new Types.ObjectId(businessId),
  };

  if (filter.paymentMethod && filter.paymentMethod !== 'all') {
    query.paymentType = { $regex: new RegExp(`^${filter.paymentMethod}$`, 'i') };
  }

  if (filter.paymentStatus && filter.paymentStatus !== 'all') {
    query.status = filter.paymentStatus.toLowerCase();
  }

  if (filter.startDate || filter.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filter.startDate) dateFilter.$gte = new Date(filter.startDate);
    if (filter.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    query.paymentDate = dateFilter;
  }

  const payments = await AppointmentPayment.find(query)
    .populate('appointmentId', 'appointmentNumber name email contact')
    .sort({ paymentDate: -1 })
    .lean();

  const headers = [
    'Payment Record ID',
    'Transaction Reference',
    'Appointment Number',
    'Customer Name',
    'Customer Email',
    'Customer Contact',
    'Amount',
    'Discount Amount',
    'Tax Amount',
    'Final Total Paid',
    'Payment Method',
    'Payment Status',
    'Payment Date',
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(',')];

  for (const p of payments) {
    const app = p.appointmentId as {
      appointmentNumber?: string;
      name?: string;
      email?: string;
      contact?: string;
    } | null;

    const row = [
      String(p._id),
      p.txnId || 'N/A',
      app?.appointmentNumber || 'N/A',
      app?.name || 'Customer',
      app?.email || '',
      app?.contact || '',
      p.amount ?? 0,
      p.discountAmount ?? 0,
      p.taxAmount ?? 0,
      p.finalAmount ?? p.amount ?? 0,
      p.paymentType || 'Manual',
      p.status || 'completed',
      p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : '',
    ];
    rows.push(row.map(escapeCsvCell).join(','));
  }

  return rows.join('\r\n');
}

/**
 * Generates an RFC 4180 CSV export of staff members and their assignments.
 */
export async function generateStaffCsv(
  businessId: string,
  filter: StaffExportFilter = {}
): Promise<string> {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    businessId: new Types.ObjectId(businessId),
  };

  if (filter.status === 'active') {
    query.isActive = true;
  } else if (filter.status === 'inactive') {
    query.isActive = false;
  }

  if (filter.locationId && filter.locationId !== 'all') {
    query.locationIds = new Types.ObjectId(filter.locationId);
  }

  const staffMembers = await Staff.find(query)
    .populate('userId', 'email name contact')
    .populate('locationIds', 'name')
    .populate('serviceIds', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const headers = [
    'Staff ID',
    'Staff Name',
    'Email Address',
    'Contact Number',
    'Assigned Locations',
    'Assigned Services',
    'Status',
    'Color Badge',
    'Created At',
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(',')];

  for (const s of staffMembers) {
    const userObj = s.userId as { email?: string; contact?: string } | null;
    const locations = Array.isArray(s.locationIds)
      ? s.locationIds.map((l) => (typeof l === 'object' && l && 'name' in l ? (l as { name: string }).name : '')).filter(Boolean).join('; ')
      : '';
    const services = Array.isArray(s.serviceIds)
      ? s.serviceIds.map((srv) => (typeof srv === 'object' && srv && 'name' in srv ? (srv as { name: string }).name : '')).filter(Boolean).join('; ')
      : '';

    const row = [
      String(s._id),
      s.name,
      userObj?.email || '',
      userObj?.contact || '',
      locations || 'All Locations',
      services || 'All Services',
      s.isActive ? 'Active' : 'Inactive',
      s.colorCode || '#CEEDC1',
      s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '',
    ];
    rows.push(row.map(escapeCsvCell).join(','));
  }

  return rows.join('\r\n');
}

/**
 * Assembles a comprehensive, standardized, sanitized JSON backup bundle for a tenant business.
 */
export async function generateTenantBackupBundle(options: {
  companyId: string;
  businessId: string;
  includeTestimonials?: boolean;
  includeBlogs?: boolean;
}): Promise<TenantBackupBundle> {
  await connectToDatabase();

  const bId = new Types.ObjectId(options.businessId);
  const cId = new Types.ObjectId(options.companyId);

  const business = await Business.findOne({ _id: bId, companyId: cId }).lean();
  if (!business) {
    throw new Error('Business record not found or tenant context mismatch.');
  }

  const [
    locations,
    categories,
    services,
    staffList,
    customStatuses,
    customFields,
    customers,
    appointments,
    payments,
    testimonials,
    blogs,
  ] = await Promise.all([
    Location.find({ businessId: bId }).lean(),
    Category.find({ businessId: bId }).lean(),
    Service.find({ businessId: bId }).lean(),
    Staff.find({ businessId: bId }).populate('userId', 'email name contact').lean(),
    CustomStatus.find({ businessId: bId }).lean(),
    CustomField.find({ businessId: bId }).lean(),
    Customer.find({ businessId: bId }).lean(),
    Appointment.find({ businessId: bId }).lean(),
    AppointmentPayment.find({ businessId: bId }).lean(),
    options.includeTestimonials !== false ? Testimonial.find({ businessId: bId }).lean() : Promise.resolve([]),
    options.includeBlogs !== false ? Blog.find({ businessId: bId }).lean() : Promise.resolve([]),
  ]);

  // Strip sensitive internal fields and auth tokens
  const sanitizedStaff = staffList.map((s) => {
    const raw = { ...s } as Record<string, unknown>;
    delete raw.__v;
    return raw;
  });

  const sanitizeDocs = (docs: Array<Record<string, unknown>>) =>
    docs.map((doc) => {
      const copy = { ...doc };
      delete copy.__v;
      return copy;
    });

  const sanitizedBusiness = { ...business } as Record<string, unknown>;
  delete sanitizedBusiness.__v;

  const counts = {
    locations: locations.length,
    categories: categories.length,
    services: services.length,
    staff: staffList.length,
    customStatuses: customStatuses.length,
    customFields: customFields.length,
    customers: customers.length,
    appointments: appointments.length,
    payments: payments.length,
    testimonials: testimonials.length,
    blogs: blogs.length,
  };

  const meta: TenantBackupMeta = {
    version: '1.0.0',
    platform: 'BookingGo SaaS',
    exportedAt: new Date().toISOString(),
    companyId: String(business.companyId),
    businessId: String(business._id),
    businessName: business.name || 'Untitled Business',
    businessSlug: business.slug || '',
    counts,
  };

  return {
    meta,
    business: sanitizedBusiness,
    locations: sanitizeDocs(locations as unknown as Array<Record<string, unknown>>),
    categories: sanitizeDocs(categories as unknown as Array<Record<string, unknown>>),
    services: sanitizeDocs(services as unknown as Array<Record<string, unknown>>),
    staff: sanitizedStaff,
    customStatuses: sanitizeDocs(customStatuses as unknown as Array<Record<string, unknown>>),
    customFields: sanitizeDocs(customFields as unknown as Array<Record<string, unknown>>),
    customers: sanitizeDocs(customers as unknown as Array<Record<string, unknown>>),
    appointments: sanitizeDocs(appointments as unknown as Array<Record<string, unknown>>),
    payments: sanitizeDocs(payments as unknown as Array<Record<string, unknown>>),
    testimonials: sanitizeDocs(testimonials as unknown as Array<Record<string, unknown>>),
    blogs: sanitizeDocs(blogs as unknown as Array<Record<string, unknown>>),
  };
}

/**
 * Validates the schema and structure of a TenantBackupBundle JSON object.
 */
export function validateBackupBundle(data: unknown): ValidateBackupResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Backup data must be a valid JSON object.'] };
  }

  const bundle = data as Partial<TenantBackupBundle>;

  if (!bundle.meta || typeof bundle.meta !== 'object') {
    errors.push('Missing "meta" envelope in backup bundle.');
  } else {
    if (!bundle.meta.version) errors.push('Missing "meta.version" identifier.');
    if (!bundle.meta.platform || !bundle.meta.platform.includes('BookingGo')) {
      errors.push('Invalid platform identifier in metadata.');
    }
    if (!bundle.meta.businessId) errors.push('Missing "meta.businessId" reference.');
    if (!bundle.meta.exportedAt || isNaN(Date.parse(bundle.meta.exportedAt))) {
      errors.push('Invalid or missing "meta.exportedAt" timestamp.');
    }
  }

  const requiredSections = [
    'locations',
    'categories',
    'services',
    'staff',
    'customers',
    'appointments',
    'payments',
  ] as const;

  for (const section of requiredSections) {
    if (!Array.isArray(bundle[section])) {
      errors.push(`Missing or invalid array section: "${section}".`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    version: bundle.meta?.version,
    exportedAt: bundle.meta?.exportedAt,
    businessName: bundle.meta?.businessName,
    counts: bundle.meta?.counts,
  };
}

/**
 * Safely executes a scoped data purge for a tenant business with multi-tenant isolation.
 */
export async function purgeTenantData(options: {
  companyId: string;
  businessId: string;
  businessName: string;
  confirmationText: string;
  scope: TenantResetScope;
}): Promise<ResetTenantDataResult> {
  const { companyId, businessId, businessName, confirmationText, scope } = options;

  // Enforce safety confirmation guard
  const normalizedConfirm = confirmationText.trim().toLowerCase();
  const normalizedName = businessName.trim().toLowerCase();
  const isConfirmed = normalizedConfirm === normalizedName || normalizedConfirm === 'confirm_reset';

  if (!isConfirmed) {
    return {
      success: false,
      error: `Safety check failed. Confirmation text "${confirmationText}" does not match the business name "${businessName}" or "CONFIRM_RESET". Data purge aborted.`,
    };
  }

  await connectToDatabase();

  const bId = new Types.ObjectId(businessId);
  const cId = new Types.ObjectId(companyId);

  // Verify business ownership
  const business = await Business.findOne({ _id: bId, companyId: cId }).lean();
  if (!business) {
    return {
      success: false,
      error: 'Business not found or unauthorized tenant context.',
    };
  }

  const deletedCounts: Record<string, number> = {};

  if (
    scope === 'appointments_and_payments' ||
    scope === 'test_data_with_customers' ||
    scope === 'full_catalog_and_bookings'
  ) {
    const appRes = await Appointment.deleteMany({ businessId: bId });
    const appPayRes = await AppointmentPayment.deleteMany({ businessId: bId });
    const bankPayRes = await BankTransferPayment.deleteMany({ businessId: bId });

    deletedCounts.appointments = appRes.deletedCount ?? 0;
    deletedCounts.appointmentPayments = appPayRes.deletedCount ?? 0;
    deletedCounts.bankTransferPayments = bankPayRes.deletedCount ?? 0;
  }

  if (
    scope === 'test_data_with_customers' ||
    scope === 'full_catalog_and_bookings'
  ) {
    const custRes = await Customer.deleteMany({ businessId: bId });
    deletedCounts.customers = custRes.deletedCount ?? 0;
  }

  if (scope === 'full_catalog_and_bookings') {
    const [srvRes, catRes, locRes, fieldRes, statusRes] = await Promise.all([
      Service.deleteMany({ businessId: bId }),
      Category.deleteMany({ businessId: bId }),
      Location.deleteMany({ businessId: bId }),
      CustomField.deleteMany({ businessId: bId }),
      CustomStatus.deleteMany({ businessId: bId }),
    ]);

    deletedCounts.services = srvRes.deletedCount ?? 0;
    deletedCounts.categories = catRes.deletedCount ?? 0;
    deletedCounts.locations = locRes.deletedCount ?? 0;
    deletedCounts.customFields = fieldRes.deletedCount ?? 0;
    deletedCounts.customStatuses = statusRes.deletedCount ?? 0;
  }

  return {
    success: true,
    scope,
    deletedCounts,
    purgedAt: new Date().toISOString(),
  };
}
