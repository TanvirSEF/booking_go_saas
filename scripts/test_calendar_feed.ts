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
import {
  ensureBusinessFeedToken,
  ensureStaffFeedToken,
  rotateBusinessFeedToken,
  rotateStaffFeedToken,
  resolveFeedToken,
  generateIcsFeed,
  getCalendarFeedSummary,
  buildFeedUrls,
} from '../lib/calendar-feed-engine';

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

async function runCalendarFeedSuite() {
  console.log('\n===============================================================');
  console.log(' Priority 26 [BGO-244]: Live iCal / ICS Feed & Calendar Sync Test');
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
  const staffUserIdA1 = new Types.ObjectId();
  const staffUserIdA2 = new Types.ObjectId();
  const staffIdA1 = new Types.ObjectId();
  const staffIdA2 = new Types.ObjectId();
  const customerIdA1 = new Types.ObjectId();
  const customerIdA2 = new Types.ObjectId();
  const appointmentIdA1 = new Types.ObjectId();
  const appointmentIdA2 = new Types.ObjectId();
  const appointmentIdA3 = new Types.ObjectId();

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

  const businessAName = `Atlas Sync Clinic ${testSuffix}`;
  const businessBName = `Control Clinic ${testSuffix}`;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Provision Test Fixtures in MongoDB Atlas
    // ------------------------------------------------------------------------
    console.log('--- Phase 1: Provisioning Test Fixtures ---');

    // Tenant A
    await User.create({
      _id: companyIdA,
      name: `Company Owner A ${testSuffix}`,
      email: `company_cal_a_${testSuffix}@example.com`,
      password: 'hashed_password_123',
      role: 'company',
      activeBusinessId: businessIdA,
    });

    await Business.create({
      _id: businessIdA,
      companyId: companyIdA,
      name: businessAName,
      slug: `atlas-sync-clinic-${testSuffix}`,
    });

    await Location.create({
      _id: locationIdA,
      companyId: companyIdA,
      businessId: businessIdA,
      name: 'Central Diagnostic Pavilion',
      address: '742 Evergreen Terrace',
    });

    await Category.create({
      _id: categoryIdA,
      companyId: companyIdA,
      businessId: businessIdA,
      name: 'Clinical Diagnostics',
      order: 1,
      isActive: true,
    });

    await Service.create([
      {
        _id: serviceIdA1,
        companyId: companyIdA,
        businessId: businessIdA,
        categoryId: categoryIdA,
        name: 'General Consultation',
        price: 50,
        durationMinutes: 30,
        isActive: true,
      },
      {
        _id: serviceIdA2,
        companyId: companyIdA,
        businessId: businessIdA,
        categoryId: categoryIdA,
        name: 'Comprehensive Diagnostic',
        price: 150,
        durationMinutes: 60,
        isActive: true,
      },
    ]);

    await User.create([
      {
        _id: staffUserIdA1,
        name: 'Dr. Gregory House',
        email: `house_${testSuffix}@hospital.com`,
        password: 'hashed_password_123',
        role: 'staff',
        companyId: companyIdA,
        activeBusinessId: businessIdA,
      },
      {
        _id: staffUserIdA2,
        name: 'Dr. James Wilson',
        email: `wilson_${testSuffix}@hospital.com`,
        password: 'hashed_password_123',
        role: 'staff',
        companyId: companyIdA,
        activeBusinessId: businessIdA,
      },
    ]);

    await Staff.create([
      {
        _id: staffIdA1,
        companyId: companyIdA,
        businessId: businessIdA,
        userId: staffUserIdA1,
        name: 'Dr. Gregory House',
        locationIds: [locationIdA],
        serviceIds: [serviceIdA1, serviceIdA2],
        colorCode: '#CEEDC1',
        isActive: true,
      },
      {
        _id: staffIdA2,
        companyId: companyIdA,
        businessId: businessIdA,
        userId: staffUserIdA2,
        name: 'Dr. James Wilson',
        locationIds: [locationIdA],
        serviceIds: [serviceIdA1, serviceIdA2],
        colorCode: '#C3DEFB',
        isActive: true,
      },
    ]);

    await Customer.create([
      {
        _id: customerIdA1,
        companyId: companyIdA,
        businessId: businessIdA,
        name: 'Patient Robert',
        email: `robert_${testSuffix}@example.com`,
        contact: '+15551112222',
        gender: 'male',
      },
      {
        _id: customerIdA2,
        companyId: companyIdA,
        businessId: businessIdA,
        name: 'Patient Lisa',
        email: `lisa_${testSuffix}@example.com`,
        contact: '+15553334444',
        gender: 'female',
      },
    ]);

    await Appointment.create([
      {
        _id: appointmentIdA1,
        companyId: companyIdA,
        businessId: businessIdA,
        appointmentNumber: `CAL-A1-${testSuffix}`,
        serviceId: serviceIdA1,
        staffId: staffIdA1,
        locationId: locationIdA,
        customerId: customerIdA1,
        name: 'Patient Robert',
        email: `robert_${testSuffix}@example.com`,
        contact: '+15551112222',
        date: '2026-10-15',
        time: '10:00 - 10:30',
        price: 50,
        appointmentStatus: 'Confirmed',
        notes: 'Follow-up consultation',
      },
      {
        _id: appointmentIdA2,
        companyId: companyIdA,
        businessId: businessIdA,
        appointmentNumber: `CAL-A2-${testSuffix}`,
        serviceId: serviceIdA2,
        staffId: staffIdA2,
        locationId: locationIdA,
        customerId: customerIdA2,
        name: 'Patient Lisa',
        email: `lisa_${testSuffix}@example.com`,
        contact: '+15553334444',
        date: '2026-10-15',
        time: '14:00 - 15:00',
        price: 150,
        appointmentStatus: 'Confirmed',
        notes: 'Full evaluation requested',
      },
      {
        _id: appointmentIdA3,
        companyId: companyIdA,
        businessId: businessIdA,
        appointmentNumber: `CAL-A3-${testSuffix}`,
        serviceId: serviceIdA1,
        staffId: staffIdA1,
        locationId: locationIdA,
        customerId: customerIdA1,
        name: 'Patient Robert',
        email: `robert_${testSuffix}@example.com`,
        contact: '+15551112222',
        date: '2026-10-16',
        time: '11:00 - 11:30',
        price: 50,
        appointmentStatus: 'Cancelled',
        notes: 'Cancelled due to patient travel',
      },
    ]);

    // Tenant B (Control)
    await User.create({
      _id: companyIdB,
      name: `Company Owner B ${testSuffix}`,
      email: `company_cal_b_${testSuffix}@example.com`,
      password: 'hashed_password_123',
      role: 'company',
      activeBusinessId: businessIdB,
    });

    await Business.create({
      _id: businessIdB,
      companyId: companyIdB,
      name: businessBName,
      slug: `control-clinic-${testSuffix}`,
    });

    await Location.create({
      _id: locationIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      name: 'North Dental Center',
      address: '100 North Way',
    });

    await Category.create({
      _id: categoryIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      name: 'Dental Procedures',
      order: 1,
      isActive: true,
    });

    await Service.create({
      _id: serviceIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      categoryId: categoryIdB,
      name: 'Orthodontic Exam',
      price: 200,
      durationMinutes: 45,
      isActive: true,
    });

    await User.create({
      _id: staffUserIdB,
      name: 'Dr. John Watson',
      email: `watson_${testSuffix}@hospital.com`,
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
      name: 'Dr. John Watson',
      locationIds: [locationIdB],
      serviceIds: [serviceIdB],
      colorCode: '#FFD8D8',
      isActive: true,
    });

    await Customer.create({
      _id: customerIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      name: 'Patient Charlie',
      email: `charlie_${testSuffix}@example.com`,
      contact: '+15558889999',
      gender: 'male',
    });

    await Appointment.create({
      _id: appointmentIdB,
      companyId: companyIdB,
      businessId: businessIdB,
      appointmentNumber: `CAL-B1-${testSuffix}`,
      serviceId: serviceIdB,
      staffId: staffIdB,
      locationId: locationIdB,
      customerId: customerIdB,
      name: 'Patient Charlie',
      email: `charlie_${testSuffix}@example.com`,
      contact: '+15558889999',
      date: '2026-10-18',
      time: '09:00 - 09:45',
      price: 200,
      appointmentStatus: 'Confirmed',
    });

    assert(true, 'Test fixtures for Tenant A and Tenant B created successfully.');

    // ------------------------------------------------------------------------
    // PHASE 2: Token Provisioning & URL Building
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 2: Token Provisioning & URL Building ---');

    const businessTokenA = await ensureBusinessFeedToken(String(businessIdA));
    assert(businessTokenA.length === 48, 'Business token is 48-char high-entropy hex string.');
    assert(/^[a-f0-9]+$/i.test(businessTokenA), 'Business token contains valid hex characters.');

    // Idempotency: calling again returns exact same token
    const idempotentBusinessToken = await ensureBusinessFeedToken(String(businessIdA));
    assert(idempotentBusinessToken === businessTokenA, 'ensureBusinessFeedToken is idempotent.');

    const staffTokenA1 = await ensureStaffFeedToken(String(staffIdA1));
    const staffTokenA2 = await ensureStaffFeedToken(String(staffIdA2));
    assert(staffTokenA1.length === 48, 'Staff A1 token is 48-char hex string.');
    assert(staffTokenA2.length === 48, 'Staff A2 token is 48-char hex string.');
    assert(staffTokenA1 !== staffTokenA2, 'Staff A1 and Staff A2 have distinct tokens.');
    assert(staffTokenA1 !== businessTokenA, 'Staff token is distinct from business token.');

    // URL formatting
    const { feedUrl, webcalUrl } = buildFeedUrls(businessTokenA, 'https://bookinggo.app');
    assert(feedUrl === `https://bookinggo.app/api/calendar/feed/${businessTokenA}.ics`, 'Generates valid HTTPS .ics feed URL.');
    assert(webcalUrl === `webcal://bookinggo.app/api/calendar/feed/${businessTokenA}.ics`, 'Generates valid webcal:// subscription URL.');

    // ------------------------------------------------------------------------
    // PHASE 3: Token Resolution & Routing Security
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 3: Token Resolution & Routing Security ---');

    // Business token resolution
    const resBus = await resolveFeedToken(businessTokenA);
    assert(resBus !== null, 'Business token resolves successfully.');
    assert(resBus?.scope === 'business', 'Resolved scope is "business".');
    assert(resBus?.businessId === String(businessIdA), 'Resolved businessId matches businessIdA.');
    assert(resBus?.businessName === businessAName, 'Resolved businessName matches.');

    // Staff token resolution
    const resStaff = await resolveFeedToken(staffTokenA1);
    assert(resStaff !== null, 'Staff token resolves successfully.');
    assert(resStaff?.scope === 'staff', 'Resolved scope is "staff".');
    assert(resStaff?.staffId === String(staffIdA1), 'Resolved staffId matches staffIdA1.');
    assert(resStaff?.staffName === 'Dr. Gregory House', 'Resolved staffName matches Dr. Gregory House.');
    assert(resStaff?.businessId === String(businessIdA), 'Resolved staff businessId matches.');

    // Resolution with .ics extension appended
    const resWithIcs = await resolveFeedToken(`${businessTokenA}.ics`);
    assert(resWithIcs?.businessId === String(businessIdA), 'Resolves token with .ics suffix cleanly.');

    // Invalid & tampered tokens
    const invalidToken = await resolveFeedToken('invalid_token_1234567890abcdef');
    assert(invalidToken === null, 'Non-existent token resolves to null.');
    const emptyToken = await resolveFeedToken('');
    assert(emptyToken === null, 'Empty token resolves to null.');

    // ------------------------------------------------------------------------
    // PHASE 4: Business-Wide RFC 5545 Feed Generation
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 4: Business-Wide RFC 5545 Feed Generation ---');

    if (!resBus) throw new Error('Business resolution failed.');

    const icsContent = await generateIcsFeed(resBus);

    assert(icsContent.startsWith('BEGIN:VCALENDAR'), 'ICS stream starts with BEGIN:VCALENDAR.');
    assert(icsContent.includes('VERSION:2.0'), 'ICS specifies VERSION:2.0.');
    assert(icsContent.includes('PRODID:-//BookingGo SaaS//Calendar Feed 2.0//EN'), 'ICS includes standard PRODID.');
    assert(icsContent.includes('CALSCALE:GREGORIAN'), 'ICS specifies CALSCALE:GREGORIAN.');
    assert(icsContent.includes('METHOD:PUBLISH'), 'ICS specifies METHOD:PUBLISH.');
    assert(icsContent.includes(`X-WR-CALNAME:${businessAName} - Appointments`), 'ICS header reflects business title.');
    assert(icsContent.includes('REFRESH-INTERVAL;VALUE=DURATION:PT30M'), 'ICS specifies 30m auto-refresh.');

    // Event 1: Robert with House
    assert(icsContent.includes('SUMMARY:General Consultation - Patient Robert'), 'ICS includes event 1 summary.');
    assert(icsContent.includes('STATUS:CONFIRMED'), 'Confirmed appointment emits STATUS:CONFIRMED.');
    assert(icsContent.includes('TRANSP:OPAQUE'), 'Active appointment emits TRANSP:OPAQUE.');
    assert(icsContent.includes('LOCATION:Central Diagnostic Pavilion (742 Evergreen Terrace)'), 'ICS populates full location name and address.');
    assert(icsContent.includes('Dr. Gregory House'), 'Event description mentions assigned doctor.');

    // Event 2: Lisa with Wilson
    assert(icsContent.includes('SUMMARY:Comprehensive Diagnostic - Patient Lisa'), 'ICS includes event 2 summary.');
    assert(icsContent.includes('Dr. James Wilson'), 'Event description mentions Wilson.');

    // Event 3: Cancelled appointment
    assert(icsContent.includes(`UID:appointment_${appointmentIdA3}@bookinggo.saas`), 'ICS includes cancelled appointment UID.');
    assert(icsContent.includes('STATUS:CANCELLED'), 'Cancelled appointment emits STATUS:CANCELLED.');
    assert(icsContent.includes('TRANSP:TRANSPARENT'), 'Cancelled appointment emits TRANSP:TRANSPARENT.');

    // RFC 5545 Line Folding Check
    const lines = icsContent.split('\r\n');
    const over75 = lines.filter((l) => l.length > 75);
    assert(over75.length === 0, 'Zero lines exceed RFC 5545 75-octet folding limit (RFC compliant).');
    assert(icsContent.endsWith('END:VCALENDAR'), 'ICS stream ends cleanly with END:VCALENDAR.');

    // ------------------------------------------------------------------------
    // PHASE 5: Staff-Specific Feed Scoping & Privacy
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 5: Staff-Specific Feed Scoping & Privacy ---');

    if (!resStaff) throw new Error('Staff resolution failed.');

    // Dr. House's personal feed
    const houseIcs = await generateIcsFeed(resStaff);

    assert(houseIcs.includes('X-WR-CALNAME:Dr. Gregory House - ' + businessAName), 'Staff feed has staff-personalized calendar title.');
    assert(houseIcs.includes('General Consultation - Patient Robert'), 'House feed includes Robert (assigned to House).');
    assert(!houseIcs.includes('Patient Lisa'), 'House feed excludes Lisa (assigned to Wilson - Privacy Guard).');
    assert(!houseIcs.includes('Dr. James Wilson'), 'House feed contains no references to other doctors.');

    // Dr. Wilson's personal feed
    const resWilson = await resolveFeedToken(staffTokenA2);
    if (!resWilson) throw new Error('Wilson resolution failed.');
    const wilsonIcs = await generateIcsFeed(resWilson);

    assert(wilsonIcs.includes('Comprehensive Diagnostic - Patient Lisa'), 'Wilson feed includes Lisa (assigned to Wilson).');
    assert(!wilsonIcs.includes('Patient Robert'), 'Wilson feed excludes Robert (assigned to House - Privacy Guard).');

    // ------------------------------------------------------------------------
    // PHASE 6: Multi-Tenant Boundary Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 6: Multi-Tenant Boundary Isolation ---');

    assert(!icsContent.includes('Patient Charlie'), 'Tenant A feed excludes Tenant B customer (Isolation Guard).');
    assert(!icsContent.includes('Orthodontic Exam'), 'Tenant A feed excludes Tenant B service (Isolation Guard).');
    assert(!icsContent.includes('Dr. John Watson'), 'Tenant A feed excludes Tenant B staff (Isolation Guard).');

    const businessTokenB = await ensureBusinessFeedToken(String(businessIdB));
    const resBusB = await resolveFeedToken(businessTokenB);
    if (!resBusB) throw new Error('Tenant B resolution failed.');
    const icsContentB = await generateIcsFeed(resBusB);

    assert(icsContentB.includes('Orthodontic Exam - Patient Charlie'), 'Tenant B feed includes Tenant B appointment.');
    assert(!icsContentB.includes('Patient Robert'), 'Tenant B feed excludes Tenant A customer (Isolation Guard).');
    assert(!icsContentB.includes('Dr. Gregory House'), 'Tenant B feed excludes Tenant A staff.');

    // ------------------------------------------------------------------------
    // PHASE 7: Token Rotation & Instant Revocation
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 7: Token Rotation & Instant Revocation ---');

    // Rotate Business Token
    const newBusinessToken = await rotateBusinessFeedToken(String(businessIdA));
    assert(newBusinessToken !== businessTokenA, 'New business token is different from old token.');
    assert(newBusinessToken.length === 48, 'New business token is valid 48-char hex string.');

    // Verify old token is instantly revoked
    const revokedCheck = await resolveFeedToken(businessTokenA);
    assert(revokedCheck === null, 'Old business token is IMMEDIATELY revoked (resolves to null).');

    // Verify new token works
    const newResBus = await resolveFeedToken(newBusinessToken);
    assert(newResBus !== null, 'New business token resolves successfully.');
    assert(newResBus?.businessId === String(businessIdA), 'New business token maps to correct business.');

    // Rotate Staff Token
    const newStaffTokenA1 = await rotateStaffFeedToken(String(staffIdA1));
    assert(newStaffTokenA1 !== staffTokenA1, 'New staff token is different from old token.');
    const revokedStaffCheck = await resolveFeedToken(staffTokenA1);
    assert(revokedStaffCheck === null, 'Old staff token is IMMEDIATELY revoked.');
    const newResStaff = await resolveFeedToken(newStaffTokenA1);
    assert(newResStaff !== null, 'New staff token resolves successfully.');

    // ------------------------------------------------------------------------
    // PHASE 8: Feed Summary Statistics
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 8: Feed Summary Statistics ---');

    const busSummary = await getCalendarFeedSummary(newResBus!);
    assert(busSummary.scope === 'business', 'Summary reflects business scope.');
    assert(busSummary.totalEvents === 3, 'Summary reports 3 total events for Tenant A.');
    assert(busSummary.entityName === businessAName, 'Summary entity name matches business name.');

    const staffSummary = await getCalendarFeedSummary(newResStaff!);
    assert(staffSummary.scope === 'staff', 'Summary reflects staff scope.');
    assert(staffSummary.totalEvents === 2, 'Summary reports 2 total events for Dr. House.');
    assert(staffSummary.entityName.includes('Dr. Gregory House'), 'Summary entity name includes Dr. Gregory House.');

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP: Delete Test Fixtures
    // ------------------------------------------------------------------------
    console.log('\n--- Cleanup: Deleting Test Fixtures ---');
    await Promise.all([
      User.deleteMany({ _id: { $in: [companyIdA, staffUserIdA1, staffUserIdA2, companyIdB, staffUserIdB] } }),
      Business.deleteMany({ _id: { $in: [businessIdA, businessIdB] } }),
      Location.deleteMany({ _id: { $in: [locationIdA, locationIdB] } }),
      Category.deleteMany({ _id: { $in: [categoryIdA, categoryIdB] } }),
      Service.deleteMany({ _id: { $in: [serviceIdA1, serviceIdA2, serviceIdB] } }),
      Staff.deleteMany({ _id: { $in: [staffIdA1, staffIdA2, staffIdB] } }),
      Customer.deleteMany({ _id: { $in: [customerIdA1, customerIdA2, customerIdB] } }),
      Appointment.deleteMany({ _id: { $in: [appointmentIdA1, appointmentIdA2, appointmentIdA3, appointmentIdB] } }),
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

runCalendarFeedSuite().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Fatal error running suite:', err);
  process.exit(1);
});
