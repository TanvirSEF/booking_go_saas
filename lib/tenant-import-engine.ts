import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import { Location } from '@/models/Location';
import { Category } from '@/models/Category';
import { Service } from '@/models/Service';
import { Staff } from '@/models/Staff';
import { User } from '@/models/User';
import { Customer } from '@/models/Customer';
import { Appointment, type CustomerType, type PaymentStatus } from '@/models/Appointment';
import { AppointmentPayment, type PaymentRecordStatus } from '@/models/AppointmentPayment';
import { CustomStatus } from '@/models/CustomStatus';
import { CustomField, type CustomFieldType } from '@/models/CustomField';
import { Testimonial } from '@/models/Testimonial';
import { Blog } from '@/models/Blog';
import { validateBackupBundle } from '@/lib/tenant-backup-engine';
import type {
  ImportConflictStrategy,
  CsvParseResult,
  ImportBatchResult,
  RestoreBundleOptions,
  RestoreBundleResult,
} from '@/types/import';
import type { TenantBackupBundle } from '@/types/export';

// ---------------------------------------------------------------------------
// 1. RFC 4180 CSV Parser & Header Normalizer
// ---------------------------------------------------------------------------

const HEADER_ALIASES: Record<string, string> = {
  // Common Name aliases
  servicename: 'name',
  service_name: 'name',
  staffname: 'name',
  staff_name: 'name',
  customername: 'name',
  customer_name: 'name',
  fullname: 'name',
  full_name: 'name',

  // Contact / Phone aliases
  phone: 'contact',
  phonenumber: 'contact',
  phone_number: 'contact',
  contactnumber: 'contact',
  contact_number: 'contact',
  mobile: 'contact',
  mobileno: 'contact',
  mobile_no: 'contact',
  contactno: 'contact',
  contact_no: 'contact',

  // Service field aliases
  categoryname: 'category',
  category_name: 'category',
  duration: 'duration_minutes',
  durationminutes: 'duration_minutes',
  duration_mins: 'duration_minutes',
  duration_minutes: 'duration_minutes',
  durationmins: 'duration_minutes',
  buffertime: 'buffer_minutes',
  buffer_time: 'buffer_minutes',
  buffermins: 'buffer_minutes',
  buffer_minutes: 'buffer_minutes',
  buffer_time_mins: 'buffer_minutes',
  buffertimemins: 'buffer_minutes',
  is_free: 'is_free',

  // Staff field aliases
  assigned_locations: 'locations',
  location: 'locations',
  assigned_services: 'services',
  service: 'services',
  color: 'color_code',
  colorcode: 'color_code',

  // Status
  status: 'status',
  active: 'status',
};

/**
 * Normalizes a raw CSV header cell into standard key.
 */
function normalizeHeaderKey(rawHeader: string): string {
  let cleaned = rawHeader.replace(/^\uFEFF/, '').trim().toLowerCase();
  cleaned = cleaned.replace(/[\s\-()]+/g, '_').replace(/_+$/, '');
  const keyWithoutUnderscores = cleaned.replace(/_/g, '');
  return HEADER_ALIASES[cleaned] || HEADER_ALIASES[keyWithoutUnderscores] || cleaned;
}

/**
 * Parses raw RFC 4180 CSV text into structured records with support for:
 * - Multi-line quoted fields
 * - Escaped quotes ("")
 * - Commas inside quoted strings
 * - CRLF and LF linebreaks
 */
