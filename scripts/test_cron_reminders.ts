import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { connectToDatabase } from '../lib/db';
import { Business } from '../models/Business';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Location } from '../models/Location';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';
import {
  parseAppointmentDateTime,
  isAppointmentWithinReminderWindow,
  processAppointmentReminders,
} from '../lib/cron-reminder';
import { GET as reminderRouteHandler } from '../app/api/cron/reminders/route';

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition: unknown, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function run() {
  console.log('=====================================================================');
  console.log('🚀 Running Live Atlas Integration Tests: Automated Cron Reminder Engine');
  console.log('=====================================================================\n');

  // -------------------------------------------------------------
  // Test Phase 1: Unit tests for Date parsing & Window algorithm
  // -------------------------------------------------------------
  console.log('👉 Phase 1: Unit Testing Date Parsing & Window Determination');

  const parsedIso = parseAppointmentDateTime('2026-10-25', '14:30');
  assert(parsedIso !== null, 'Parses standard YYYY-MM-DD format');
  assert(parsedIso?.getFullYear() === 2026, 'Year correctly parsed as 2026');
  assert(parsedIso?.getMonth() === 9, 'Month correctly parsed as October (0-indexed 9)');
  assert(parsedIso?.getDate() === 25, 'Day correctly parsed as 25');
  assert(parsedIso?.getHours() === 14, 'Hour correctly parsed as 14');
  assert(parsedIso?.getMinutes() === 30, 'Minutes correctly parsed as 30');

  const parsedEu = parseAppointmentDateTime('15-11-2026', '09:15');
  assert(parsedEu !== null, 'Parses alternate DD-MM-YYYY format');
  assert(parsedEu?.getDate() === 15, 'European day parsed correctly as 15');
  assert(parsedEu?.getMonth() === 10, 'European month parsed correctly as November (10)');

  const parsedRange = parseAppointmentDateTime('2026-10-25', '10:00 - 11:00');
  assert(parsedRange?.getHours() === 10, 'Extracts start time from time range slot');

  const invalidDate = parseAppointmentDateTime('invalid-date', '10:00');
  assert(invalidDate === null, 'Rejects invalid date string gracefully');

  const invalidTime = parseAppointmentDateTime('2026-10-25', 'bad:time');
  assert(invalidTime === null, 'Rejects non-numeric time string gracefully');

  // Window calculations with synthetic reference date
  const refNow = new Date('2026-10-01T12:00:00');

  // 20 hours ahead (within 24h lookahead)
  const inWindowDate = new Date('2026-10-02T08:00:00');
  assert(
    isAppointmentWithinReminderWindow(
      formatDate(inWindowDate),
      '08:00',
      24,
      refNow
    ) === true,
    'Eligible: Appointment scheduled 20 hours ahead is within 24h lookahead window'
  );

  // 36 hours ahead (beyond 24h lookahead)
  const beyondWindowDate = new Date('2026-10-03T00:00:00');
  assert(
    isAppointmentWithinReminderWindow(
      formatDate(beyondWindowDate),
      '00:00',
      24,
      refNow
    ) === false,
    'Ineligible: Appointment scheduled 36 hours ahead is outside 24h lookahead window'
  );

  // In the past (2 hours ago)
  const pastDate = new Date('2026-10-01T10:00:00');
  assert(
    isAppointmentWithinReminderWindow(
      formatDate(pastDate),
      '10:00',
      24,
      refNow
    ) === false,
    'Ineligible: Past appointment is rejected from reminder window'
  );

  // -------------------------------------------------------------
  // Test Phase 2: Live Atlas Fixture Setup
  // -------------------------------------------------------------
  console.log('\n👉 Phase 2: Provisioning Test Fixtures in MongoDB Atlas');
  await connectToDatabase();

  const testSuffix = `cron_${Date.now()}`;
  const companyUser = await User.create({
    name: 'Cron Test Owner',
    email: `cron_owner_${testSuffix}@example.com`,
    password: 'Password123!',
    role: 'company',
  });

  const business = await Business.create({
    companyId: companyUser._id,
    name: 'Metropolitan Wellness Clinic',
    slug: `wellness-${testSuffix}`,
    currency: 'USD',
    currencySymbol: '$',
    themeColor: '#059669',
    appointmentReminderHours: 24,
  });

  const location = await Location.create({
    companyId: companyUser._id,
    businessId: business._id,
    name: 'Downtown Medical Pavilion',
    address: '500 5th Avenue, Suite 300',
    phone: '212-555-0188',
  });

  const testCategoryId = new mongoose.Types.ObjectId();

  const service = await Service.create({
    companyId: companyUser._id,
    businessId: business._id,
    categoryId: testCategoryId,
    name: 'Acupuncture & Holistic Therapy',
    durationMinutes: 45,
    price: 120,
    isActive: true,
  });

  const staffUser = await User.create({
    name: 'Dr. Elena Rostova',
    email: `elena_${testSuffix}@wellness.com`,
    password: 'Password123!',
    role: 'staff',
  });

  const staff = await Staff.create({
    companyId: companyUser._id,
    businessId: business._id,
    userId: staffUser._id,
    name: 'Dr. Elena Rostova',
    locationIds: [location._id],
    serviceIds: [service._id],
    colorCode: '#059669',
    isActive: true,
  });

  // Calculate real dates relative to today
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 20 * 60 * 60 * 1000); // 20 hours ahead (within 24h window)
  const fiveDaysLater = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days ahead
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

  const tomorrowStr = formatDate(tomorrow);
  const fiveDaysLaterStr = formatDate(fiveDaysLater);
  const twoDaysAgoStr = formatDate(twoDaysAgo);
  const reminderTime = '11:00';

  // Appointment 1: In-window, confirmed, unsent -> MUST BE REMINDED
  const appInWindow = await Appointment.create({
    appointmentNumber: `APP-${testSuffix}-001`,
    companyId: companyUser._id,
    businessId: business._id,
    serviceId: service._id,
    staffId: staff._id,
    locationId: location._id,
    name: 'Sarah Connor',
    email: `sarah_${testSuffix}@example.com`,
    contact: '555-0101',
    customerType: 'guest-user',
    date: tomorrowStr,
    time: reminderTime,
    durationMinutes: 45,
    price: 120,
    appointmentStatus: 'Confirmed',
    statusColor: '#21c9b0',
    isReminderSent: false,
  });

  // Appointment 2: Distant future (5 days) -> MUST BE SKIPPED
  const appDistant = await Appointment.create({
    appointmentNumber: `APP-${testSuffix}-002`,
    companyId: companyUser._id,
    businessId: business._id,
    serviceId: service._id,
    staffId: staff._id,
    locationId: location._id,
    name: 'Kyle Reese',
    email: `kyle_${testSuffix}@example.com`,
    contact: '555-0102',
    customerType: 'guest-user',
    date: fiveDaysLaterStr,
    time: reminderTime,
    durationMinutes: 45,
    price: 120,
    appointmentStatus: 'Confirmed',
    statusColor: '#21c9b0',
    isReminderSent: false,
  });

  // Appointment 3: Past appointment -> MUST BE SKIPPED
  const appPast = await Appointment.create({
    appointmentNumber: `APP-${testSuffix}-003`,
    companyId: companyUser._id,
    businessId: business._id,
    serviceId: service._id,
    staffId: staff._id,
    locationId: location._id,
    name: 'John Connor',
    email: `john_${testSuffix}@example.com`,
    contact: '555-0103',
    customerType: 'guest-user',
    date: twoDaysAgoStr,
    time: reminderTime,
    durationMinutes: 45,
    price: 120,
    appointmentStatus: 'Confirmed',
    statusColor: '#21c9b0',
    isReminderSent: false,
  });

  // Appointment 4: In-window but Cancelled -> MUST BE SKIPPED
  const appCancelled = await Appointment.create({
    appointmentNumber: `APP-${testSuffix}-004`,
    companyId: companyUser._id,
    businessId: business._id,
    serviceId: service._id,
    staffId: staff._id,
    locationId: location._id,
    name: 'Miles Dyson',
    email: `miles_${testSuffix}@example.com`,
    contact: '555-0104',
    customerType: 'guest-user',
    date: tomorrowStr,
    time: reminderTime,
    durationMinutes: 45,
    price: 120,
    appointmentStatus: 'Cancelled',
    statusColor: '#f04c43',
    isReminderSent: false,
  });

  // Appointment 5: In-window but Already Sent -> MUST BE SKIPPED
  const appAlreadySent = await Appointment.create({
    appointmentNumber: `APP-${testSuffix}-005`,
    companyId: companyUser._id,
    businessId: business._id,
    serviceId: service._id,
    staffId: staff._id,
    locationId: location._id,
    name: 'Kate Brewster',
    email: `kate_${testSuffix}@example.com`,
    contact: '555-0105',
    customerType: 'guest-user',
    date: tomorrowStr,
    time: reminderTime,
    durationMinutes: 45,
    price: 120,
    appointmentStatus: 'Confirmed',
    statusColor: '#21c9b0',
    isReminderSent: true,
    reminderSentAt: new Date(Date.now() - 3600000),
  });

  try {
    // -------------------------------------------------------------
    // Test Phase 3: Dry-Run Execution
    // -------------------------------------------------------------
    console.log('\n👉 Phase 3: Testing Dry-Run Execution (Preview Without Mutation)');
    const dryRunResult = await processAppointmentReminders({
      businessId: business._id.toString(),
      dryRun: true,
      lookaheadHours: 24,
    });

    assert(dryRunResult.success === true, 'Dry-run executed successfully');
    assert(dryRunResult.dryRun === true, 'Dry-run flag confirmed in result');
    assert(dryRunResult.matched === 1, `Matched exactly 1 eligible appointment (got ${dryRunResult.matched})`);
    assert(dryRunResult.dispatched === 0, 'Dispatched count is 0 in dry-run mode');
    assert(
      dryRunResult.results[0]?.appointmentNumber === appInWindow.appointmentNumber,
      'Identified target appointment as eligible for reminder'
    );

    // Verify record in Atlas was NOT mutated
    const unmutatedApp = await Appointment.findById(appInWindow._id).lean();
    assert(unmutatedApp?.isReminderSent === false, 'Atlas record isReminderSent remains false in dry-run');

    // -------------------------------------------------------------
    // Test Phase 4: Live Execution with Real Email Template Dispatch
    // -------------------------------------------------------------
    console.log('\n👉 Phase 4: Testing Live Dispatch & Atlas Status Mutation');
    const liveResult = await processAppointmentReminders({
      businessId: business._id.toString(),
      dryRun: false,
      lookaheadHours: 24,
    });

    assert(liveResult.success === true, 'Live reminder process executed successfully');
    assert(liveResult.dryRun === false, 'Live execution mode confirmed');
    assert(liveResult.matched === 1, 'Matched exactly 1 appointment');
    assert(liveResult.dispatched === 1, 'Dispatched exactly 1 reminder notification');
    assert(liveResult.failed === 0, 'Zero failed dispatches');
    assert(
      liveResult.results[0]?.appointmentNumber === appInWindow.appointmentNumber,
      'Dispatched reminder for correct target appointment'
    );

    // Verify Atlas mutation
    const mutatedApp = await Appointment.findById(appInWindow._id).lean();
    assert(mutatedApp?.isReminderSent === true, 'Atlas record isReminderSent mutated to true');
    assert(Boolean(mutatedApp?.reminderSentAt), 'Atlas record persisted reminderSentAt timestamp');

    // Verify non-target appointments were unaffected
    const checkDistant = await Appointment.findById(appDistant._id).lean();
    assert(checkDistant?.isReminderSent === false, 'Distant appointment remained isReminderSent: false');

    const checkPast = await Appointment.findById(appPast._id).lean();
    assert(checkPast?.isReminderSent === false, 'Past appointment remained isReminderSent: false');

    const checkCancelled = await Appointment.findById(appCancelled._id).lean();
    assert(checkCancelled?.isReminderSent === false, 'Cancelled appointment remained isReminderSent: false');

    const checkAlreadySent = await Appointment.findById(appAlreadySent._id).lean();
    assert(checkAlreadySent?.isReminderSent === true, 'Pre-sent appointment kept original status');

    // -------------------------------------------------------------
    // Test Phase 5: Idempotency & Deduplication Guard
    // -------------------------------------------------------------
    console.log('\n👉 Phase 5: Testing Idempotency & Duplicate Prevention');
    const duplicateRunResult = await processAppointmentReminders({
      businessId: business._id.toString(),
      dryRun: false,
      lookaheadHours: 24,
    });

    assert(duplicateRunResult.success === true, 'Second consecutive run executed cleanly');
    assert(duplicateRunResult.matched === 0, 'Matched 0 appointments (idempotency confirmed)');
    assert(duplicateRunResult.dispatched === 0, 'Dispatched 0 reminders on second pass');

    // -------------------------------------------------------------
    // Test Phase 6: HTTP Route Handler & CRON_SECRET Security
    // -------------------------------------------------------------
    console.log('\n👉 Phase 6: Testing HTTP Route Handler & CRON_SECRET Bearer Security');

    const originalCronSecret = process.env.CRON_SECRET;
    const testSecret = 'sec_test_cron_token_999';
    process.env.CRON_SECRET = testSecret;

    try {
      // 6a. Missing authorization header -> 401 Unauthorized
      const unauthorizedReq = new NextRequest('http://localhost:3000/api/cron/reminders');
      const unauthResponse = await reminderRouteHandler(unauthorizedReq);
      assert(unauthResponse.status === 401, 'Rejects request with missing Authorization header (401)');
      const unauthJson = await unauthResponse.json();
      assert(unauthJson.success === false, 'Returns success: false for unauthorized request');

      // 6b. Invalid authorization token -> 401 Unauthorized
      const invalidTokenReq = new NextRequest('http://localhost:3000/api/cron/reminders', {
        headers: {
          authorization: 'Bearer wrong_secret_token',
        },
      });
      const invalidTokenResponse = await reminderRouteHandler(invalidTokenReq);
      assert(invalidTokenResponse.status === 401, 'Rejects request with invalid Bearer token (401)');

      // 6c. Valid authorization token -> 200 OK
      const authorizedReq = new NextRequest(
        `http://localhost:3000/api/cron/reminders?businessId=${business._id}&dryRun=true`,
        {
          headers: {
            authorization: `Bearer ${testSecret}`,
          },
        }
      );
      const authResponse = await reminderRouteHandler(authorizedReq);
      assert(authResponse.status === 200, 'Accepts request with valid Bearer token (200)');
      const authJson = await authResponse.json();
      assert(authJson.success === true, 'Route returns success: true for authorized request');
      assert(authJson.dryRun === true, 'Route query param dryRun=true recognized');
    } finally {
      process.env.CRON_SECRET = originalCronSecret;
    }

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n=====================================================================');
    console.log(`🎉 All Cron Reminder Tests Passed: ${passedAssertions}/${totalAssertions} Assertions!`);
    console.log('=====================================================================\n');
  } finally {
    // Clean up test documents
    await Appointment.deleteMany({ businessId: business._id });
    await Staff.deleteMany({ businessId: business._id });
    await Service.deleteMany({ businessId: business._id });
    await Location.deleteMany({ businessId: business._id });
    await Business.findByIdAndDelete(business._id);
    await User.findByIdAndDelete(companyUser._id);
    await User.findByIdAndDelete(staffUser._id);

    // Grace period for background email dispatch
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await mongoose.disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
