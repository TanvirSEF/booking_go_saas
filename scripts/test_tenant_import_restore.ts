import { Types } from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { Location } from '../models/Location';
import { Category } from '../models/Category';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Customer } from '../models/Customer';
import { Appointment } from '../models/Appointment';
import { AppointmentPayment } from '../models/AppointmentPayment';
import { generateTenantBackupBundle } from '../lib/tenant-backup-engine';
import {
  parseCsv,
  importCustomersFromCsv,
  importServicesFromCsv,
  importStaffFromCsv,
  restoreTenantFromBackupBundle,
} from '../lib/tenant-import-engine';

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

async function runTenantImportSuite() {
  console.log('\n===============================================================');
  console.log(' Priority 29 [BGO-247]: Tenant Data Import & Restore Test');
  console.log('===============================================================\n');

  await connectToDatabase();

  const testSuffix = Date.now().toString().slice(-6);

  // Fixture IDs
  const companyUserIdA = new Types.ObjectId();
  const businessIdA = new Types.ObjectId();
  const locationIdA = new Types.ObjectId();
  const categoryIdA = new Types.ObjectId();
  const serviceIdA = new Types.ObjectId();
  const staffUserIdA = new Types.ObjectId();
  const staffIdA = new Types.ObjectId();
  const customerIdA = new Types.ObjectId();
  const appointmentIdA = new Types.ObjectId();

  const companyUserIdB = new Types.ObjectId();
  const businessIdB = new Types.ObjectId();

  const companyUserIdC = new Types.ObjectId();
  const businessIdC = new Types.ObjectId();

  try {
    // -------------------------------------------------------------
    // SETUP FIXTURES
    // -------------------------------------------------------------
    console.log('--- Setting up Atlas Fixtures ---');

    // Tenant A
    await User.create({
      _id: companyUserIdA,
      name: `Tenant Owner A ${testSuffix}`,
      email: `owner_a_${testSuffix}@example.com`,
      role: 'company',
      lang: 'en',
    });

    await Business.create({
      _id: businessIdA,
      companyId: companyUserIdA,
      name: `Alpha Care ${testSuffix}`,
      slug: `alpha-care-${testSuffix}`,
      currency: 'USD',
      currencySymbol: '$',
    });

    await Location.create({
      _id: locationIdA,
      companyId: companyUserIdA,
      businessId: businessIdA,
      name: 'Downtown Medical Center',
      address: '100 Main St, New York',
      phone: '+15551000',
      isActive: true,
    });

    await Category.create({
      _id: categoryIdA,
      companyId: companyUserIdA,
      businessId: businessIdA,
      name: 'General Health',
      order: 0,
      isActive: true,
    });

    await Service.create({
      _id: serviceIdA,
      companyId: companyUserIdA,
      businessId: businessIdA,
      categoryId: categoryIdA,
      name: 'Full Health Checkup',
      price: 150,
      durationMinutes: 60,
      bufferMinutes: 10,
      isActive: true,
    });

    await User.create({
      _id: staffUserIdA,
      name: `Dr. Gregory House ${testSuffix}`,
      email: `house_${testSuffix}@alphacare.io`,
      role: 'staff',
      companyId: companyUserIdA,
      activeBusinessId: businessIdA,
      lang: 'en',
    });

    await Staff.create({
      _id: staffIdA,
      companyId: companyUserIdA,
      businessId: businessIdA,
      userId: staffUserIdA,
      name: `Dr. Gregory House ${testSuffix}`,
      locationIds: [locationIdA],
      serviceIds: [serviceIdA],
      colorCode: '#CEEDC1',
      isActive: true,
    });

    await Customer.create({
      _id: customerIdA,
      companyId: companyUserIdA,
      businessId: businessIdA,
      name: `John Doe ${testSuffix}`,
      email: `john_${testSuffix}@patient.com`,
      contact: '+15552000',
      gender: 'male',
    });

    await Appointment.create({
      _id: appointmentIdA,
      companyId: companyUserIdA,
      businessId: businessIdA,
      locationId: locationIdA,
      serviceId: serviceIdA,
      staffId: staffIdA,
      customerId: customerIdA,
      customerType: 'existing-user',
      appointmentNumber: `APT-${testSuffix}-001`,
      name: `John Doe ${testSuffix}`,
      email: `john_${testSuffix}@patient.com`,
      contact: '+15552000',
      date: '2026-10-15',
      time: '11:00',
      durationMinutes: 60,
      price: 150,
      paymentType: 'Stripe',
      paymentStatus: 'paid',
      appointmentStatus: 'Confirmed',
      statusColor: '#21c9b0',
    });

    // Tenant B (Target for restore and import)
    await User.create({
      _id: companyUserIdB,
      name: `Tenant Owner B ${testSuffix}`,
      email: `owner_b_${testSuffix}@example.com`,
      role: 'company',
      lang: 'en',
    });

    await Business.create({
      _id: businessIdB,
      companyId: companyUserIdB,
      name: `Beta Health ${testSuffix}`,
      slug: `beta-health-${testSuffix}`,
      currency: 'USD',
      currencySymbol: '$',
    });

    console.log('Fixtures provisioned successfully.\n');

    // -------------------------------------------------------------
    // TEST SECTION 1: RFC 4180 CSV Streaming Parser
    // -------------------------------------------------------------
    console.log('--- Test Section 1: RFC 4180 CSV Streaming Parser ---');

    // 1. Parser handles quotes, commas inside quotes, escaped quotes, and newlines
    const rawCsv = `Name,Email,"Contact Number","Notes"\r\n` +
      `"Alice Smith",alice@example.com,"+15553001","Standard consultation"\r\n` +
      `"Bob ""The Builder"" Jones",bob@example.com,"+15553002","Specialist: Needs extra time,\nand follow-up exam"\r\n` +
      `Charlie Brown,charlie@example.com,"+15553003","Dr. says: ""All good"""\r\n`;

    const parsed = parseCsv(rawCsv);
    assert(parsed.totalRows === 3, `Parsed exactly 3 rows (got ${parsed.totalRows})`);
    assert(parsed.headers.includes('name'), 'Header normalized "Name" -> "name"');
    assert(parsed.headers.includes('contact'), 'Header normalized "Contact Number" -> "contact"');

    const row1 = parsed.rows[0];
    assert(row1.name === 'Alice Smith', 'Row 1 name parsed as Alice Smith');
    assert(row1.contact === '+15553001', 'Row 1 contact parsed correctly');

    const row2 = parsed.rows[1];
    assert(row2.name === 'Bob "The Builder" Jones', 'Escaped double quotes parsed cleanly');
    assert(row2.notes.includes('\nand follow-up exam'), 'Multi-line cell inside quotes preserved');

    const row3 = parsed.rows[2];
    assert(row3.notes === 'Dr. says: "All good"', 'Nested escaped quotes parsed accurately');

    // -------------------------------------------------------------
    // TEST SECTION 2: Customer Bulk Import & Conflict Resolution
    // -------------------------------------------------------------
    console.log('\n--- Test Section 2: Customer Bulk Import & Conflict Strategies ---');

    const customersCsv = `Name,Email,Phone,Gender,Description\r\n` +
      `Emma Watson,emma_${testSuffix}@example.com,+15554001,female,"VIP Customer"\r\n` +
      `David Miller,david_${testSuffix}@example.com,+15554002,male,"First visit"\r\n` +
      `Sarah Connor,sarah_${testSuffix}@example.com,+15554003,female,"Referral"\r\n`;

    // 1. Initial import (3 new customers)
    const custResult1 = await importCustomersFromCsv(businessIdB, customersCsv, 'skip');
    assert(custResult1.importedCount === 3, `Imported 3 new customers (got ${custResult1.importedCount})`);
    assert(custResult1.skippedCount === 0, 'Zero customers skipped on initial import');
    assert(custResult1.errors.length === 0, 'Zero errors reported');

    const custDbCount1 = await Customer.countDocuments({ businessId: businessIdB });
    assert(custDbCount1 === 3, 'Atlas persists 3 customers under Tenant B');

    // 2. Duplicate import with 'skip' strategy
    const custResultSkip = await importCustomersFromCsv(businessIdB, customersCsv, 'skip');
    assert(custResultSkip.skippedCount === 3, `Skipped 3 existing customers with 'skip' strategy (got ${custResultSkip.skippedCount})`);
    assert(custResultSkip.importedCount === 0, 'Zero duplicate customers created');

    const custDbCountRecheck = await Customer.countDocuments({ businessId: businessIdB });
    assert(custDbCountRecheck === 3, 'Customer count unchanged after skip (still 3)');

    // 3. Re-import with 'update' strategy (modified description)
    const updatedCustomersCsv = `Name,Email,Phone,Gender,Description\r\n` +
      `Emma Watson,emma_${testSuffix}@example.com,+15554001,female,"Updated VIP Customer Note"\r\n` +
      `David Miller,david_${testSuffix}@example.com,+15554002,male,"Regular patient"\r\n` +
      `Sarah Connor,sarah_${testSuffix}@example.com,+15554003,female,"Referred by Dr. House"\r\n`;

    const custResultUpdate = await importCustomersFromCsv(businessIdB, updatedCustomersCsv, 'update');
    assert(custResultUpdate.updatedCount === 3, `Updated 3 existing customers with 'update' strategy (got ${custResultUpdate.updatedCount})`);
    assert(custResultUpdate.importedCount === 0, 'Zero new customers created on update');

    const emmaDoc = await Customer.findOne({ businessId: businessIdB, contact: '+15554001' });
    assert(emmaDoc?.description === 'Updated VIP Customer Note', 'Customer description updated in Atlas');

    // -------------------------------------------------------------
    // TEST SECTION 3: Service Bulk Import & Dynamic Category Provisioning
    // -------------------------------------------------------------
    console.log('\n--- Test Section 3: Service Bulk Import & Dynamic Category Provisioning ---');

    const servicesCsv = `Service Name,Category Name,Price,Duration (Mins),Buffer Time (Mins),Status,Description\r\n` +
      `Cardiology Screening,Cardiology Consultations,250,45,15,Active,"Comprehensive heart check"\r\n` +
      `ECG Stress Test,Cardiology Consultations,180,30,10,Active,"Treadmill ECG test"\r\n` +
      `Routine Dental Clean,Dentistry,120,40,5,Active,"Teeth scaling and cleaning"\r\n`;

    const svcResult = await importServicesFromCsv(businessIdB, servicesCsv, 'skip');
    assert(svcResult.importedCount === 3, `Imported 3 new services (got ${svcResult.importedCount})`);
    assert(svcResult.errors.length === 0, 'Zero errors during service import');

    // Verify automatic category provisioning
    const cardioCat = await Category.findOne({
      businessId: businessIdB,
      name: 'Cardiology Consultations',
    });
    assert(cardioCat !== null, 'Automatically provisioned "Cardiology Consultations" category');
    assert(String(cardioCat?.companyId) === String(companyUserIdB), 'Provisioned category scoped to Tenant B');

    const dentalCat = await Category.findOne({
      businessId: businessIdB,
      name: 'Dentistry',
    });
    assert(dentalCat !== null, 'Automatically provisioned "Dentistry" category');

    // Verify service link to category
    const ecgSvc = await Service.findOne({ businessId: businessIdB, name: 'ECG Stress Test' });
    assert(ecgSvc !== null, 'ECG Stress Test created');
    assert(String(ecgSvc?.categoryId) === String(cardioCat?._id), 'Service linked to auto-provisioned category');
    assert(ecgSvc?.durationMinutes === 30, 'Duration parsed as 30 mins');
    assert(ecgSvc?.bufferMinutes === 10, 'Buffer parsed as 10 mins');

    // Update service via CSV
    const updatedServicesCsv = `Service Name,Category Name,Price,Duration (Mins),Buffer Time (Mins),Status,Description\r\n` +
      `Cardiology Screening,Cardiology Consultations,275,50,15,Active,"Updated heart check rate"\r\n`;

    const svcUpdateResult = await importServicesFromCsv(businessIdB, updatedServicesCsv, 'update');
    assert(svcUpdateResult.updatedCount === 1, 'Updated 1 service via update strategy');

    const updatedCardio = await Service.findOne({ businessId: businessIdB, name: 'Cardiology Screening' });
    assert(updatedCardio?.price === 275, 'Price updated to $275');
    assert(updatedCardio?.durationMinutes === 50, 'Duration updated to 50 mins');

    // -------------------------------------------------------------
    // TEST SECTION 4: Staff Specialist Bulk Import & Linked User Provisioning
    // -------------------------------------------------------------
    console.log('\n--- Test Section 4: Staff Specialist Bulk Import & User Provisioning ---');

    // Create a location in Business B for staff mapping
    const locB = await Location.create({
      companyId: companyUserIdB,
      businessId: businessIdB,
      name: 'City Clinic B',
      address: '200 Oak Ave',
      phone: '+15555000',
      isActive: true,
    });

    const staffCsv = `Staff Name,Email,Assigned Locations,Assigned Services,Color Code,Status\r\n` +
      `Dr. Lisa Cuddy,cuddy_${testSuffix}@betacare.io,City Clinic B,Cardiology Screening,#C1E6F9,Active\r\n` +
      `Dr. Robert Chase,chase_${testSuffix}@betacare.io,City Clinic B,"Cardiology Screening, ECG Stress Test",#FFEDD2,Active\r\n`;

    const staffResult = await importStaffFromCsv(businessIdB, staffCsv, 'skip');
    assert(staffResult.importedCount === 2, `Imported 2 staff specialists (got ${staffResult.importedCount})`);

    // Verify linked User records provisioned
    const cuddyUser = await User.findOne({ email: `cuddy_${testSuffix}@betacare.io` });
    assert(cuddyUser !== null, 'User account automatically created for Dr. Cuddy');
    assert(cuddyUser?.role === 'staff', 'User role assigned as "staff"');
    assert(String(cuddyUser?.companyId) === String(companyUserIdB), 'Staff user scoped to Tenant B company');

    const cuddyStaff = await Staff.findOne({ businessId: businessIdB, userId: cuddyUser?._id });
    assert(cuddyStaff !== null, 'Staff profile created for Dr. Cuddy');
    assert(cuddyStaff?.locationIds.some((id) => String(id) === String(locB._id)) === true, 'Linked to City Clinic B location');

    const chaseStaff = await Staff.findOne({ businessId: businessIdB, name: 'Dr. Robert Chase' });
    assert(chaseStaff !== null, 'Dr. Robert Chase staff record created');
    assert(chaseStaff?.serviceIds.length === 2, 'Linked to both specified services');

    // -------------------------------------------------------------
    // TEST SECTION 5: Tenant Backup Bundle Dry-Run Restore
    // -------------------------------------------------------------
    console.log('\n--- Test Section 5: Tenant Backup Bundle Dry-Run Restore ---');

    // Generate valid backup bundle from Tenant A
    const bundleA = await generateTenantBackupBundle({
      companyId: String(companyUserIdA),
      businessId: String(businessIdA),
    });
    assert(bundleA.meta.platform.includes('BookingGo'), 'Bundle A generated with BookingGo platform metadata');
    assert(bundleA.appointments.length === 1, 'Bundle A contains 1 appointment');

    // Prepare fresh Tenant C for clean restore testing

    await User.create({
      _id: companyUserIdC,
      name: `Tenant Owner C ${testSuffix}`,
      email: `owner_c_${testSuffix}@example.com`,
      role: 'company',
      lang: 'en',
    });

    await Business.create({
      _id: businessIdC,
      companyId: companyUserIdC,
      name: `Clean Tenant C ${testSuffix}`,
      slug: `clean-tenant-c-${testSuffix}`,
      currency: 'USD',
      currencySymbol: '$',
    });

    // Run Dry-Run Restore
    const dryRunResult = await restoreTenantFromBackupBundle(businessIdC, bundleA, { dryRun: true });
    assert(dryRunResult.dryRun === true, 'dryRun confirmed as true');
    assert(dryRunResult.errors.length === 0, 'Zero dry-run validation errors');
    assert(dryRunResult.importedCounts.locations === 1, 'Projected 1 location');
    assert(dryRunResult.importedCounts.services === 1, 'Projected 1 service');
    assert(dryRunResult.importedCounts.staff === 1, 'Projected 1 staff member');
    assert(dryRunResult.importedCounts.appointments === 1, 'Projected 1 appointment');

    // Confirm ZERO mutations in Tenant C
    const countLocCPre = await Location.countDocuments({ businessId: businessIdC });
    assert(countLocCPre === 0, 'Atlas verified ZERO locations in Tenant C after dry-run');
    const countApptCPre = await Appointment.countDocuments({ businessId: businessIdC });
    assert(countApptCPre === 0, 'Atlas verified ZERO appointments in Tenant C after dry-run');

    // -------------------------------------------------------------
    // TEST SECTION 6: Backup Bundle Live Restore with ID Remapping
    // -------------------------------------------------------------
    console.log('\n--- Test Section 6: Backup Bundle Live Restore & ID Remapping ---');

    const liveRestoreResult = await restoreTenantFromBackupBundle(businessIdC, bundleA, { dryRun: false });
    assert(liveRestoreResult.dryRun === false, 'Live execution mode confirmed');
    assert(liveRestoreResult.errors.length === 0, 'Zero errors during live restore');

    // 1. Verify all records exist under Tenant C
    const [locC, catC, svcC, staffC, custC, apptC] = await Promise.all([
      Location.findOne({ businessId: businessIdC }),
      Category.findOne({ businessId: businessIdC }),
      Service.findOne({ businessId: businessIdC }),
      Staff.findOne({ businessId: businessIdC }),
      Customer.findOne({ businessId: businessIdC }),
      Appointment.findOne({ businessId: businessIdC }),
    ]);

    assert(locC !== null, 'Restored Location exists under Tenant C');
    assert(catC !== null, 'Restored Category exists under Tenant C');
    assert(svcC !== null, 'Restored Service exists under Tenant C');
    assert(staffC !== null, 'Restored Staff exists under Tenant C');
    assert(custC !== null, 'Restored Customer exists under Tenant C');
    assert(apptC !== null, 'Restored Appointment exists under Tenant C');

    // 2. Verify all ObjectIds were REMAPPED to prevent collision with Tenant A
    assert(String(locC?._id) !== String(locationIdA), 'Location _id remapped (no collision with Tenant A)');
    assert(String(catC?._id) !== String(categoryIdA), 'Category _id remapped');
    assert(String(svcC?._id) !== String(serviceIdA), 'Service _id remapped');
    assert(String(staffC?._id) !== String(staffIdA), 'Staff _id remapped');
    assert(String(custC?._id) !== String(customerIdA), 'Customer _id remapped');
    assert(String(apptC?._id) !== String(appointmentIdA), 'Appointment _id remapped');

    // 3. Verify referential integrity between restored child and parent entities
    assert(String(svcC?.categoryId) === String(catC?._id), 'Restored Service points to restored Category');
    assert(staffC?.locationIds.some((id) => String(id) === String(locC?._id)) === true, 'Restored Staff points to restored Location');
    assert(staffC?.serviceIds.some((id) => String(id) === String(svcC?._id)) === true, 'Restored Staff points to restored Service');
    assert(String(apptC?.locationId) === String(locC?._id), 'Restored Appointment points to restored Location');
    assert(String(apptC?.serviceId) === String(svcC?._id), 'Restored Appointment points to restored Service');
    assert(String(apptC?.staffId) === String(staffC?._id), 'Restored Appointment points to restored Staff');
    assert(String(apptC?.customerId) === String(custC?._id), 'Restored Appointment points to restored Customer');

    // -------------------------------------------------------------
    // TEST SECTION 7: Multi-Tenant Boundary Isolation
    // -------------------------------------------------------------
    console.log('\n--- Test Section 7: Multi-Tenant Boundary Isolation ---');

    // Tenant A documents must remain 100% untouched
    const countLocA = await Location.countDocuments({ businessId: businessIdA });
    assert(countLocA === 1, 'Tenant A still has exactly 1 location (untouched)');
    const countApptA = await Appointment.countDocuments({ businessId: businessIdA });
    assert(countApptA === 1, 'Tenant A still has exactly 1 appointment (untouched)');

    const countApptB = await Appointment.countDocuments({ businessId: businessIdB });
    assert(countApptB === 0, 'Tenant B has 0 appointments (untouched by Tenant C restore)');
  } finally {
    // -------------------------------------------------------------
    // CLEANUP FIXTURES
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up Test Fixtures from Atlas ---');

    await Promise.all([
      User.deleteMany({
        $or: [
          { email: new RegExp(`_${testSuffix}@`) },
          { _id: { $in: [companyUserIdA, companyUserIdB, companyUserIdC] } },
        ],
      }),
      Business.deleteMany({
        _id: { $in: [businessIdA, businessIdB, businessIdC] },
        slug: new RegExp(testSuffix),
      }),
      Location.deleteMany({
        $or: [
          { businessId: { $in: [businessIdA, businessIdB, businessIdC] } },
          { name: new RegExp(testSuffix) },
        ],
      }),
      Category.deleteMany({
        $or: [
          { businessId: { $in: [businessIdA, businessIdB, businessIdC] } },
          { name: new RegExp(testSuffix) },
        ],
      }),
      Service.deleteMany({
        $or: [
          { businessId: { $in: [businessIdA, businessIdB, businessIdC] } },
          { name: new RegExp(testSuffix) },
        ],
      }),
      Staff.deleteMany({
        $or: [
          { businessId: { $in: [businessIdA, businessIdB, businessIdC] } },
          { name: new RegExp(testSuffix) },
        ],
      }),
      Customer.deleteMany({
        $or: [
          { businessId: { $in: [businessIdA, businessIdB, businessIdC] } },
          { name: new RegExp(testSuffix) },
        ],
      }),
      Appointment.deleteMany({
        $or: [
          { businessId: { $in: [businessIdA, businessIdB, businessIdC] } },
          { appointmentNumber: new RegExp(testSuffix) },
        ],
      }),
      AppointmentPayment.deleteMany({
        companyId: { $in: [companyUserIdA, companyUserIdB, companyUserIdC] },
      }),
    ]);

    console.log('Atlas cleanup finished.');
  }

  console.log('\n===============================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

void runTenantImportSuite().then(() => {
  process.exit(0);
});
