'use server';

import { Types } from 'mongoose';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Appointment } from '@/models/Appointment';
import { Customer } from '@/models/Customer';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import '@/models/Service';
import '@/models/Staff';
import '@/models/Location';
import '@/models/Category';
import '@/models/AppointmentPayment';
import {
  escapeCsvCell,
  generateServicesCsv,
  generatePaymentsCsv,
  generateStaffCsv,
  generateTenantBackupBundle,
  validateBackupBundle,
  purgeTenantData,
} from '@/lib/tenant-backup-engine';
import type {
  ExportActionResult,
  AppointmentExportFilter,
  ServiceExportFilter,
  PaymentExportFilter,
  StaffExportFilter,
  ResetTenantDataInput,
  ResetTenantDataResult,
  ValidateBackupResult,
} from '@/types/export';

async function resolveTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User account not found.');
  }

  const companyId =
    user.role === 'company'
      ? user._id
      : user.companyId
        ? new Types.ObjectId(user.companyId)
        : null;

  if (!companyId) {
    throw new Error('Company context could not be determined.');
  }

  let activeBusinessId = user.activeBusinessId;
  let activeBusiness = null;

  if (activeBusinessId) {
    activeBusiness = await Business.findOne({ _id: activeBusinessId, companyId }).lean();
  }

  if (!activeBusiness) {
    activeBusiness = await Business.findOne({ companyId }).lean();
    if (activeBusiness) {
      activeBusinessId = activeBusiness._id;
      await User.findByIdAndUpdate(user._id, { activeBusinessId: activeBusiness._id });
    }
  }

  if (!activeBusinessId || !activeBusiness) {
    throw new Error('No active business found for this organization.');
  }

  return {
    userId: user._id,
    userRole: user.role,
    companyId,
    businessId: activeBusinessId,
    businessName: activeBusiness.name || 'Untitled Business',
    businessSlug: activeBusiness.slug || '',
  };
}

/**
 * Generates an RFC 4180 CSV export of business appointments matching the filters.
 */
export async function exportAppointmentsCsvAction(
  filters: AppointmentExportFilter = {}
): Promise<ExportActionResult> {
  try {
    const { businessId } = await resolveTenantContext();

    const query: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
    };

    if (filters.status && filters.status !== 'all') {
      query.appointmentStatus = { $regex: new RegExp(`^${filters.status}$`, 'i') };
    }

    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      query.paymentStatus = filters.paymentStatus.toLowerCase();
    }

    if (filters.startDate || filters.endDate) {
      const dateFilter: Record<string, string> = {};
      if (filters.startDate) dateFilter.$gte = filters.startDate;
      if (filters.endDate) dateFilter.$lte = filters.endDate;
      query.date = dateFilter;
    }

    const appointments = await Appointment.find(query)
      .populate('serviceId', 'name')
      .populate('staffId', 'name')
      .populate('locationId', 'name')
      .sort({ date: -1, time: -1 })
      .lean();

    const headers = [
      'Appointment Number',
      'Date',
      'Time',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Service',
      'Staff Specialist',
      'Location',
      'Price',
      'Payment Method',
      'Payment Status',
      'Status',
      'Booked At',
    ];

    const rows: string[] = [];
    rows.push(headers.map(escapeCsvCell).join(','));

    for (const app of appointments) {
      const serviceObj = app.serviceId as { name?: string } | null;
      const staffObj = app.staffId as { name?: string } | null;
      const locationObj = app.locationId as { name?: string } | null;

      const row = [
        app.appointmentNumber,
        app.date,
        app.time,
        app.name,
        app.email,
        app.contact,
        serviceObj?.name || 'Service',
        staffObj?.name || 'Staff Specialist',
        locationObj?.name || 'Location',
        app.price ?? 0,
        app.paymentType || 'Manually',
        app.paymentStatus || 'unpaid',
        app.appointmentStatus || 'Pending',
        app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : '',
      ];

      rows.push(row.map(escapeCsvCell).join(','));
    }

    const csvContent = rows.join('\r\n');
    const dateStamp = new Date().toISOString().split('T')[0];

    return {
      success: true,
      data: csvContent,
      filename: `appointments_export_${dateStamp}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export appointments CSV.';
    return { success: false, error: message };
  }
}

/**
 * Generates an RFC 4180 CSV export of business customers with aggregated booking figures.
 */
export async function exportCustomersCsvAction(
  searchQuery = ''
): Promise<ExportActionResult> {
  try {
    const { businessId } = await resolveTenantContext();

    const baseFilter: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
    };

    if (searchQuery.trim()) {
      const regex = new RegExp(searchQuery.trim(), 'i');
      baseFilter.$or = [{ name: regex }, { email: regex }, { contact: regex }];
    }

    const rawCustomers = await Customer.find(baseFilter)
      .sort({ createdAt: -1 })
      .lean();

    const customerIds = rawCustomers.map((c) => c._id);
    const customerEmails = rawCustomers.map((c) => c.email.toLowerCase());

    const statsAgg = await Appointment.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          $or: [
            { customerId: { $in: customerIds } },
            { email: { $in: customerEmails } },
          ],
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$customerId', '$email'] },
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: [{ $toLower: '$appointmentStatus' }, 'completed'] }, 1, 0],
            },
          },
          spent: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$paymentStatus', 'paid'] },
                    { $eq: [{ $toLower: '$appointmentStatus' }, 'completed'] },
                  ],
                },
                '$price',
                0,
              ],
            },
          },
          lastDate: { $max: '$date' },
        },
      },
    ]);

    const statsMap = new Map<string, { total: number; completed: number; spent: number; lastDate: string | null }>();
    for (const stat of statsAgg) {
      statsMap.set(String(stat._id), {
        total: stat.total || 0,
        completed: stat.completed || 0,
        spent: stat.spent || 0,
        lastDate: stat.lastDate || null,
      });
    }

    const headers = [
      'Customer Name',
      'Email',
      'Contact',
      'Gender',
      'Date of Birth',
      'Description',
      'Total Bookings',
      'Completed Bookings',
      'Total Spent',
      'Last Appointment',
      'Customer Since',
    ];

    const rows: string[] = [];
    rows.push(headers.map(escapeCsvCell).join(','));

    for (const c of rawCustomers) {
      const stats =
        statsMap.get(String(c._id)) ||
        statsMap.get(c.email.toLowerCase()) ||
        { total: 0, completed: 0, spent: 0, lastDate: null };

      const row = [
        c.name,
        c.email,
        c.contact,
        c.gender || '',
        c.dob || '',
        c.description || '',
        stats.total,
        stats.completed,
        stats.spent,
        stats.lastDate || '',
        c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '',
      ];

      rows.push(row.map(escapeCsvCell).join(','));
    }

    const csvContent = rows.join('\r\n');
    const dateStamp = new Date().toISOString().split('T')[0];

    return {
      success: true,
      data: csvContent,
      filename: `customers_export_${dateStamp}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export customers CSV.';
    return { success: false, error: message };
  }
}