export function parseCsv<T = Record<string, string>>(csvContent: string): CsvParseResult<T> {
  const result: CsvParseResult<T> = {
    rows: [],
    headers: [],
    totalRows: 0,
    parseErrors: [],
  };

  if (!csvContent || typeof csvContent !== 'string') {
    return result;
  }

  const rawRows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        rawRows.push(currentRow);
        currentRow = [];
        i++; // Skip \n
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        rawRows.push(currentRow);
        currentRow = [];
      } else {
        currentCell += char;
      }
    }
  }

  // Final flush
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rawRows.push(currentRow);
  }

  if (rawRows.length === 0) {
    return result;
  }

  // Extract and normalize headers
  const headerRow = rawRows[0];
  const normalizedHeaders = headerRow.map(normalizeHeaderKey);
  result.headers = normalizedHeaders;

  // Process data rows
  for (let rowIndex = 1; rowIndex < rawRows.length; rowIndex++) {
    const rowData = rawRows[rowIndex];

    // Skip empty lines
    if (rowData.length === 0 || (rowData.length === 1 && !rowData[0])) {
      continue;
    }

    const rowObj: Record<string, string> = {};
    for (let colIndex = 0; colIndex < normalizedHeaders.length; colIndex++) {
      const key = normalizedHeaders[colIndex];
      rowObj[key] = rowData[colIndex] || '';
    }

    result.rows.push(rowObj as unknown as T);
  }

  result.totalRows = result.rows.length;
  return result;
}

