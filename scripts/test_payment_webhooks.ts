import { Types } from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { User } from '../models/User';
import { Plan } from '../models/Plan';
import { Order } from '../models/Order';
import { Coupon } from '../models/Coupon';
import { UserCoupon } from '../models/UserCoupon';
import { Business } from '../models/Business';
import { Location } from '../models/Location';
import { Category } from '../models/Category';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Customer } from '../models/Customer';
import { Appointment } from '../models/Appointment';
import { AppointmentPayment } from '../models/AppointmentPayment';
import { Notification } from '../models/Notification';
import { WebhookEvent } from '../models/WebhookEvent';
import {
  acquireWebhookLock,
  markWebhookSuccess,
  markWebhookFailed,
  markWebhookIgnored,
} from '../lib/payment-idempotency';
import {
  processSubscriptionCheckout,
  processRecurringRenewalInvoice,
  processSubscriptionCancelled,
  processPaymentFailed,
  enforcePlanExpirations,
} from '../lib/subscription-renewal-engine';
import {
  verifyPayPalWebhookSignature,
  processPayPalWebhookEvent,
} from '../lib/paypal-webhook-engine';

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

async function runPaymentWebhookSuite() {
  console.log('\n===============================================================');
  console.log(' Priority 27 [BGO-245]: Payment Webhooks, Auto-Renewal & Idempotency Test');
  console.log('===============================================================\n');

  await connectToDatabase();

  const testSuffix = Date.now().toString().slice(-6);

  // Fixture IDs
  const adminId = new Types.ObjectId();
  const tenantUserAId = new Types.ObjectId();
  const tenantUserBId = new Types.ObjectId();
  const freePlanId = new Types.ObjectId();
  const paidPlanMonthlyId = new Types.ObjectId();
  const paidPlanYearlyId = new Types.ObjectId();
  const couponId = new Types.ObjectId();

  const businessIdA = new Types.ObjectId();
  const locationIdA = new Types.ObjectId();
  const categoryIdA = new Types.ObjectId();
  const serviceIdA = new Types.ObjectId();
  const staffUserIdA = new Types.ObjectId();
  const staffIdA = new Types.ObjectId();
  const customerIdA = new Types.ObjectId();
  const appointmentIdA = new Types.ObjectId();

  try {
    // -------------------------------------------------------------
    // SETUP FIXTURES
    // -------------------------------------------------------------
    console.log('--- Setting up Atlas Fixtures ---');

    // Super Admin
    await User.create({
      _id: adminId,
      name: `Admin ${testSuffix}`,
      email: `admin_${testSuffix}@example.com`,
      role: 'super admin',
      lang: 'en',
    });

    // Free Plan
    await Plan.create({
      _id: freePlanId,
      name: `Free Starter ${testSuffix}`,
      packagePriceMonthly: 0,
      packagePriceYearly: 0,
      isFreePlan: true,
      isEnabled: true,
      maxBusinesses: 1,
      maxUsers: 2,
      maxLocations: 2,
      maxServices: 5,
      storageLimitMb: 100,
      modules: ['calendar'],
      isCustomPlan: false,
      hasTrial: false,
      trialDays: 0,
    });

    // Paid Plan Monthly
    await Plan.create({
      _id: paidPlanMonthlyId,
      name: `Pro Monthly ${testSuffix}`,
      packagePriceMonthly: 29,
      packagePriceYearly: 290,
      isFreePlan: false,
      isEnabled: true,
      maxBusinesses: 5,
      maxUsers: 10,
      maxLocations: 5,
      maxServices: 20,
      storageLimitMb: 1000,
      modules: ['calendar', 'coupons'],
      isCustomPlan: false,
      hasTrial: false,
      trialDays: 0,
    });

    // Paid Plan Yearly
    await Plan.create({
      _id: paidPlanYearlyId,
      name: `Pro Yearly ${testSuffix}`,
      packagePriceMonthly: 29,
      packagePriceYearly: 290,
      isFreePlan: false,
      isEnabled: true,
      maxBusinesses: 10,
      maxUsers: 20,
      maxLocations: 10,
      maxServices: 50,
      storageLimitMb: 5000,
      modules: ['calendar', 'coupons'],
      isCustomPlan: false,
      hasTrial: false,
      trialDays: 0,
    });

    // Coupon
    await Coupon.create({
      _id: couponId,
      name: `SAVE10_${testSuffix}`,
      code: `SAVE10_${testSuffix}`,
      discountType: 'percentage',
      discount: 10,
      minimumSpend: 0,
      limit: 100,
      usedCount: 0,
      isActive: true,
    });

    // Tenant A (starts on Free Plan)
    await User.create({
      _id: tenantUserAId,
      name: `Tenant Alpha ${testSuffix}`,
      email: `tenant_a_${testSuffix}@testcorp.io`,
      role: 'company',
      activePlanId: freePlanId,
      billingType: 'monthly',
      planExpireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      activeBusinessId: businessIdA,
      lang: 'en',
    });

    // Tenant B (for expiration test)
    await User.create({
      _id: tenantUserBId,
      name: `Tenant Beta ${testSuffix}`,
      email: `tenant_b_${testSuffix}@testcorp.io`,
      role: 'company',
      activePlanId: paidPlanMonthlyId,
      billingType: 'monthly',
      // Expired 5 days ago
      planExpireDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      lang: 'en',
    });

    // Business Hierarchy for Appointment Webhook Test
    await Business.create({
      _id: businessIdA,
      companyId: tenantUserAId,
      name: `Alpha Clinic ${testSuffix}`,
      slug: `alpha-clinic-${testSuffix}`,
      calendarFeedToken: `token_biz_${testSuffix}`,
    });

    await Location.create({
      _id: locationIdA,
      companyId: tenantUserAId,
      businessId: businessIdA,
      name: 'Main Clinic',
      isActive: true,
    });

    await Category.create({
      _id: categoryIdA,
      companyId: tenantUserAId,
      businessId: businessIdA,
      name: 'Medical Consultation',
      isActive: true,
    });

    await Service.create({
      _id: serviceIdA,
      companyId: tenantUserAId,
      businessId: businessIdA,
      categoryId: categoryIdA,
      name: 'General Health Exam',
      price: 75,
      durationMinutes: 60,
      isFree: false,
      isActive: true,
    });

    await User.create({
      _id: staffUserIdA,
      name: `Dr. Smith ${testSuffix}`,
      email: `smith_${testSuffix}@example.com`,
      role: 'staff',
      companyId: tenantUserAId,
      activeBusinessId: businessIdA,
      lang: 'en',
    });

    await Staff.create({
      _id: staffIdA,
      companyId: tenantUserAId,
      businessId: businessIdA,
      userId: staffUserIdA,
      name: `Dr. Smith ${testSuffix}`,
      serviceIds: [serviceIdA],
      locationIds: [locationIdA],
      colorCode: '#CEEDC1',
      isActive: true,
    });

    await Customer.create({
      _id: customerIdA,
      companyId: tenantUserAId,
      businessId: businessIdA,
      name: `John Doe ${testSuffix}`,
      email: `john_${testSuffix}@patient.com`,
      contact: '+15550001',
      gender: 'male',
    });

    await Appointment.create({
      _id: appointmentIdA,
      companyId: tenantUserAId,
      businessId: businessIdA,
      locationId: locationIdA,
      serviceId: serviceIdA,
      staffId: staffIdA,
      customerId: customerIdA,
      customerType: 'existing-user',
      appointmentNumber: `APT-${testSuffix}-001`,
      name: `John Doe ${testSuffix}`,
      email: `john_${testSuffix}@patient.com`,
      contact: '+15550001',
      date: '2026-09-23',
      time: '10:00',
      durationMinutes: 60,
      price: 75,
      paymentType: 'Pending',
      paymentStatus: 'unpaid',
      appointmentStatus: 'Pending',
      statusColor: '#fa9c30',
    });

    console.log('Fixtures provisioned successfully.\n');

    // -------------------------------------------------------------
    // TEST SECTION 1: Webhook Lock & Idempotency Core
    // -------------------------------------------------------------
    console.log('--- Test Section 1: Idempotency Lock Lifecycle ---');

    const evtId1 = `evt_stripe_test_${testSuffix}_1`;

    // 1. Initial lock acquisition
    const lock1 = await acquireWebhookLock(evtId1, 'stripe', 'checkout.session.completed', {
      session: 'sess_123',
    });
    assert(lock1.shouldProcess === true, 'Initial webhook lock acquired successfully');
    assert(typeof lock1.lockId === 'string', 'Lock ID returned');

    // 2. Concurrent/re-entry lock attempt while status is 'processing'
    const lock1Retry = await acquireWebhookLock(evtId1, 'stripe', 'checkout.session.completed');
    assert(
      lock1Retry.shouldProcess === false,
      'Concurrent lock attempt correctly rejected while processing'
    );
    assert(
      lock1Retry.reason?.includes('Currently being processed') === true,
      'Rejected with concurrent processing reason'
    );

    // 3. Mark success
    await markWebhookSuccess(evtId1, 'stripe', { session: 'sess_123', orderId: 'ord_1' });
    const eventDoc1 = await WebhookEvent.findOne({ eventId: evtId1, provider: 'stripe' });
    assert(eventDoc1?.status === 'processed', 'Webhook event transitioned to "processed"');
    assert(eventDoc1?.processedAt !== null, 'Webhook processedAt timestamp recorded');
    assert(eventDoc1?.errorMessage === null, 'Error message cleared on success');

    // 4. Re-entry attempt after success (idempotent skip)
    const lock1AfterSuccess = await acquireWebhookLock(evtId1, 'stripe', 'checkout.session.completed');
    assert(
      lock1AfterSuccess.shouldProcess === false,
      'Idempotent guard correctly skips already processed event'
    );
    assert(
      lock1AfterSuccess.reason?.includes('Already processed') === true,
      'Returned "Already processed (idempotent skip)" reason'
    );

    // 5. Test failed event handling and re-try lock
    const evtIdFail = `evt_stripe_fail_${testSuffix}`;
    const lockFail = await acquireWebhookLock(evtIdFail, 'stripe', 'invoice.payment_failed');
    assert(lockFail.shouldProcess === true, 'Acquired lock for failure testing');

    await markWebhookFailed(evtIdFail, 'stripe', 'Simulated gateway network timeout');
    const failedDoc = await WebhookEvent.findOne({ eventId: evtIdFail, provider: 'stripe' });
    assert(failedDoc?.status === 'failed', 'Event status set to "failed"');
    assert(failedDoc?.errorMessage === 'Simulated gateway network timeout', 'Error message recorded');

    // Failed events allow retry/re-lock
    const lockFailRetry = await acquireWebhookLock(evtIdFail, 'stripe', 'invoice.payment_failed');
    assert(lockFailRetry.shouldProcess === true, 'Failed event allows retry lock acquisition');
    await markWebhookFailed(evtIdFail, 'stripe', 'Final failure recorded for audit');

    // 6. Test ignored event
    const evtIdIgnored = `evt_stripe_ign_${testSuffix}`;
    await acquireWebhookLock(evtIdIgnored, 'stripe', 'unknown.event');
    await markWebhookIgnored(evtIdIgnored, 'stripe', 'Unhandled event type');
    const ignoredDoc = await WebhookEvent.findOne({ eventId: evtIdIgnored, provider: 'stripe' });
    assert(ignoredDoc?.status === 'ignored', 'Event status marked as "ignored"');
    const lockIgnoredRetry = await acquireWebhookLock(evtIdIgnored, 'stripe', 'unknown.event');
    assert(lockIgnoredRetry.shouldProcess === false, 'Ignored event is skipped on retry');

    // -------------------------------------------------------------
    // TEST SECTION 2: Subscription Checkout Fulfillment & Idempotency
    // -------------------------------------------------------------
    console.log('\n--- Test Section 2: Subscription Checkout Fulfillment & Replay Guard ---');

    const txnIdCheckout = `txn_stripe_checkout_${testSuffix}`;

    // Tenant A upgrades to Pro Monthly with Coupon
    const checkoutResult = await processSubscriptionCheckout({
      userId: String(tenantUserAId),
      planId: String(paidPlanMonthlyId),
      planName: `Pro Monthly ${testSuffix}`,
      billingType: 'monthly',
      price: 26.1, // 29 - 10%
      discountAmount: 2.9,
      currency: 'USD',
      paymentType: 'Stripe',
      txnId: txnIdCheckout,
      couponCode: `SAVE10_${testSuffix}`,
      couponId: String(couponId),
    });

    assert(checkoutResult.success === true, 'Subscription checkout executed successfully');
    assert(typeof checkoutResult.orderId === 'string', 'Order record created with ID');
    assert(checkoutResult.alreadyExisted !== true, 'Not marked as already existed on first run');

    // Assert Tenant User DB state
    const userAAfterUpgrade = await User.findById(tenantUserAId);
    assert(
      String(userAAfterUpgrade?.activePlanId) === String(paidPlanMonthlyId),
      'Tenant activePlanId updated to Pro Monthly'
    );
    assert(userAAfterUpgrade?.billingType === 'monthly', 'Tenant billingType set to "monthly"');
    assert(userAAfterUpgrade?.isTrialDone === true, 'Tenant isTrialDone marked true');

    const expectedExpiryMin = Date.now() + 29 * 24 * 60 * 60 * 1000;
    const actualExpiry = userAAfterUpgrade?.planExpireDate ? userAAfterUpgrade.planExpireDate.getTime() : 0;
    assert(actualExpiry > expectedExpiryMin, 'planExpireDate correctly calculated (+30 days)');

    // Assert Order Record
    const orderDoc = await Order.findById(checkoutResult.orderId);
    assert(orderDoc !== null, 'Order document exists in Atlas');
    assert(orderDoc?.price === 26.1, 'Order price recorded accurately ($26.10)');
    assert(orderDoc?.discountAmount === 2.9, 'Discount recorded ($2.90)');
    assert(orderDoc?.couponCode === `SAVE10_${testSuffix}`, 'Coupon code attached to order');
    assert(orderDoc?.paymentStatus === 'succeeded', 'Order paymentStatus is "succeeded"');

    // Assert Coupon usage count and UserCoupon
    const couponDoc = await Coupon.findById(couponId);
    assert(couponDoc?.usedCount === 1, 'Coupon usedCount incremented to 1');

    const userCouponDoc = await UserCoupon.findOne({
      userId: tenantUserAId,
      couponId,
    });
    assert(userCouponDoc !== null, 'UserCoupon audit record created');

    // REPLAY ATTACK / RETRY DELIVERY GUARD: Run exact same checkout again
    console.log('Testing Replay / Duplicate Delivery Guard...');
    const duplicateCheckoutResult = await processSubscriptionCheckout({
      userId: String(tenantUserAId),
      planId: String(paidPlanMonthlyId),
      planName: `Pro Monthly ${testSuffix}`,
      billingType: 'monthly',
      price: 26.1,
      discountAmount: 2.9,
      currency: 'USD',
      paymentType: 'Stripe',
      txnId: txnIdCheckout,
      couponCode: `SAVE10_${testSuffix}`,
      couponId: String(couponId),
    });

    assert(duplicateCheckoutResult.success === true, 'Duplicate call handled gracefully');
    assert(
      duplicateCheckoutResult.alreadyExisted === true,
      'Duplicate recognized: alreadyExisted is true'
    );
    assert(
      duplicateCheckoutResult.orderId === checkoutResult.orderId,
      'Returned original orderId without creating duplicate'
    );

    // Verify database was NOT corrupted or double-incremented
    const orderCount = await Order.countDocuments({ txnId: txnIdCheckout });
    assert(orderCount === 1, 'Strictly 1 Order exists in DB for this txnId (no duplicate)');

    const couponDocRecheck = await Coupon.findById(couponId);
    assert(couponDocRecheck?.usedCount === 1, 'Coupon usedCount was NOT incremented again (still 1)');

    const userCouponCount = await UserCoupon.countDocuments({
      userId: tenantUserAId,
      couponId,
    });
    assert(userCouponCount === 1, 'Strictly 1 UserCoupon record exists');

    // -------------------------------------------------------------
    // TEST SECTION 3: Recurring Renewal Invoice Engine
    // -------------------------------------------------------------
    console.log('\n--- Test Section 3: Recurring Renewal Invoice Engine ---');

    const invoiceId1 = `in_stripe_renewal_${testSuffix}_1`;
    const expireBeforeRenewal = userAAfterUpgrade?.planExpireDate
      ? new Date(userAAfterUpgrade.planExpireDate)
      : new Date();

    const renewalResult = await processRecurringRenewalInvoice({
      customerEmail: `tenant_a_${testSuffix}@testcorp.io`,
      amountPaid: 29,
      currency: 'USD',
      invoiceId: invoiceId1,
      hostedInvoiceUrl: 'https://stripe.com/invoice/inv_123',
      paymentType: 'Stripe',
    });

    assert(renewalResult.success === true, 'Recurring renewal processed successfully');
    assert(typeof renewalResult.orderId === 'string', 'Recurring Order created');

    const userAAfterRenewal = await User.findById(tenantUserAId);
    const expireAfterRenewal = userAAfterRenewal?.planExpireDate
      ? new Date(userAAfterRenewal.planExpireDate)
      : new Date();

    const diffDays = Math.round(
      (expireAfterRenewal.getTime() - expireBeforeRenewal.getTime()) / (1000 * 60 * 60 * 24)
    );
    assert(diffDays === 30, `planExpireDate extended by exactly 30 days (diffDays=${diffDays})`);

    const renewalOrder = await Order.findById(renewalResult.orderId);
    assert(renewalOrder?.txnId === invoiceId1, 'Recurring Order txnId matches invoice ID');
    assert(renewalOrder?.receiptUrl === 'https://stripe.com/invoice/inv_123', 'Hosted receipt URL stored');

    // Idempotent retry of same invoice
    const duplicateRenewalResult = await processRecurringRenewalInvoice({
      customerEmail: `tenant_a_${testSuffix}@testcorp.io`,
      amountPaid: 29,
      currency: 'USD',
      invoiceId: invoiceId1,
      hostedInvoiceUrl: 'https://stripe.com/invoice/inv_123',
      paymentType: 'Stripe',
    });

    assert(
      duplicateRenewalResult.alreadyRenewed === true,
      'Duplicate recurring invoice detected: alreadyRenewed is true'
    );
    const renewalOrdersCount = await Order.countDocuments({ txnId: invoiceId1 });
    assert(renewalOrdersCount === 1, 'Only 1 Order generated for recurring invoice');

    // -------------------------------------------------------------
    // TEST SECTION 4: Subscription Cancellation & Downgrade
    // -------------------------------------------------------------
    console.log('\n--- Test Section 4: Subscription Cancellation & Downgrade ---');

    const cancelResult = await processSubscriptionCancelled({
      customerEmail: `tenant_a_${testSuffix}@testcorp.io`,
      subscriptionId: `sub_stripe_${testSuffix}`,
      reason: 'Customer requested cancellation',
    });

    assert(cancelResult.success === true, 'Subscription cancellation processed');
    assert(cancelResult.downgradedToFree === true, 'Tenant flagged as downgraded to free');

    const userAAfterCancel = await User.findById(tenantUserAId);
    const downgradedPlanA = await Plan.findById(userAAfterCancel?.activePlanId);
    assert(
      downgradedPlanA?.isFreePlan === true,
      'Tenant activePlanId reset to Free Plan'
    );

    // Verify In-App Notification
    const notifDoc = await Notification.findOne({
      recipientId: tenantUserAId,
      type: 'system_alert',
      title: 'Subscription Cancelled',
    });
    assert(notifDoc !== null, 'In-app notification created for cancellation');
    assert(
      notifDoc?.message.includes('shifted to the') === true,
      'Notification contains informative message'
    );

    // -------------------------------------------------------------
    // TEST SECTION 5: Payment Failed Handler
    // -------------------------------------------------------------
    console.log('\n--- Test Section 5: Failed Payment Handling ---');

    const failTxnId = `txn_fail_${testSuffix}`;
    const failResult = await processPaymentFailed({
      customerEmail: `tenant_a_${testSuffix}@testcorp.io`,
      userId: String(tenantUserAId),
      amount: 29,
      currency: 'USD',
      txnId: failTxnId,
      reason: 'insufficient_funds',
      paymentType: 'Stripe',
    });

    assert(failResult.success === true, 'Payment failed event logged successfully');
    const failedOrderDoc = await Order.findById(failResult.orderId);
    assert(failedOrderDoc?.paymentStatus === 'failed', 'Failed Order recorded with status "failed"');
    assert(failedOrderDoc?.txnId === failTxnId, 'Failed Order txnId recorded');

    const failNotif = await Notification.findOne({
      recipientId: tenantUserAId,
      title: 'Payment Failed: Action Required',
    });
    assert(failNotif !== null, 'Payment failure alert notification issued to tenant');

    // -------------------------------------------------------------
    // TEST SECTION 6: PayPal Webhook Engine
    // -------------------------------------------------------------
    console.log('\n--- Test Section 6: PayPal Webhook Engine ---');

    // 1. Signature check in test mode (missing credentials should accept transmission header)
    const testHeaders = new Headers({
      'paypal-transmission-id': `trans_${testSuffix}`,
      'content-type': 'application/json',
    });
    const sigValid = await verifyPayPalWebhookSignature(testHeaders, '{}');
    assert(sigValid === true, 'PayPal signature verification valid in sandbox mode');

    // 2. Appointment Booking Payment Webhook
    const ppApptEventId = `WH-PP-APPT-${testSuffix}`;
    const ppApptResult = await processPayPalWebhookEvent({
      id: ppApptEventId,
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      summary: 'Appointment payment capture',
      resource: {
        id: `CAPTURE-${testSuffix}-1`,
        custom_id: `appointment_${appointmentIdA}`,
        amount: {
          value: '75.00',
          currency_code: 'USD',
        },
      },
    });

    assert(ppApptResult.success === true, 'PayPal appointment payment webhook processed');

    const updatedAppt = await Appointment.findById(appointmentIdA);
    assert(updatedAppt?.paymentStatus === 'paid', 'Appointment paymentStatus updated to "paid"');
    assert(updatedAppt?.appointmentStatus === 'Confirmed', 'Appointment confirmed');
    assert(updatedAppt?.paymentType === 'PayPal', 'Payment type marked as "PayPal"');

    const apptPayment = await AppointmentPayment.findOne({ txnId: `CAPTURE-${testSuffix}-1` });
    assert(apptPayment !== null, 'AppointmentPayment record created');
    assert(apptPayment?.finalAmount === 75, 'Payment final amount is 75');

    // 3. Replay guard for PayPal event
    const ppApptReplay = await processPayPalWebhookEvent({
      id: ppApptEventId,
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: `CAPTURE-${testSuffix}-1`,
        custom_id: `appointment_${appointmentIdA}`,
      },
    });
    assert(
      ppApptReplay.alreadyProcessed === true,
      'Duplicate PayPal webhook event idempotently skipped'
    );

    // 4. PayPal SaaS Plan Checkout
    const ppPlanEventId = `WH-PP-PLAN-${testSuffix}`;
    const ppPlanResult = await processPayPalWebhookEvent({
      id: ppPlanEventId,
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      summary: 'SaaS Subscription Plan purchase',
      resource: {
        id: `CAPTURE-PLAN-${testSuffix}`,
        custom_id: `plan_${paidPlanYearlyId}_${tenantUserAId}_yearly`,
        amount: {
          value: '290.00',
          currency_code: 'USD',
        },
      },
    });

    assert(ppPlanResult.success === true, 'PayPal subscription purchase processed');
    const userAAfterPayPal = await User.findById(tenantUserAId);
    assert(
      String(userAAfterPayPal?.activePlanId) === String(paidPlanYearlyId),
      'Tenant upgraded to Pro Yearly via PayPal'
    );
    assert(userAAfterPayPal?.billingType === 'yearly', 'Billing cycle set to yearly');

    // 5. PayPal Denial
    const ppDeniedEventId = `WH-PP-DENIED-${testSuffix}`;
    const ppDeniedResult = await processPayPalWebhookEvent({
      id: ppDeniedEventId,
      event_type: 'PAYMENT.CAPTURE.DENIED',
      resource: {
        id: `CAPTURE-DENIED-${testSuffix}`,
        amount: {
          value: '290.00',
          currency_code: 'USD',
        },
      },
    });
    assert(ppDeniedResult.success === true, 'PayPal payment denial handled cleanly');

    // -------------------------------------------------------------
    // TEST SECTION 7: Automated Plan Expiration Cron Engine
    // -------------------------------------------------------------
    console.log('\n--- Test Section 7: Automated Plan Expiration Cron Engine ---');

    // Tenant B has an expired plan (5 days ago)
    const userBBefore = await User.findById(tenantUserBId);
    assert(
      String(userBBefore?.activePlanId) === String(paidPlanMonthlyId),
      'Tenant B currently on Pro Monthly'
    );

    // Run enforcePlanExpirations with gracePeriodDays = 10 (should NOT downgrade yet)
    const graceCheck = await enforcePlanExpirations(10);
    assert(graceCheck.downgradedCount === 0, 'Zero tenants downgraded within 10-day grace period');
    const userBGrace = await User.findById(tenantUserBId);
    assert(
      String(userBGrace?.activePlanId) === String(paidPlanMonthlyId),
      'Tenant B NOT downgraded when within 10-day grace period'
    );

    // Run enforcePlanExpirations with gracePeriodDays = 0 (should downgrade Tenant B)
    const enforceResult = await enforcePlanExpirations(0);
    assert(enforceResult.downgradedCount >= 1, 'At least 1 expired tenant downgraded');

    const userBAfter = await User.findById(tenantUserBId);
    const downgradedPlanB = await Plan.findById(userBAfter?.activePlanId);
    assert(
      downgradedPlanB?.isFreePlan === true,
      'Tenant B cleanly downgraded to Free Plan'
    );

    // Active tenants (e.g. Tenant A which has 1 year left) are NOT affected
    const userARecheck = await User.findById(tenantUserAId);
    assert(
      String(userARecheck?.activePlanId) === String(paidPlanYearlyId),
      'Active Tenant A preserved on Pro Yearly'
    );

    // -------------------------------------------------------------
    // TEST SECTION 8: Super Admin Webhook Diagnostics & Audit Query
    // -------------------------------------------------------------
    console.log('\n--- Test Section 8: Webhook Audit & Diagnostics Query ---');

    const stripeEvents = await WebhookEvent.find({ provider: 'stripe' })
      .sort({ createdAt: -1 })
      .lean();
    assert(stripeEvents.length >= 3, 'Stripe webhook events logged to WebhookEvent table');

    const paypalEvents = await WebhookEvent.find({ provider: 'paypal' })
      .sort({ createdAt: -1 })
      .lean();
    assert(paypalEvents.length >= 3, 'PayPal webhook events logged to WebhookEvent table');

    const processedEvents = await WebhookEvent.find({ status: 'processed' });
    assert(processedEvents.length >= 4, 'Multiple events verified in "processed" state');

    const failedEvents = await WebhookEvent.find({ status: 'failed' });
    assert(failedEvents.length >= 1, 'Failed events captured in WebhookEvent history');
  } finally {
    // -------------------------------------------------------------
    // CLEANUP FIXTURES
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up Test Fixtures from Atlas ---');

    await Promise.all([
      User.deleteMany({ _id: { $in: [adminId, tenantUserAId, tenantUserBId, staffUserIdA] } }),
      Plan.deleteMany({ _id: { $in: [freePlanId, paidPlanMonthlyId, paidPlanYearlyId] } }),
      Coupon.deleteMany({ _id: couponId }),
      UserCoupon.deleteMany({ userId: { $in: [tenantUserAId, tenantUserBId] } }),
      Business.deleteMany({ _id: businessIdA }),
      Location.deleteMany({ _id: locationIdA }),
      Category.deleteMany({ _id: categoryIdA }),
      Service.deleteMany({ _id: serviceIdA }),
      Staff.deleteMany({ _id: staffIdA }),
      Customer.deleteMany({ _id: customerIdA }),
      Appointment.deleteMany({ _id: appointmentIdA }),
      AppointmentPayment.deleteMany({ companyId: { $in: [tenantUserAId, tenantUserBId] } }),
      Order.deleteMany({ companyId: { $in: [tenantUserAId, tenantUserBId] } }),
      Notification.deleteMany({ recipientId: { $in: [tenantUserAId, tenantUserBId] } }),
      WebhookEvent.deleteMany({
        eventId: {
          $in: [
            `evt_stripe_test_${testSuffix}_1`,
            `evt_stripe_fail_${testSuffix}`,
            `evt_stripe_ign_${testSuffix}`,
            `WH-PP-APPT-${testSuffix}`,
            `WH-PP-PLAN-${testSuffix}`,
            `WH-PP-DENIED-${testSuffix}`,
          ],
        },
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

void runPaymentWebhookSuite().then(() => {
  process.exit(0);
});