/**
 * Generates an RFC 4180 CSV export of services catalog.
 */
export async function exportServicesCsvAction(
  filter: ServiceExportFilter = {}
): Promise<ExportActionResult> {
  try {
    const { businessId } = await resolveTenantContext();
    const csvContent = await generateServicesCsv(String(businessId), filter);
    const dateStamp = new Date().toISOString().split('T')[0];

    return {
      success: true,
      data: csvContent,
      filename: `services_export_${dateStamp}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export services CSV.';
    return { success: false, error: message };
  }
}

/**
 * Generates an RFC 4180 CSV export of payment records.
 */
export async function exportPaymentsCsvAction(
  filter: PaymentExportFilter = {}
): Promise<ExportActionResult> {
  try {
    const { businessId } = await resolveTenantContext();
    const csvContent = await generatePaymentsCsv(String(businessId), filter);
    const dateStamp = new Date().toISOString().split('T')[0];

    return {
      success: true,
      data: csvContent,
      filename: `payments_export_${dateStamp}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export payments CSV.';
    return { success: false, error: message };
  }
}

/**
 * Generates an RFC 4180 CSV export of staff team members.
 */
export async function exportStaffCsvAction(
  filter: StaffExportFilter = {}
): Promise<ExportActionResult> {
  try {
    const { businessId } = await resolveTenantContext();
    const csvContent = await generateStaffCsv(String(businessId), filter);
    const dateStamp = new Date().toISOString().split('T')[0];

    return {
      success: true,
      data: csvContent,
      filename: `staff_export_${dateStamp}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export staff CSV.';
    return { success: false, error: message };
  }
}

/**
 * Generates a full portable JSON backup bundle for the tenant business.
 */
export async function exportTenantJsonBackupAction(options?: {
  includeTestimonials?: boolean;
  includeBlogs?: boolean;
}): Promise<ExportActionResult> {
  try {
    const { companyId, businessId, businessSlug } = await resolveTenantContext();

    const bundle = await generateTenantBackupBundle({
      companyId: String(companyId),
      businessId: String(businessId),
      includeTestimonials: options?.includeTestimonials,
      includeBlogs: options?.includeBlogs,
    });

    const jsonString = JSON.stringify(bundle, null, 2);
    const dateStamp = new Date().toISOString().split('T')[0];
    const safeSlug = businessSlug || 'business';

    return {
      success: true,
      data: jsonString,
      filename: `backup_${safeSlug}_${dateStamp}.json`,
      contentType: 'application/json; charset=utf-8',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate tenant backup bundle.';
    return { success: false, error: message };
  }
}

/**
 * Validates a tenant backup bundle JSON string (dry-run inspection).
 */
export async function validateTenantBackupAction(
  jsonString: string
): Promise<ValidateBackupResult> {
  try {
    const parsed = JSON.parse(jsonString);
    return validateBackupBundle(parsed);
  } catch {
    return { valid: false, errors: ['Failed to parse JSON string. Malformed JSON format.'] };
  }
}

/**
 * Resets or purges tenant data with safety confirmation and RBAC verification.
 */
export async function resetTenantDataAction(
  input: ResetTenantDataInput
): Promise<ResetTenantDataResult> {
  try {
    const { companyId, businessId, businessName, userRole } = await resolveTenantContext();

    if (userRole !== 'company' && userRole !== 'super admin') {
      return {
        success: false,
        error: 'Forbidden. Only organization owners (company) or super admins are authorized to reset tenant data.',
      };
    }

    return await purgeTenantData({
      companyId: String(companyId),
      businessId: String(businessId),
      businessName,
      confirmationText: input.confirmationText,
      scope: input.scope,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset tenant data.';
    return { success: false, error: message };
  }
}