// ---------------------------------------------------------------------------
// 2. Customer Bulk Import Engine
// ---------------------------------------------------------------------------
export async function importCustomersFromCsv(
  businessId: string | Types.ObjectId,
  csvContent: string,
  strategy: ImportConflictStrategy = 'skip'
): Promise<ImportBatchResult> {
  await connectToDatabase();

  const business = await Business.findById(businessId).lean();
  if (!business) {
    throw new Error('Business not found.');
  }

  const parseResult = parseCsv(csvContent);
  const result: ImportBatchResult = {
    totalProcessed: parseResult.totalRows,
    importedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  for (let i = 0; i < parseResult.rows.length; i++) {
    const row = parseResult.rows[i] as Record<string, string>;
    const rowNum = i + 2; // 1-indexed including header row

    const name = row.name || row.customer_name || '';
    const email = (row.email || '').toLowerCase().trim();
    const contact = row.contact || row.phone || '';
    const rawGender = (row.gender || '').toLowerCase().trim();
    const gender = ['male', 'female', 'other'].includes(rawGender) ? rawGender : '';
    const dob = row.dob || row.date_of_birth || '';
    const description = row.description || '';

    if (!name || !contact) {
      result.errors.push({
        row: rowNum,
        error: 'Missing required customer fields (name and contact are required).',
      });
      continue;
    }

    // Check existing customer within this business
    const orClauses: Array<Record<string, unknown>> = [{ contact }];
    if (email) {
      orClauses.push({ email });
    }

    const existing = await Customer.findOne({
      businessId: business._id,
      $or: orClauses,
    });

    if (existing) {
      if (strategy === 'skip') {
        result.skippedCount++;
        continue;
      }

      if (strategy === 'update') {
        existing.name = name;
        if (email) existing.email = email;
        existing.contact = contact;
        if (gender) existing.gender = gender;
        if (dob) existing.dob = dob;
        if (description) existing.description = description;
        await existing.save();
        result.updatedCount++;
        continue;
      }
    }

    // Insert new customer
    await Customer.create({
      companyId: business.companyId,
      businessId: business._id,
      name,
      email: email || `customer_${Date.now()}_${Math.floor(Math.random() * 1000)}@unspecified.local`,
      contact,
      gender,
      dob,
      description,
    });

    result.importedCount++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 3. Service Bulk Import Engine (With Dynamic Category Provisioning)
// ---------------------------------------------------------------------------
export async function importServicesFromCsv(
  businessId: string | Types.ObjectId,
  csvContent: string,
  strategy: ImportConflictStrategy = 'skip'
): Promise<ImportBatchResult> {
  await connectToDatabase();

  const business = await Business.findById(businessId).lean();
  if (!business) {
    throw new Error('Business not found.');
  }

  const parseResult = parseCsv(csvContent);
  const result: ImportBatchResult = {
    totalProcessed: parseResult.totalRows,
    importedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  // Cache existing categories to avoid redundant queries
  const existingCategories = await Category.find({ businessId: business._id });
  const categoryMap = new Map<string, Types.ObjectId>();
  for (const c of existingCategories) {
    categoryMap.set(c.name.toLowerCase().trim(), c._id);
  }

  for (let i = 0; i < parseResult.rows.length; i++) {
    const row = parseResult.rows[i] as Record<string, string>;
    const rowNum = i + 2;

    const name = row.name || row.service_name || '';
    const categoryName = (row.category || row.category_name || 'General Services').trim();
    const rawPrice = row.price;
    const price = rawPrice !== undefined && rawPrice !== '' ? parseFloat(rawPrice) : 0;
    const rawDuration = row.duration_minutes || row.duration || '60';
    const durationMinutes = parseInt(rawDuration, 10) || 60;
    const rawBuffer = row.buffer_minutes || row.buffer_time || '0';
    const bufferMinutes = parseInt(rawBuffer, 10) || 0;
    const description = row.description || '';
    const isFree = row.is_free === 'true' || price === 0;
    const isActive = row.status ? row.status.toLowerCase() === 'active' || row.status === 'true' : true;

    if (!name) {
      result.errors.push({
        row: rowNum,
        error: 'Service name is required.',
      });
      continue;
    }

    if (isNaN(price) || price < 0) {
      result.errors.push({
        row: rowNum,
        error: 'Price must be a valid non-negative number.',
      });
      continue;
    }

    // Resolve or automatically create category
    const catKey = categoryName.toLowerCase();
    let categoryId = categoryMap.get(catKey);

    if (!categoryId) {
      const orderCount = categoryMap.size;
      const newCategory = await Category.create({
        companyId: business.companyId,
        businessId: business._id,
        name: categoryName,
        order: orderCount,
        isActive: true,
      });
      categoryId = newCategory._id;
      categoryMap.set(catKey, categoryId);
    }

    // Check existing service by name in this business
    const existing = await Service.findOne({
      businessId: business._id,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });

    if (existing) {
      if (strategy === 'skip') {
        result.skippedCount++;
        continue;
      }

      if (strategy === 'update') {
        existing.categoryId = categoryId;
        existing.price = price;
        existing.durationMinutes = durationMinutes;
        existing.bufferMinutes = bufferMinutes;
        existing.isFree = isFree;
        existing.isActive = isActive;
        if (description) existing.description = description;
        await existing.save();
        result.updatedCount++;
        continue;
      }
    }

    // Insert new service
    await Service.create({
      companyId: business.companyId,
      businessId: business._id,
      categoryId,
      name: name.trim(),
      price,
      durationMinutes,
      bufferMinutes,
      description,
      isFree,
      isActive,
    });

    result.importedCount++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 4. Staff Specialist Bulk Import Engine (With User Account Linkage)
// ---------------------------------------------------------------------------
export async function importStaffFromCsv(
  businessId: string | Types.ObjectId,
  csvContent: string,
  strategy: ImportConflictStrategy = 'skip'
): Promise<ImportBatchResult> {
  await connectToDatabase();

  const business = await Business.findById(businessId).lean();
  if (!business) {
    throw new Error('Business not found.');
  }

  const parseResult = parseCsv(csvContent);
  const result: ImportBatchResult = {
    totalProcessed: parseResult.totalRows,
    importedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  // Load existing locations and services for name resolution
  const [locations, services] = await Promise.all([
    Location.find({ businessId: business._id }).lean(),
    Service.find({ businessId: business._id }).lean(),
  ]);

  const locationMap = new Map<string, Types.ObjectId>();
  for (const l of locations) {
    locationMap.set(l.name.toLowerCase().trim(), l._id);
  }

  const serviceMap = new Map<string, Types.ObjectId>();
  for (const s of services) {
    serviceMap.set(s.name.toLowerCase().trim(), s._id);
  }

  const defaultLocationIds = locations.length > 0 ? [locations[0]._id] : [];
  const defaultServiceIds = services.length > 0 ? [services[0]._id] : [];

  for (let i = 0; i < parseResult.rows.length; i++) {
    const row = parseResult.rows[i] as Record<string, string>;
    const rowNum = i + 2;

    const name = row.name || row.staff_name || '';
    const email = (row.email || '').toLowerCase().trim();
    const colorCode = row.color_code || '#CEEDC1';
    const description = row.description || '';
    const isActive = row.status ? row.status.toLowerCase() === 'active' || row.status === 'true' : true;

    if (!name || !email) {
      result.errors.push({
        row: rowNum,
        error: 'Staff name and email are required.',
      });
      continue;
    }

    // Resolve location IDs
    const resolvedLocationIds: Types.ObjectId[] = [];
    if (row.locations) {
      const locNames = row.locations.split(',').map((s) => s.trim().toLowerCase());
      for (const ln of locNames) {
        const id = locationMap.get(ln);
        if (id) resolvedLocationIds.push(id);
      }
    }
    const finalLocationIds = resolvedLocationIds.length > 0 ? resolvedLocationIds : defaultLocationIds;

    // Resolve service IDs
    const resolvedServiceIds: Types.ObjectId[] = [];
    if (row.services) {
      const svcNames = row.services.split(',').map((s) => s.trim().toLowerCase());
      for (const sn of svcNames) {
        const id = serviceMap.get(sn);
        if (id) resolvedServiceIds.push(id);
      }
    }
    const finalServiceIds = resolvedServiceIds.length > 0 ? resolvedServiceIds : defaultServiceIds;

    // Resolve or provision User record for staff
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        role: 'staff',
        companyId: business.companyId,
        activeBusinessId: business._id,
        lang: 'en',
      });
    }

    // Check existing staff profile in this business
    const existing = await Staff.findOne({
      businessId: business._id,
      $or: [{ userId: user._id }, { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } }],
    });

    if (existing) {
      if (strategy === 'skip') {
        result.skippedCount++;
        continue;
      }

      if (strategy === 'update') {
        existing.name = name;
        existing.locationIds = finalLocationIds;
        existing.serviceIds = finalServiceIds;
        existing.colorCode = colorCode;
        existing.isActive = isActive;
        if (description) existing.description = description;
        await existing.save();
        result.updatedCount++;
        continue;
      }
    }

    // Insert new staff specialist
    await Staff.create({
      companyId: business.companyId,
      businessId: business._id,
      userId: user._id,
      name: name.trim(),
      locationIds: finalLocationIds,
      serviceIds: finalServiceIds,
      colorCode,
      description,
      isActive,
    });

    result.importedCount++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 5. Backup Bundle Restore Engine (Topological Ordering & ID Remapping)
// ---------------------------------------------------------------------------
export async function restoreTenantFromBackupBundle(
  targetBusinessId: string | Types.ObjectId,
  bundle: TenantBackupBundle,
  options: RestoreBundleOptions = {}
): Promise<RestoreBundleResult> {
  await connectToDatabase();

  const business = await Business.findById(targetBusinessId).lean();
  if (!business) {
    throw new Error('Target business not found.');
  }

  const validation = validateBackupBundle(bundle);
  if (!validation.valid) {
    return {
      dryRun: !!options.dryRun,
      bundleVersion: bundle?.meta?.version || 'unknown',
      sourceBusinessName: bundle?.meta?.businessName || 'unknown',
      targetBusinessId: String(business._id),
      importedCounts: {},
      warnings: [],
      errors: validation.errors || ['Invalid backup bundle format.'],
    };
  }

  const dryRun = !!options.dryRun;
  const importedCounts: Record<string, number> = {
    customStatuses: bundle.customStatuses?.length || 0,
    customFields: bundle.customFields?.length || 0,
    locations: bundle.locations?.length || 0,
    categories: bundle.categories?.length || 0,
    services: bundle.services?.length || 0,
    staff: bundle.staff?.length || 0,
    customers: bundle.customers?.length || 0,
    appointments: bundle.appointments?.length || 0,
    payments: bundle.payments?.length || 0,
    testimonials: bundle.testimonials?.length || 0,
    blogs: bundle.blogs?.length || 0,
  };

  // In dry run, return schema validation and projected counts without database mutation
  if (dryRun) {
    return {
      dryRun: true,
      bundleVersion: bundle.meta.version,
      sourceBusinessName: bundle.meta.businessName,
      targetBusinessId: String(business._id),
      importedCounts,
      warnings: [],
      errors: [],
    };
  }

  // Live execution: establish ID translation maps to eliminate cross-tenant ID collisions
  const companyId = business.companyId;
  const businessId = business._id;

  const locationIdMap = new Map<string, Types.ObjectId>();
  const categoryIdMap = new Map<string, Types.ObjectId>();
  const serviceIdMap = new Map<string, Types.ObjectId>();
  const staffIdMap = new Map<string, Types.ObjectId>();
  const customerIdMap = new Map<string, Types.ObjectId>();
  const appointmentIdMap = new Map<string, Types.ObjectId>();

  // 1. Custom Statuses
  if (Array.isArray(bundle.customStatuses)) {
    for (const rawDoc of bundle.customStatuses) {
      const doc = rawDoc as Record<string, unknown>;
      await CustomStatus.create({
        companyId,
        businessId,
        title: String(doc.title || doc.name || 'Active'),
        statusColor: String(doc.statusColor || doc.color || '#21c9b0'),
        icon: String(doc.icon || 'ti-loader'),
        order: Number(doc.order || 0),
      });
    }
  }

  // 2. Custom Fields
  const validFieldTypes: CustomFieldType[] = [
    'text',
    'number',
    'email',
    'date',
    'select',
    'textarea',
    'radio',
    'checkbox',
  ];
  if (Array.isArray(bundle.customFields)) {
    for (const rawDoc of bundle.customFields) {
      const doc = rawDoc as Record<string, unknown>;
      const rawType = doc.type as CustomFieldType;
      const fieldType: CustomFieldType = validFieldTypes.includes(rawType) ? rawType : 'text';
      await CustomField.create({
        companyId,
        businessId,
        label: String(doc.label || doc.name || ''),
        type: fieldType,
        placeholder: String(doc.placeholder || ''),
        isRequired: Boolean(doc.isRequired),
        order: Number(doc.order || 0),
      });
    }
  }

  // 3. Locations
  if (Array.isArray(bundle.locations)) {
    for (const rawDoc of bundle.locations) {
      const doc = rawDoc as Record<string, unknown>;
      const newId = new Types.ObjectId();
      if (doc._id) locationIdMap.set(String(doc._id), newId);
      await Location.create({
        _id: newId,
        companyId,
        businessId,
        name: String(doc.name || ''),
        address: String(doc.address || ''),
        phone: String(doc.phone || ''),
        isActive: doc.isActive !== false,
      });
    }
  }

  // 4. Categories
  if (Array.isArray(bundle.categories)) {
    for (const rawDoc of bundle.categories) {
      const doc = rawDoc as Record<string, unknown>;
      const newId = new Types.ObjectId();
      if (doc._id) categoryIdMap.set(String(doc._id), newId);
      await Category.create({
        _id: newId,
        companyId,
        businessId,
        name: String(doc.name || ''),
        description: String(doc.description || ''),
        order: Number(doc.order || 0),
        isActive: doc.isActive !== false,
      });
    }
  }

  // 5. Services (rewrite categoryId)
  if (Array.isArray(bundle.services)) {
    for (const rawDoc of bundle.services) {
      const doc = rawDoc as Record<string, unknown>;
      const newId = new Types.ObjectId();
      if (doc._id) serviceIdMap.set(String(doc._id), newId);

      const oldCatId = String(doc.categoryId || '');
      const remappedCatId = categoryIdMap.get(oldCatId) || new Types.ObjectId();

      await Service.create({
        _id: newId,
        companyId,
        businessId,
        categoryId: remappedCatId,
        name: String(doc.name || ''),
        price: Number(doc.price || 0),
        durationMinutes: Number(doc.durationMinutes || 60),
        bufferMinutes: Number(doc.bufferMinutes || 0),
        description: String(doc.description || ''),
        isFree: Boolean(doc.isFree),
        isActive: doc.isActive !== false,
      });
    }
  }

  // 6. Staff (rewrite locationIds and serviceIds)
  if (Array.isArray(bundle.staff)) {
    for (const rawDoc of bundle.staff) {
      const doc = rawDoc as Record<string, unknown>;
      const newId = new Types.ObjectId();
      if (doc._id) staffIdMap.set(String(doc._id), newId);

      const remappedLocIds: Types.ObjectId[] = Array.isArray(doc.locationIds)
        ? (doc.locationIds
            .map((lid: unknown) => locationIdMap.get(String(lid)))
            .filter((id): id is Types.ObjectId => Boolean(id)))
        : [];
      const remappedSvcIds: Types.ObjectId[] = Array.isArray(doc.serviceIds)
        ? (doc.serviceIds
            .map((sid: unknown) => serviceIdMap.get(String(sid)))
            .filter((id): id is Types.ObjectId => Boolean(id)))
        : [];

      // Provision or link staff user account
      const staffEmail = String(doc.email || `staff_${newId}@local.test`);
      let user = await User.findOne({ email: staffEmail });
      if (!user) {
        user = await User.create({
          name: String(doc.name || 'Staff Specialist'),
          email: staffEmail,
          role: 'staff',
          companyId,
          activeBusinessId: businessId,
          lang: 'en',
        });
      }

      await Staff.create({
        _id: newId,
        companyId,
        businessId,
        userId: user._id,
        name: String(doc.name || 'Staff Specialist'),
        locationIds: remappedLocIds,
        serviceIds: remappedSvcIds,
        colorCode: String(doc.colorCode || '#CEEDC1'),
        description: String(doc.description || ''),
        isActive: doc.isActive !== false,
      });
    }
  }

  // 7. Customers
  if (Array.isArray(bundle.customers)) {
    for (const rawDoc of bundle.customers) {
      const doc = rawDoc as Record<string, unknown>;
      const newId = new Types.ObjectId();
      if (doc._id) customerIdMap.set(String(doc._id), newId);

      await Customer.create({
        _id: newId,
        companyId,
        businessId,
        name: String(doc.name || 'Customer'),
        email: String(doc.email || `customer_${newId}@local.test`),
        contact: String(doc.contact || '+15550000'),
        gender: String(doc.gender || ''),
        dob: String(doc.dob || ''),
        description: String(doc.description || ''),
      });
    }
  }

  // 8. Appointments (rewrite locationId, serviceId, staffId, customerId)
  if (Array.isArray(bundle.appointments)) {
    for (const rawDoc of bundle.appointments) {
      const doc = rawDoc as Record<string, unknown>;
      const newId = new Types.ObjectId();
      if (doc._id) appointmentIdMap.set(String(doc._id), newId);

      const remappedLocationId = locationIdMap.get(String(doc.locationId)) || new Types.ObjectId();
      const remappedServiceId = serviceIdMap.get(String(doc.serviceId)) || new Types.ObjectId();
      const remappedStaffId = staffIdMap.get(String(doc.staffId)) || new Types.ObjectId();
      const remappedCustomerId = customerIdMap.get(String(doc.customerId));

      const validCustomerTypes: CustomerType[] = ['new-user', 'existing-user', 'guest-user'];
      const rawCustType = doc.customerType as CustomerType;
      const customerType: CustomerType = validCustomerTypes.includes(rawCustType) ? rawCustType : 'guest-user';

      const validPaymentStatuses: PaymentStatus[] = ['unpaid', 'paid', 'refunded'];
      const rawPayStatus = doc.paymentStatus as PaymentStatus;
      const paymentStatus: PaymentStatus = validPaymentStatuses.includes(rawPayStatus) ? rawPayStatus : 'unpaid';

      await Appointment.create({
        _id: newId,
        companyId,
        businessId,
        locationId: remappedLocationId,
        serviceId: remappedServiceId,
        staffId: remappedStaffId,
        customerId: remappedCustomerId,
        customerType,
        appointmentNumber: doc.appointmentNumber
          ? `${String(doc.appointmentNumber)}-R`
          : `APT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        name: String(doc.name || 'Patient'),
        email: String(doc.email || 'patient@local.test'),
        contact: String(doc.contact || '+15550000'),
        date: String(doc.date || '2026-10-01'),
        time: String(doc.time || '10:00'),
        durationMinutes: Number(doc.durationMinutes || 60),
        price: Number(doc.price || 0),
        paymentType: String(doc.paymentType || 'Pending'),
        paymentStatus,
        appointmentStatus: String(doc.appointmentStatus || 'Confirmed'),
        statusColor: String(doc.statusColor || '#21c9b0'),
      });
    }
  }

  // 9. Payments (rewrite appointmentId)
  const validRecordStatuses: PaymentRecordStatus[] = ['pending', 'completed', 'failed', 'refunded'];
  if (Array.isArray(bundle.payments)) {
    for (const rawDoc of bundle.payments) {
      const doc = rawDoc as Record<string, unknown>;
      const remappedApptId = appointmentIdMap.get(String(doc.appointmentId));
      if (remappedApptId) {
        const rawRecStatus = doc.status as PaymentRecordStatus;
        const recordStatus: PaymentRecordStatus = validRecordStatuses.includes(rawRecStatus) ? rawRecStatus : 'completed';
        await AppointmentPayment.create({
          companyId,
          businessId,
          appointmentId: remappedApptId,
          paymentType: String(doc.paymentType || 'Manually'),
          amount: Number(doc.amount || 0),
          discountAmount: Number(doc.discountAmount || 0),
          finalAmount: Number(doc.finalAmount || doc.amount || 0),
          paymentDate: doc.paymentDate ? new Date(doc.paymentDate as string) : new Date(),
          txnId: doc.txnId ? `${String(doc.txnId)}-R` : `txn_${Date.now()}`,
          status: recordStatus,
        });
      }
    }
  }

  // 10. Testimonials
  if (Array.isArray(bundle.testimonials)) {
    for (const rawDoc of bundle.testimonials) {
      const doc = rawDoc as Record<string, unknown>;
      await Testimonial.create({
        companyId,
        businessId,
        name: String(doc.name || 'Client'),
        title: String(doc.title || doc.designation || ''),
        description: String(doc.description || ''),
        rating: Number(doc.rating || 5),
        isActive: doc.isActive !== false,
      });
    }
  }

  // 11. Blogs
  if (Array.isArray(bundle.blogs)) {
    for (const rawDoc of bundle.blogs) {
      const doc = rawDoc as Record<string, unknown>;
      const rawStatus = doc.status as string;
      await Blog.create({
        companyId,
        businessId,
        authorId: companyId,
        title: String(doc.title || 'Untitled Blog'),
        slug: doc.slug ? `${String(doc.slug)}-restored-${Date.now()}` : `blog-${Date.now()}`,
        summary: String(doc.summary || ''),
        content: String(doc.content || ''),
        status: rawStatus === 'draft' || rawStatus === 'archived' ? rawStatus : 'published',
      });
    }
  }

  return {
    dryRun: false,
    bundleVersion: bundle.meta.version,
    sourceBusinessName: bundle.meta.businessName,
    targetBusinessId: String(business._id),
    importedCounts,
    warnings: [],
    errors: [],
  };
}
