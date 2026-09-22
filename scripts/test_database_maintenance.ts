import mongoose, { Types } from 'mongoose';
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
import { LoginDetail } from '../models/LoginDetail';
import { WebhookEvent } from '../models/WebhookEvent';
import { Notification } from '../models/Notification';
import {
  getDatabaseHealth,
  auditOrphanedRecords,
  vacuumDatabase,
} from '../lib/database-maintenance-engine';

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

async function runMaintenanceSuite() {
  console.log('\n===============================================================');
  console.log(' Priority 30 [BGO-248]: Database Health & Vacuum Engine Test');
  console.log('===============================================================\n');

  await connectToDatabase();

  const testSuffix = Date.now().toString().slice(-6);

  // Valid Tenant Fixture IDs
  const validCompanyId = new Types.ObjectId();
  const validBusinessId = new Types.ObjectId();
  const validLocationId = new Types.ObjectId();
  const validCategoryId = new Types.ObjectId();
  const validServiceId = new Types.ObjectId();
  const validStaffUserId = new Types.ObjectId();
  const validStaffId = new Types.ObjectId();
  const validCustomerId = new Types.ObjectId();
  const validAppointmentId = new Types.ObjectId();
  const validPaymentId = new Types.ObjectId();

  // Deliberate Orphan Fixture IDs
  const orphanBusinessId = new Types.ObjectId(); // Does NOT exist in Business collection
  const orphanAppointmentId = new Types.ObjectId();
  const orphanPaymentId = new Types.ObjectId();
  const orphanStaffId = new Types.ObjectId();
  const orphanServiceId = new Types.ObjectId();
  const orphanCustomerId = new Types.ObjectId();

  // Stale Log / Event Fixture IDs
  const staleLoginId = new Types.ObjectId();
  const freshLoginId = new Types.ObjectId();
  const staleWebhookId = new Types.ObjectId();
  const freshWebhookId = new Types.ObjectId();
  const pendingWebhookId = new Types.ObjectId();
  const staleNotificationId = new Types.ObjectId();
  const freshNotificationId = new Types.ObjectId();

  try {
    console.log('--- Setting up Atlas Fixtures ---');

    // 1. Valid Tenant records
    await User.create({
      _id: validCompanyId,
      name: `Valid Company ${testSuffix}`,
      email: `valid_company_${testSuffix}@atlas.test`,
      role: 'company',
    });

    await Business.create({
      _id: validBusinessId,
      companyId: validCompanyId,
      name: `Valid Health Clinic ${testSuffix}`,
      slug: `valid-health-${testSuffix}`,
    });

    await Location.create({
      _id: validLocationId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      name: `Downtown Center ${testSuffix}`,
      address: '100 Medical Blvd',
      phone: '+15551234',
    });

    await Category.create({
      _id: validCategoryId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      name: `Consultations ${testSuffix}`,
    });

    await Service.create({
      _id: validServiceId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      categoryId: validCategoryId,
      name: `Primary Checkup ${testSuffix}`,
      price: 150,
      durationMinutes: 45,
    });

    await User.create({
      _id: validStaffUserId,
      name: `Valid Doctor ${testSuffix}`,
      email: `valid_doctor_${testSuffix}@atlas.test`,
      role: 'staff',
      companyId: validCompanyId,
    });

    await Staff.create({
      _id: validStaffId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      userId: validStaffUserId,
      name: `Valid Doctor ${testSuffix}`,
      locationIds: [validLocationId],
      serviceIds: [validServiceId],
    });

    await Customer.create({
      _id: validCustomerId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      name: `Valid Patient ${testSuffix}`,
      email: `valid_patient_${testSuffix}@atlas.test`,
      contact: '+15559876',
    });

    await Appointment.create({
      _id: validAppointmentId,
      appointmentNumber: `APT-V-${testSuffix}`,
      companyId: validCompanyId,
      businessId: validBusinessId,
      locationId: validLocationId,
      serviceId: validServiceId,
      staffId: validStaffId,
      customerId: validCustomerId,
      customerType: 'existing-user',
      name: `Valid Patient ${testSuffix}`,
      email: `valid_patient_${testSuffix}@atlas.test`,
      contact: '+15559876',
      date: '2026-10-15',
      time: '14:00',
      durationMinutes: 45,
      price: 150,
      paymentType: 'Card',
      paymentStatus: 'paid',
      appointmentStatus: 'Confirmed',
      statusColor: '#21c9b0',
    });

    await AppointmentPayment.create({
      _id: validPaymentId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      appointmentId: validAppointmentId,
      paymentType: 'Card',
      amount: 150,
      discountAmount: 0,
      finalAmount: 150,
      paymentDate: new Date(),
      txnId: `txn_v_${testSuffix}`,
      status: 'completed',
    });

    // 2. Deliberately provision orphaned records
    // Orphan Appointment: points to non-existent orphanBusinessId
    await Appointment.create({
      _id: orphanAppointmentId,
      appointmentNumber: `APT-ORPHAN-${testSuffix}`,
      companyId: validCompanyId,
      businessId: orphanBusinessId, // Dangling!
      locationId: validLocationId,
      serviceId: validServiceId,
      staffId: validStaffId,
      customerType: 'guest-user',
      name: 'Orphan Patient',
      email: 'orphan_patient@test.local',
      contact: '+15550000',
      date: '2026-11-01',
      time: '09:00',
      durationMinutes: 30,
      price: 50,
      paymentType: 'Pending',
      paymentStatus: 'unpaid',
      appointmentStatus: 'Pending',
      statusColor: '#fa9c30',
    });

    // Orphan Payment: points to non-existent appointmentId
    await AppointmentPayment.create({
      _id: orphanPaymentId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      appointmentId: new Types.ObjectId(), // Dangling appointment ID!
      paymentType: 'Stripe',
      amount: 75,
      discountAmount: 0,
      finalAmount: 75,
      paymentDate: new Date(),
      txnId: `txn_orphan_${testSuffix}`,
      status: 'completed',
    });

    // Orphan Staff: points to non-existent userId
    await Staff.create({
      _id: orphanStaffId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      userId: new Types.ObjectId(), // Dangling user ID!
      name: 'Orphan Staff Member',
      locationIds: [],
      serviceIds: [],
    });

    // Orphan Service: points to non-existent categoryId
    await Service.create({
      _id: orphanServiceId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      categoryId: new Types.ObjectId(), // Dangling category ID!
      name: `Orphan Service ${testSuffix}`,
      price: 99,
      durationMinutes: 30,
    });

    // Orphan Customer: points to non-existent businessId
    await Customer.create({
      _id: orphanCustomerId,
      companyId: validCompanyId,
      businessId: orphanBusinessId, // Dangling!
      name: 'Orphan Customer',
      email: `orphan_cust_${testSuffix}@test.local`,
      contact: '+15551111',
    });

    // 3. Deliberately provision stale logs & webhooks
    const ninetyFiveDaysAgo = new Date(Date.now() - 95 * 86400000);
    const sixtyFiveDaysAgo = new Date(Date.now() - 65 * 86400000);
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 86400000);

    // Stale LoginDetail (95 days old)
    await LoginDetail.collection.insertOne({
      _id: staleLoginId,
      userId: validCompanyId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      role: 'company',
      ip: '127.0.0.1',
      browser: 'Chrome',
      os: 'macOS',
      deviceType: 'desktop',
      status: 'success',
      loginAt: ninetyFiveDaysAgo,
      createdAt: ninetyFiveDaysAgo,
      updatedAt: ninetyFiveDaysAgo,
    });

    // Fresh LoginDetail (1 day old)
    await LoginDetail.collection.insertOne({
      _id: freshLoginId,
      userId: validCompanyId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      role: 'company',
      ip: '127.0.0.1',
      browser: 'Chrome',
      os: 'macOS',
      deviceType: 'desktop',
      status: 'success',
      loginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Stale processed WebhookEvent (65 days old)
    await WebhookEvent.collection.insertOne({
      _id: staleWebhookId,
      eventId: `evt_stale_${testSuffix}`,
      provider: 'stripe',
      eventType: 'payment_intent.succeeded',
      status: 'processed',
      createdAt: sixtyFiveDaysAgo,
      updatedAt: sixtyFiveDaysAgo,
    });

    // Fresh processed WebhookEvent (5 days old)
    await WebhookEvent.collection.insertOne({
      _id: freshWebhookId,
      eventId: `evt_fresh_${testSuffix}`,
      provider: 'stripe',
      eventType: 'payment_intent.succeeded',
      status: 'processed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Old processing WebhookEvent (should NOT be purged because status !== 'processed' && status !== 'ignored')
    await WebhookEvent.collection.insertOne({
      _id: pendingWebhookId,
      eventId: `evt_pending_${testSuffix}`,
      provider: 'paypal',
      eventType: 'CHECKOUT.ORDER.APPROVED',
      status: 'processing',
      createdAt: sixtyFiveDaysAgo,
      updatedAt: sixtyFiveDaysAgo,
    });

    // Stale read Notification (35 days old, isRead: true)
    await Notification.collection.insertOne({
      _id: staleNotificationId,
      recipientId: validCompanyId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      type: 'appointment_created',
      title: 'Old Notification',
      message: 'Old notice message',
      isRead: true,
      createdAt: thirtyFiveDaysAgo,
      updatedAt: thirtyFiveDaysAgo,
    });

    // Fresh read Notification (1 day old, isRead: true - should NOT be purged)
    await Notification.collection.insertOne({
      _id: freshNotificationId,
      recipientId: validCompanyId,
      companyId: validCompanyId,
      businessId: validBusinessId,
      type: 'appointment_created',
      title: 'Fresh Notification',
      message: 'Fresh notice message',
      isRead: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Fixtures provisioned successfully.\n');

    // -------------------------------------------------------------------------
    // Test Section 1: Database Health Diagnostic & Latency Ping
    // -------------------------------------------------------------------------
    console.log('--- Test Section 1: Database Health Diagnostic & Latency Ping ---');
    const health = await getDatabaseHealth();

    assert(health.status === 'healthy' || health.status === 'degraded', `Database health status reported: ${health.status}`);
    assert(typeof health.pingMs === 'number' && health.pingMs >= 0, `Database ping latency measured: ${health.pingMs}ms`);
    assert(Boolean(health.databaseName && health.databaseName.length > 0), `Database name identified: ${health.databaseName}`);
    assert(Array.isArray(health.collections) && health.collections.length >= 20, `Scanned ${health.collections.length} collections`);

    const userCollStat = health.collections.find((c) => c.name === 'User');
    assert(Boolean(userCollStat && userCollStat.documentCount > 0), `User collection reported ${userCollStat?.documentCount} documents`);

    const apptCollStat = health.collections.find((c) => c.name === 'Appointment');
    assert(Boolean(apptCollStat && apptCollStat.documentCount > 0), `Appointment collection reported ${apptCollStat?.documentCount} documents`);

    assert(Array.isArray(health.indexes) && health.indexes.length >= 4, `Inspected indexes across ${health.indexes.length} critical collections`);

    const apptIndexStat = health.indexes.find((i) => i.collection === 'appointments');
    assert(Boolean(apptIndexStat && apptIndexStat.indexCount >= 1), `Appointment indexes detected: ${apptIndexStat?.indexCount}`);

    // -------------------------------------------------------------------------
    // Test Section 2: Deep Relational Integrity & Orphan Scanner
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 2: Deep Relational Integrity & Orphan Scanner ---');
    const orphanReport = await auditOrphanedRecords();

    assert(orphanReport.totalOrphans >= 5, `Audit accurately detected ${orphanReport.totalOrphans} orphaned records (expected >= 5)`);

    const hasOrphanAppt = orphanReport.breakdown.some((b) => b.entity === 'Appointment');
    assert(hasOrphanAppt, 'Audit identified orphaned Appointments');

    const hasOrphanPayment = orphanReport.breakdown.some((b) => b.entity === 'AppointmentPayment');
    assert(hasOrphanPayment, 'Audit identified orphaned AppointmentPayments');

    const hasOrphanStaff = orphanReport.breakdown.some((b) => b.entity === 'Staff');
    assert(hasOrphanStaff, 'Audit identified orphaned Staff users');

    const hasOrphanService = orphanReport.breakdown.some((b) => b.entity === 'Service');
    assert(hasOrphanService, 'Audit identified orphaned Services');

    const hasOrphanCustomer = orphanReport.breakdown.some((b) => b.entity === 'Customer');
    assert(hasOrphanCustomer, 'Audit identified orphaned Customers');

    // Scoped audit for the valid business should find 0 business-level orphans
    const scopedReport = await auditOrphanedRecords(String(validBusinessId));
    const validBizApptOrphans = scopedReport.breakdown.find((b) => b.entity === 'Appointment');
    assert(!validBizApptOrphans || validBizApptOrphans.count === 0, 'Zero orphaned Appointments under valid business');

    // -------------------------------------------------------------------------
    // Test Section 3: Database Vacuum Dry-Run Invariant (Zero Mutations)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 3: Database Vacuum Dry-Run Safety Invariant ---');
    const dryRunResult = await vacuumDatabase({ dryRun: true, scope: 'all' });

    assert(dryRunResult.dryRun === true, 'dryRun flag returned true');
    assert(dryRunResult.scanned >= 5, `Scanned ${dryRunResult.scanned} records during dry-run`);
    assert(dryRunResult.purged >= 5, `Projected purge of ${dryRunResult.purged} records`);
    assert(dryRunResult.errors.length === 0, 'Zero errors during dry-run vacuum');

    // Verify Atlas still holds all orphan documents (ZERO mutations)
    const checkOrphanAppt = await Appointment.findById(orphanAppointmentId);
    assert(Boolean(checkOrphanAppt), 'Orphan Appointment remains in Atlas after dry-run');

    const checkOrphanPayment = await AppointmentPayment.findById(orphanPaymentId);
    assert(Boolean(checkOrphanPayment), 'Orphan Payment remains in Atlas after dry-run');

    const checkOrphanStaff = await Staff.findById(orphanStaffId);
    assert(Boolean(checkOrphanStaff), 'Orphan Staff remains in Atlas after dry-run');

    const checkStaleLogin = await LoginDetail.findById(staleLoginId);
    assert(Boolean(checkStaleLogin), 'Stale Login remains in Atlas after dry-run');

    const checkStaleWebhook = await WebhookEvent.findById(staleWebhookId);
    assert(Boolean(checkStaleWebhook), 'Stale Webhook remains in Atlas after dry-run');

    const checkStaleNotice = await Notification.findById(staleNotificationId);
    assert(Boolean(checkStaleNotice), 'Stale Notification remains in Atlas after dry-run');

    // -------------------------------------------------------------------------
    // Test Section 4: Live Vacuum Execution & Topological Orphan Purging
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 4: Live Vacuum Execution & Topological Orphan Purging ---');
    const liveOrphanResult = await vacuumDatabase({ dryRun: false, scope: 'orphans' });

    assert(liveOrphanResult.dryRun === false, 'Live execution mode confirmed');
    assert(liveOrphanResult.purged >= 5, `Successfully purged ${liveOrphanResult.purged} orphaned records`);
    assert(liveOrphanResult.errors.length === 0, 'Zero errors during live orphan vacuum');

    // Verify orphaned records have been purged from Atlas
    const postOrphanAppt = await Appointment.findById(orphanAppointmentId);
    assert(postOrphanAppt === null, 'Orphan Appointment purged from Atlas');

    const postOrphanPayment = await AppointmentPayment.findById(orphanPaymentId);
    assert(postOrphanPayment === null, 'Orphan Payment purged from Atlas');

    const postOrphanStaff = await Staff.findById(orphanStaffId);
    assert(postOrphanStaff === null, 'Orphan Staff purged from Atlas');

    const postOrphanService = await Service.findById(orphanServiceId);
    assert(postOrphanService === null, 'Orphan Service purged from Atlas');

    const postOrphanCustomer = await Customer.findById(orphanCustomerId);
    assert(postOrphanCustomer === null, 'Orphan Customer purged from Atlas');

    // -------------------------------------------------------------------------
    // Test Section 5: Invariant Preservation of Valid Tenant Records
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 5: Invariant Preservation of Valid Tenant Records ---');
    const validAppt = await Appointment.findById(validAppointmentId);
    assert(Boolean(validAppt), 'Valid Appointment 100% preserved');
    assert(validAppt?.appointmentNumber === `APT-V-${testSuffix}`, 'Valid appointment number intact');

    const validPayment = await AppointmentPayment.findById(validPaymentId);
    assert(Boolean(validPayment), 'Valid Payment 100% preserved');

    const validStaff = await Staff.findById(validStaffId);
    assert(Boolean(validStaff), 'Valid Staff record 100% preserved');

    const validService = await Service.findById(validServiceId);
    assert(Boolean(validService), 'Valid Service 100% preserved');

    const validCustomer = await Customer.findById(validCustomerId);
    assert(Boolean(validCustomer), 'Valid Customer 100% preserved');

    // -------------------------------------------------------------------------
    // Test Section 6: Stale Audit Logs, Webhooks & Notifications Pruning
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 6: Stale Audit Logs, Webhooks & Notifications Pruning ---');
    const livePruneResult = await vacuumDatabase({
      dryRun: false,
      scope: 'all',
      retention: {
        loginLogsDays: 90,
        webhooksDays: 60,
        notificationsDays: 30,
      },
    });

    assert(livePruneResult.dryRun === false, 'Live log pruning executed');
    assert(livePruneResult.breakdown.staleLoginDetails >= 1, `Purged ${livePruneResult.breakdown.staleLoginDetails} stale login logs`);
    assert(livePruneResult.breakdown.staleWebhookEvents >= 1, `Purged ${livePruneResult.breakdown.staleWebhookEvents} stale webhook events`);
    assert(livePruneResult.breakdown.staleReadNotifications >= 1, `Purged ${livePruneResult.breakdown.staleReadNotifications} stale notifications`);

    // Verify stale records deleted
    const postStaleLogin = await LoginDetail.findById(staleLoginId);
    assert(postStaleLogin === null, '95-day-old LoginDetail purged');

    const postStaleWebhook = await WebhookEvent.findById(staleWebhookId);
    assert(postStaleWebhook === null, '65-day-old processed WebhookEvent purged');

    const postStaleNotice = await Notification.findById(staleNotificationId);
    assert(postStaleNotice === null, '35-day-old read Notification purged');

    // Verify fresh and active records preserved
    const postFreshLogin = await LoginDetail.findById(freshLoginId);
    assert(Boolean(postFreshLogin), 'Fresh LoginDetail preserved');

    const postFreshWebhook = await WebhookEvent.findById(freshWebhookId);
    assert(Boolean(postFreshWebhook), 'Fresh processed WebhookEvent preserved');

    const postPendingWebhook = await WebhookEvent.findById(pendingWebhookId);
    assert(Boolean(postPendingWebhook), 'Old processing WebhookEvent preserved (not processed/ignored)');

    const postFreshNotice = await Notification.findById(freshNotificationId);
    assert(Boolean(postFreshNotice), 'Fresh read Notification preserved');

  } catch (error) {
    console.error('Fatal error during test execution:', error);
    failed++;
  } finally {
    console.log('\n--- Cleaning up Test Fixtures from Atlas ---');
    await Promise.allSettled([
      User.deleteMany({ _id: { $in: [validCompanyId, validStaffUserId] } }),
      Business.deleteOne({ _id: validBusinessId }),
      Location.deleteOne({ _id: validLocationId }),
      Category.deleteOne({ _id: validCategoryId }),
      Service.deleteMany({ _id: { $in: [validServiceId, orphanServiceId] } }),
      Staff.deleteMany({ _id: { $in: [validStaffId, orphanStaffId] } }),
      Customer.deleteMany({ _id: { $in: [validCustomerId, orphanCustomerId] } }),
      Appointment.deleteMany({ _id: { $in: [validAppointmentId, orphanAppointmentId] } }),
      AppointmentPayment.deleteMany({ _id: { $in: [validPaymentId, orphanPaymentId] } }),
      LoginDetail.deleteMany({ _id: { $in: [staleLoginId, freshLoginId] } }),
      WebhookEvent.deleteMany({ _id: { $in: [staleWebhookId, freshWebhookId, pendingWebhookId] } }),
      Notification.deleteMany({ _id: { $in: [staleNotificationId, freshNotificationId] } }),
    ]);
    console.log('Atlas cleanup finished.');
  }

  console.log('\n===============================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    await mongoose.disconnect();
    process.exit(1);
  }

  await mongoose.disconnect();
  process.exit(0);
}

runMaintenanceSuite().catch(async (err) => {
  console.error('Unhandled error in test suite:', err);
  await mongoose.disconnect();
  process.exit(1);
});
