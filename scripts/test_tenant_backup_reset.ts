import { Types } from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { Location } from '../models/Location';
import { Category } from '../models/Category';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { CustomStatus } from '../models/CustomStatus';
import { CustomField } from '../models/CustomField';
import { Customer } from '../models/Customer';
import { Appointment } from '../models/Appointment';
import { AppointmentPayment } from '../models/AppointmentPayment';
import {
  generateServicesCsv,
  generatePaymentsCsv,
  generateStaffCsv,
  generateTenantBackupBundle,
  validateBackupBundle,
  purgeTenantData,
} from '../lib/tenant-backup-engine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖\x1b[0m ${message}`);
    failed++;
  }
}

async function runTenantBackupResetSuite() {
  console.log('\n===============================================================');
  console.log(' Priority 25 [BGO-243]: Tenant Data Export, Backup & Reset Test');
  console.log('===============================================================\n');

  await connectToDatabase();

  const testSuffix = Date.now().toString().slice(-6);

  // Tenant A IDs
  const companyIdA = new Types.ObjectId();
  const businessIdA = new Types.ObjectId();
  const locationIdA = new Types.ObjectId();
  const categoryIdA = new Types.ObjectId();
  const serviceIdA1 = new Types.ObjectId();
  const serviceIdA2 = new Types.ObjectId();
  const staffUserIdA = new Types.ObjectId();
  const staffIdA = new Types.ObjectId();
  const customerIdA1 = new Types.ObjectId();
  const customerIdA2 = new Types.ObjectId();
  const appointmentIdA1 = new Types.ObjectId();
  const appointmentIdA2 = new Types.ObjectId();
  const paymentIdA1 = new Types.ObjectId();

  // Tenant B IDs (Isolation Control)
  const companyIdB = new Types.ObjectId();
  const businessIdB = new Types.ObjectId();
  const locationIdB = new Types.ObjectId();
  const categoryIdB = new Types.ObjectId();
  const serviceIdB = new Types.ObjectId();
  const staffUserIdB = new Types.ObjectId();
  const staffIdB = new Types.ObjectId();
  const customerIdB = new Types.ObjectId();
  const appointmentIdB = new Types.ObjectId();
  const paymentIdB = new Types.ObjectId();

  try {
    // ------------------------------------------------------------------------
    // SETUP: Provision Tenant A & Tenant B Fixtures
    // ------------------------------------------------------------------------
    console.log('--- Phase 1: Provisioning Isolated Tenant Fixtures ---');

    // Tenant A
    await User.create({
      _id: companyIdA,
      name: `Company Owner A ${testSuffix}`,
      email: `company_a_${testSuffix}@example.com`,
      password: 'hashed_password_123',
      role: 'company',
      activeBusinessId: businessIdA,
    });

    const businessAName = `Atlas Backup Spa ${testSuffix}`;
    await Business.create({
      _id: businessIdA,
      companyId: companyIdA,
      name: businessAName,
      slug: `atlas-backup-spa-${testSuffix}`,
    });

    await Location.create({
      _id: locationIdA,
      companyId: companyIdA,
      businessId: businessIdA,
      name: 'Uptown Salon Branch',
      address: '123 Main St, Suite 4',
    });

    await Category.create({
      _id: categoryIdA,
      companyId: companyIdA,
      businessId: businessIdA,
      name: 'Spa Therapies',
      order: 1,
      isActive: true,
    });

    await Service.create([
      {
        _id: serviceIdA1,
        companyId: companyIdA,
        businessId: businessIdA,
        categoryId: categoryIdA,
        name: 'Swedish Massage 60m',
        price: 85,
        durationMinutes: 60,
        bufferMinutes: 15,
        isActive: true,
        description: 'Full body relaxation massage',
      },
      {
        _id: serviceIdA2,
        companyId: companyIdA,
        businessId: businessIdA,
        categoryId: categoryIdA,
        name: 'Express Facial 30m',
        price: 45,
        durationMinutes: 30,
        bufferMinutes: 10,
        isActive: false,
        description: 'Quick skin refreshment',
      },
    ]);

    await User.create({
      _id: staffUserIdA,
      name: 'Sarah Specialist',
      email: `sarah_staff_${testSuffix}@example.com`,
      password: 'hashed_password_123',
      role: 'staff',
      companyId: companyIdA,
      activeBusinessId: businessIdA,
    });

    await Staff.create({
      _id: staffIdA,
      companyId: companyIdA,
      businessId: businessIdA,
      userId: staffUserIdA,
      name: 'Sarah Specialist',
      locationIds: [locationIdA],
      serviceIds: [serviceIdA1, serviceIdA2],
      colorCode: '#FFD8D8',
      isActive: true,
    });

    await CustomStatus.create({
      companyId: companyIdA,
      businessId: businessIdA,
      title: 'In Preparation',
      statusColor: '#3B82F6',
      icon: 'ti-loader',
      order: 1,
    });

    await CustomField.create({
      companyId: companyIdA,
      businessId: businessIdA,
      label: 'Skin Allergies',
      type: 'text',
      isRequired: false,
    });

    await Customer.create([
      {
        _id: customerIdA1,
        companyId: companyIdA,
        businessId: businessIdA,
        name: 'Alice Client',
        email: `alice_${testSuffix}@example.com`,
        contact: '+15551234567',
        gender: 'female',
        dob: '1992-05-14',
      },
      {
        _id: customerIdA2,
        companyId: companyIdA,
        businessId: businessIdA,
        name: 'Bob Client',
        email: `bob_${testSuffix}@example.com`,
        contact: '+15559876543',
        gender: 'male',
        dob: '1988-11-20',
      },
    ]);

    await Appointment.create([
      {
        _id: appointmentIdA1,
        companyId: companyIdA,
        businessId: businessIdA,
        appointmentNumber: `APP-A1-${testSuffix}`,
        serviceId: serviceIdA1,
        staffId: staffIdA,
        locationId: locationIdA,
        customerId: customerIdA1,
        name: 'Alice Client',
        email: `alice_${testSuffix}@example.com`,
        contact: '+15551234567',
        date: '2026-10-15',
        time: '10:00',
        price: 85,
        paymentType: 'Stripe',
        paymentStatus: 'paid',
        appointmentStatus: 'Confirmed',
      },
      {
        _id: appointmentIdA2,
        companyId: companyIdA,
        businessId: businessIdA,
        appointmentNumber: `APP-A2-${testSuffix}`,
        serviceId: serviceIdA2,
        staffId: staffIdA,
        locationId: locationIdA,
        customerId: customerIdA2,
        name: 'Bob Client',
        email: `bob_${testSuffix}@example.com`,
        contact: '+15559876543',
        date: '2026-10-16',
        time: '14:00',
        price: 45,
        paymentType: 'Manually',
        paymentStatus: 'unpaid',
        appointmentStatus: 'Pending',
      },
    ]);

    await AppointmentPayment.create({
      _id: paymentIdA1,
      appointmentId: appointmentIdA1,
      companyId: companyIdA,
      businessId: businessIdA,
      paymentType: 'Stripe',
      amount: 85,
      discountAmount: 0,
      couponAmount: 0,
      taxAmount: 0,
      finalAmount: 85,
      paymentDate: new Date('2026-10-15T10:05:00Z'),
      txnId: `txn_atlas_${testSuffix}`,
      status: 'completed',
    });

    // Tenant B (Isolation Control)
    await User.create({
      _id: companyIdB,
      name: `Company Owner B ${testSuffix}`,
      email: `company_b_${testSuffix}@example.com`,
      password: 'hashed_password_123',
      role: 'company',
      activeBusinessId: businessIdB,
    });

    const businessBName = `Control Dental ${testSuffix}`;
    await Business.create({
      _id: businessIdB,
      companyId: companyIdB,
      name: businessBName,
      slug: `control-dental-${testSuffix}`,
    });

    await Category.create({
      _id: categoryIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      name: 'Dental Care',
      order: 1,
      isActive: true,
    });

    await Service.create({
      _id: serviceIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      categoryId: categoryIdB,
      name: 'Teeth Whitening',
      price: 150,
      durationMinutes: 45,
      isActive: true,
    });

    await Location.create({
      _id: locationIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      name: 'Central Dental Branch',
      address: '456 Elm St',
    });

    await User.create({
      _id: staffUserIdB,
      name: 'Dr. Dent Specialist',
      email: `dentist_${testSuffix}@example.com`,
      password: 'hashed_password_123',
      role: 'staff',
      companyId: companyIdB,
      activeBusinessId: businessIdB,
    });

    await Staff.create({
      _id: staffIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      userId: staffUserIdB,
      name: 'Dr. Dent Specialist',
      locationIds: [locationIdB],
      serviceIds: [serviceIdB],
      colorCode: '#CEEDC1',
      isActive: true,
    });

    await Customer.create({
      _id: customerIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      name: 'Charlie TenantB Customer',
      email: `charlie_${testSuffix}@example.com`,
      contact: '+15554443333',
      gender: 'male',
    });

    await Appointment.create({
      _id: appointmentIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      appointmentNumber: `APP-B1-${testSuffix}`,
      serviceId: serviceIdB,
      staffId: staffIdB,
      locationId: locationIdB,
      customerId: customerIdB,
      name: 'Charlie TenantB Customer',
      email: `charlie_${testSuffix}@example.com`,
      contact: '+15554443333',
      date: '2026-10-20',
      time: '11:00',
      price: 150,
      paymentType: 'Stripe',
      paymentStatus: 'paid',
      appointmentStatus: 'Confirmed',
    });

    await AppointmentPayment.create({
      _id: paymentIdB,
      appointmentId: appointmentIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      paymentType: 'Stripe',
      amount: 150,
      discountAmount: 0,
      couponAmount: 0,
      taxAmount: 0,
      finalAmount: 150,
      paymentDate: new Date('2026-10-20T11:05:00Z'),
      txnId: `txn_ctrl_${testSuffix}`,
      status: 'completed',
    });

    assert(true, 'Test fixtures for Tenant A and Tenant B created successfully.');

    // ------------------------------------------------------------------------
    // PHASE 2: RFC 4180 CSV Export Generation
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 2: RFC 4180 CSV Export Generation ---');

    // 1. Services CSV
    const servicesCsv = await generateServicesCsv(String(businessIdA));
    assert(servicesCsv.includes('"Service ID","Service Name","Category","Price"'), 'Services CSV has valid RFC 4180 header.');
    assert(servicesCsv.includes('Swedish Massage 60m'), 'Services CSV includes first service name.');
    assert(servicesCsv.includes('Spa Therapies'), 'Services CSV populates category name correctly.');
    assert(servicesCsv.includes('85'), 'Services CSV includes correct price.');
    assert(servicesCsv.includes('Express Facial 30m'), 'Services CSV includes second service name.');

    // Services Filter (active only)
    const activeServicesCsv = await generateServicesCsv(String(businessIdA), { status: 'active' });
    assert(activeServicesCsv.includes('Swedish Massage 60m'), 'Active filter includes active service.');
    assert(!activeServicesCsv.includes('Express Facial 30m'), 'Active filter excludes inactive service.');

    // 2. Payments CSV
    const paymentsCsv = await generatePaymentsCsv(String(businessIdA));
    assert(paymentsCsv.includes('"Payment Record ID","Transaction Reference","Appointment Number"'), 'Payments CSV has RFC 4180 header.');
    assert(paymentsCsv.includes(`APP-A1-${testSuffix}`), 'Payments CSV includes appointment number.');
    assert(paymentsCsv.includes('Alice Client'), 'Payments CSV populates customer name.');
    assert(paymentsCsv.includes(`txn_atlas_${testSuffix}`), 'Payments CSV includes transaction ID.');
    assert(paymentsCsv.includes('85'), 'Payments CSV includes paid amount.');

    // 3. Staff CSV
    const staffCsv = await generateStaffCsv(String(businessIdA));
    assert(staffCsv.includes('"Staff ID","Staff Name","Email Address"'), 'Staff CSV has RFC 4180 header.');
    assert(staffCsv.includes('Sarah Specialist'), 'Staff CSV includes staff name.');
    assert(staffCsv.includes(`sarah_staff_${testSuffix}@example.com`), 'Staff CSV populates staff email.');
    assert(staffCsv.includes('Uptown Salon Branch'), 'Staff CSV populates assigned location.');
    assert(staffCsv.includes('Swedish Massage 60m'), 'Staff CSV populates assigned services.');

    // ------------------------------------------------------------------------
    // PHASE 3: JSON Backup Bundle Assembly & Sanitization
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 3: JSON Backup Bundle Assembly & Sanitization ---');

    const backupBundle = await generateTenantBackupBundle({
      companyId: String(companyIdA),
      businessId: String(businessIdA),
    });

    assert(backupBundle.meta.platform === 'BookingGo SaaS', 'Bundle metadata includes correct platform name.');
    assert(backupBundle.meta.version === '1.0.0', 'Bundle metadata includes version 1.0.0.');
    assert(backupBundle.meta.businessName === businessAName, 'Bundle metadata includes correct business name.');
    assert(backupBundle.meta.counts.locations === 1, 'Bundle counts report 1 location.');
    assert(backupBundle.meta.counts.categories === 1, 'Bundle counts report 1 category.');
    assert(backupBundle.meta.counts.services === 2, 'Bundle counts report 2 services.');
    assert(backupBundle.meta.counts.staff === 1, 'Bundle counts report 1 staff member.');
    assert(backupBundle.meta.counts.customers === 2, 'Bundle counts report 2 customers.');
    assert(backupBundle.meta.counts.appointments === 2, 'Bundle counts report 2 appointments.');
    assert(backupBundle.meta.counts.payments === 1, 'Bundle counts report 1 payment.');
    assert(backupBundle.meta.counts.customStatuses === 1, 'Bundle counts report 1 custom status.');
    assert(backupBundle.meta.counts.customFields === 1, 'Bundle counts report 1 custom field.');

    // Verify sanitization
    const staffDoc = backupBundle.staff[0];
    assert(!('__v' in staffDoc), 'Bundle sanitized Mongoose internal __v property.');
    const serviceDoc = backupBundle.services[0];
    assert(!('__v' in serviceDoc), 'Service document sanitized Mongoose internal __v.');

    // ------------------------------------------------------------------------
    // PHASE 4: Backup Schema Validation Engine
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 4: Backup Schema Validation Engine ---');

    // Valid bundle check
    const validResult = validateBackupBundle(backupBundle);
    assert(validResult.valid === true, 'Valid bundle successfully passes schema validation.');
    assert(validResult.version === '1.0.0', 'Validation result reflects bundle version.');
    assert(validResult.businessName === businessAName, 'Validation result reflects business name.');

    // Invalid bundles
    const missingMeta = validateBackupBundle({ locations: [], services: [] });
    assert(missingMeta.valid === false, 'Bundle missing meta is rejected.');
    assert(missingMeta.errors?.some((e) => e.includes('Missing "meta" envelope')) === true, 'Accurate error message for missing meta.');

    const missingSections = validateBackupBundle({ meta: { version: '1.0.0', platform: 'BookingGo SaaS', businessId: '123', exportedAt: new Date().toISOString() } });
    assert(missingSections.valid === false, 'Bundle missing entity arrays is rejected.');

    // ------------------------------------------------------------------------
    // PHASE 5: Scoped Data Purge & Safety Guards
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 5: Scoped Data Purge & Safety Guards ---');

    // 1. Safety check: Wrong confirmation text rejected
    const badConfirmResult = await purgeTenantData({
      companyId: String(companyIdA),
      businessId: String(businessIdA),
      businessName: businessAName,
      confirmationText: 'INCORRECT_TEXT',
      scope: 'appointments_and_payments',
    });
    assert(badConfirmResult.success === false, 'Data purge blocked when confirmation text does not match.');
    assert(badConfirmResult.error?.includes('Safety check failed') === true, 'Descriptive safety error returned.');

    // Verify nothing was deleted
    const countBeforeReset = await Appointment.countDocuments({ businessId: businessIdA });
    assert(countBeforeReset === 2, 'Appointments untouched after rejected confirmation.');

    // 2. Safe Purge Scope 1: appointments_and_payments with valid business name confirmation
    const purgeScope1Result = await purgeTenantData({
      companyId: String(companyIdA),
      businessId: String(businessIdA),
      businessName: businessAName,
      confirmationText: businessAName, // Exact name confirmation
      scope: 'appointments_and_payments',
    });

    assert(purgeScope1Result.success === true, 'Purge scope appointments_and_payments executed successfully.');
    assert(purgeScope1Result.deletedCounts?.appointments === 2, 'Reported 2 appointments deleted.');
    assert(purgeScope1Result.deletedCounts?.appointmentPayments === 1, 'Reported 1 payment deleted.');

    // Check DB state for Tenant A
    const appCountAAfter = await Appointment.countDocuments({ businessId: businessIdA });
    const payCountAAfter = await AppointmentPayment.countDocuments({ businessId: businessIdA });
    const custCountAAfter = await Customer.countDocuments({ businessId: businessIdA });
    const srvCountAAfter = await Service.countDocuments({ businessId: businessIdA });

    assert(appCountAAfter === 0, 'Tenant A appointments completely deleted from DB.');
    assert(payCountAAfter === 0, 'Tenant A appointment payments completely deleted from DB.');
    assert(custCountAAfter === 2, 'Tenant A customers PRESERVED after appointments_and_payments reset.');
    assert(srvCountAAfter === 2, 'Tenant A services PRESERVED after appointments_and_payments reset.');

    // ------------------------------------------------------------------------
    // PHASE 6: Multi-Tenant Isolation Invariant
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 6: Multi-Tenant Isolation Invariant ---');

    // Verify Tenant B was completely unaffected
    const appCountB = await Appointment.countDocuments({ businessId: businessIdB });
    const payCountB = await AppointmentPayment.countDocuments({ businessId: businessIdB });
    const custCountB = await Customer.countDocuments({ businessId: businessIdB });
    const srvCountB = await Service.countDocuments({ businessId: businessIdB });

    assert(appCountB === 1, 'Tenant B appointment 100% untouched by Tenant A purge.');
    assert(payCountB === 1, 'Tenant B payment 100% untouched by Tenant A purge.');
    assert(custCountB === 1, 'Tenant B customer 100% untouched by Tenant A purge.');
    assert(srvCountB === 1, 'Tenant B service 100% untouched by Tenant A purge.');

    // ------------------------------------------------------------------------
    // PHASE 7: Scoped Purge - Test Data With Customers & Full Business Purge
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 7: Multi-Tier Reset Scopes Verification ---');

    // Scope 2: test_data_with_customers using "CONFIRM_RESET" keyword
    const purgeScope2Result = await purgeTenantData({
      companyId: String(companyIdA),
      businessId: String(businessIdA),
      businessName: businessAName,
      confirmationText: 'CONFIRM_RESET',
      scope: 'test_data_with_customers',
    });

    assert(purgeScope2Result.success === true, 'Purge scope test_data_with_customers accepted "CONFIRM_RESET".');
    assert(purgeScope2Result.deletedCounts?.customers === 2, 'Reported 2 customers deleted.');

    const custCountAAfterScope2 = await Customer.countDocuments({ businessId: businessIdA });
    const srvCountAAfterScope2 = await Service.countDocuments({ businessId: businessIdA });
    assert(custCountAAfterScope2 === 0, 'Tenant A customers deleted from DB.');
    assert(srvCountAAfterScope2 === 2, 'Tenant A services still preserved.');

    // Scope 3: full_catalog_and_bookings
    const purgeScope3Result = await purgeTenantData({
      companyId: String(companyIdA),
      businessId: String(businessIdA),
      businessName: businessAName,
      confirmationText: 'confirm_reset',
      scope: 'full_catalog_and_bookings',
    });

    assert(purgeScope3Result.success === true, 'Purge scope full_catalog_and_bookings executed successfully.');
    assert(purgeScope3Result.deletedCounts?.services === 2, 'Reported 2 services deleted.');
    assert(purgeScope3Result.deletedCounts?.categories === 1, 'Reported 1 category deleted.');
    assert(purgeScope3Result.deletedCounts?.locations === 1, 'Reported 1 location deleted.');
    assert(purgeScope3Result.deletedCounts?.customStatuses === 1, 'Reported 1 custom status deleted.');
    assert(purgeScope3Result.deletedCounts?.customFields === 1, 'Reported 1 custom field deleted.');

    // Verify Business document and Company User still exist
    const businessAExists = await Business.findById(businessIdA);
    const companyAExists = await User.findById(companyIdA);
    assert(businessAExists !== null, 'Business profile itself is PRESERVED after full catalog reset.');
    assert(companyAExists !== null, 'Company User account is PRESERVED after full catalog reset.');

    // Verify Tenant B still completely untouched
    const appCountBFinal = await Appointment.countDocuments({ businessId: businessIdB });
    assert(appCountBFinal === 1, 'Tenant B remains 100% intact through all Tenant A resets.');

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP: Clean up all test fixtures
    // ------------------------------------------------------------------------
    console.log('\n--- Cleanup: Deleting Test Fixtures ---');
    await Promise.all([
      User.deleteMany({ _id: { $in: [companyIdA, staffUserIdA, companyIdB, staffUserIdB] } }),
      Business.deleteMany({ _id: { $in: [businessIdA, businessIdB] } }),
      Location.deleteMany({ _id: { $in: [locationIdA, locationIdB] } }),
      Category.deleteMany({ _id: { $in: [categoryIdA, categoryIdB] } }),
      Service.deleteMany({ _id: { $in: [serviceIdA1, serviceIdA2, serviceIdB] } }),
      Staff.deleteMany({ _id: { $in: [staffIdA, staffIdB] } }),
      CustomStatus.deleteMany({ businessId: { $in: [businessIdA, businessIdB] } }),
      CustomField.deleteMany({ businessId: { $in: [businessIdA, businessIdB] } }),
      Customer.deleteMany({ _id: { $in: [customerIdA1, customerIdA2, customerIdB] } }),
      Appointment.deleteMany({ _id: { $in: [appointmentIdA1, appointmentIdA2, appointmentIdB] } }),
      AppointmentPayment.deleteMany({ _id: { $in: [paymentIdA1, paymentIdB] } }),
    ]);
    console.log('Test fixtures cleaned up successfully.');
  }

  console.log('\n===============================================================');
  console.log(` Summary: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTenantBackupResetSuite().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Fatal error running suite:', err);
  process.exit(1);
});
