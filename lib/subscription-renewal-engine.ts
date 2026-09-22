import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Order } from '@/models/Order';
import { Plan } from '@/models/Plan';
import { Coupon } from '@/models/Coupon';
import { UserCoupon } from '@/models/UserCoupon';
import { Notification } from '@/models/Notification';

export interface SubscriptionCheckoutInput {
  userId: string;
  planId: string;
  planName?: string;
  billingType?: 'monthly' | 'yearly';
  price: number;
  discountAmount?: number;
  currency?: string;
  paymentType: 'Stripe' | 'PayPal';
  txnId: string;
  couponCode?: string;
  couponId?: string;
}

export interface SubscriptionRenewalInvoiceInput {
  customerEmail: string;
  amountPaid: number;
  currency: string;
  invoiceId: string;
  hostedInvoiceUrl?: string;
  paymentType: 'Stripe' | 'PayPal';
}

export interface SubscriptionCancelledInput {
  userId?: string;
  customerEmail?: string;
  subscriptionId?: string;
  reason?: string;
}

export interface PaymentFailedInput {
  customerEmail?: string;
  userId?: string;
  amount: number;
  currency: string;
  txnId?: string;
  reason?: string;
  paymentType: 'Stripe' | 'PayPal';
}

/**
 * Fulfills a new SaaS plan subscription purchase.
 * Idempotently assigns the active plan, calculates expiry, and logs the Order and coupon audit.
 */
export async function processSubscriptionCheckout(
  input: SubscriptionCheckoutInput
): Promise<{ success: boolean; orderId?: string; planExpireDate?: string; alreadyExisted?: boolean; error?: string }> {
  await connectToDatabase();

  const user = await User.findById(input.userId);
  if (!user) {
    return { success: false, error: `Tenant User not found: ${input.userId}` };
  }

  const plan = await Plan.findById(input.planId).lean();
  if (!plan) {
    return { success: false, error: `Plan not found: ${input.planId}` };
  }

  // Idempotency check: if Order with this txnId already exists, do not duplicate Order or re-extend
  const existingOrder = await Order.findOne({ txnId: input.txnId });
  if (existingOrder) {
    return {
      success: true,
      orderId: String(existingOrder._id),
      alreadyExisted: true,
      planExpireDate: user.planExpireDate ? user.planExpireDate.toISOString() : undefined,
    };
  }

  const isYearly = input.billingType === 'yearly';
  const expireDate = new Date();
  if (isYearly) {
    expireDate.setFullYear(expireDate.getFullYear() + 1);
  } else {
    expireDate.setDate(expireDate.getDate() + 30);
  }

  // Update user subscription state
  user.activePlanId = new Types.ObjectId(input.planId);
  user.billingType = isYearly ? 'yearly' : 'monthly';
  user.planExpireDate = expireDate;
  user.isTrialDone = true;
  await user.save();

  // Create Order record
  const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await Order.create({
    orderNumber,
    companyId: user._id,
    planId: plan._id,
    planName: input.planName || plan.name || 'SaaS Subscription',
    billingCycle: isYearly ? 'yearly' : 'monthly',
    price: input.price,
    discountAmount: input.discountAmount || 0,
    currency: (input.currency || 'USD').toUpperCase(),
    paymentType: input.paymentType,
    paymentStatus: 'succeeded',
    txnId: input.txnId,
    couponCode: input.couponCode || undefined,
  });

  // Track coupon redemption if applicable
  if (input.couponId) {
    await Coupon.findByIdAndUpdate(input.couponId, {
      $inc: { usedCount: 1 },
    });

    await UserCoupon.create({
      userId: user._id,
      couponId: new Types.ObjectId(input.couponId),
      orderId: order._id,
      usedAt: new Date(),
    });
  }

  return {
    success: true,
    orderId: String(order._id),
    planExpireDate: expireDate.toISOString(),
  };
}

/**
 * Fulfills an automated recurring renewal invoice from Stripe or PayPal.
 * Extends the tenant's planExpireDate and records the recurring Order.
 */
export async function processRecurringRenewalInvoice(
  input: SubscriptionRenewalInvoiceInput
): Promise<{ success: boolean; orderId?: string; newExpireDate?: string; alreadyRenewed?: boolean; error?: string }> {
  await connectToDatabase();

  const user = await User.findOne({
    email: input.customerEmail.toLowerCase().trim(),
  });

  if (!user || !user.activePlanId) {
    return { success: false, error: `No active subscriber found for email: ${input.customerEmail}` };
  }

  // Idempotency check: if recurring order with this invoiceId exists, skip
  const existingOrder = await Order.findOne({ txnId: input.invoiceId });
  if (existingOrder) {
    return {
      success: true,
      orderId: String(existingOrder._id),
      alreadyRenewed: true,
      newExpireDate: user.planExpireDate ? user.planExpireDate.toISOString() : undefined,
    };
  }

  const isYearly = user.billingType === 'yearly';
  const baseDate =
    user.planExpireDate && user.planExpireDate > new Date()
      ? new Date(user.planExpireDate)
      : new Date();

  if (isYearly) {
    baseDate.setFullYear(baseDate.getFullYear() + 1);
  } else {
    baseDate.setDate(baseDate.getDate() + 30);
  }

  user.planExpireDate = baseDate;
  await user.save();

  const plan = await Plan.findById(user.activePlanId).lean();
  const orderNumber = `ORD-REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await Order.create({
    orderNumber,
    companyId: user._id,
    planId: user.activePlanId,
    planName: plan?.name ? `${plan.name} (Recurring)` : 'SaaS Recurring Renewal',
    billingCycle: user.billingType || 'monthly',
    price: input.amountPaid,
    discountAmount: 0,
    currency: (input.currency || 'USD').toUpperCase(),
    paymentType: input.paymentType,
    paymentStatus: 'succeeded',
    txnId: input.invoiceId,
    receiptUrl: input.hostedInvoiceUrl || undefined,
  });

  return {
    success: true,
    orderId: String(order._id),
    newExpireDate: baseDate.toISOString(),
  };
}

/**
 * Handles subscription cancellation.
 * Downgrades the tenant to the free plan and issues an in-app system alert.
 */
export async function processSubscriptionCancelled(
  input: SubscriptionCancelledInput
): Promise<{ success: boolean; userId?: string; downgradedToFree?: boolean; error?: string }> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (input.userId) {
    query._id = new Types.ObjectId(input.userId);
  } else if (input.customerEmail) {
    query.email = input.customerEmail.toLowerCase().trim();
  } else {
    return { success: false, error: 'Must provide userId or customerEmail.' };
  }

  const user = await User.findOne(query);
  if (!user) {
    return { success: false, error: 'User not found for cancellation.' };
  }

  const freePlan = await Plan.findOne({ isFreePlan: true, isEnabled: true }).lean();
  let downgraded = false;

  if (freePlan) {
    user.activePlanId = freePlan._id;
    user.planExpireDate = new Date();
    await user.save();
    downgraded = true;
  } else {
    user.planExpireDate = new Date();
    await user.save();
  }

  // Issue in-app system alert if user has an active business
  if (user.activeBusinessId) {
    await Notification.create({
      recipientId: user._id,
      companyId: user._id,
      businessId: user.activeBusinessId,
      type: 'system_alert',
      title: 'Subscription Cancelled',
      message: `Your SaaS subscription has been cancelled. Your account has been shifted to the ${freePlan?.name || 'Free'} plan.`,
    });
  }

  return {
    success: true,
    userId: String(user._id),
    downgradedToFree: downgraded,
  };
}

/**
 * Handles failed recurring payments.
 * Logs a failed Order record and alerts the tenant.
 */
export async function processPaymentFailed(
  input: PaymentFailedInput
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (input.userId) {
    query._id = new Types.ObjectId(input.userId);
  } else if (input.customerEmail) {
    query.email = input.customerEmail.toLowerCase().trim();
  }

  const user = Object.keys(query).length > 0 ? await User.findOne(query) : null;
  const orderNumber = `ORD-FAIL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await Order.create({
    orderNumber,
    companyId: user ? user._id : new Types.ObjectId(),
    planId: user?.activePlanId || new Types.ObjectId(),
    planName: 'Payment Failed',
    billingCycle: user?.billingType || 'monthly',
    price: input.amount,
    discountAmount: 0,
    currency: (input.currency || 'USD').toUpperCase(),
    paymentType: input.paymentType,
    paymentStatus: 'failed',
    txnId: input.txnId || `fail_${Date.now()}`,
  });

  if (user && user.activeBusinessId) {
    await Notification.create({
      recipientId: user._id,
      companyId: user._id,
      businessId: user.activeBusinessId,
      type: 'system_alert',
      title: 'Payment Failed: Action Required',
      message: `Your recent payment of $${input.amount} could not be processed (${input.reason || 'Card declined'}). Please update your payment method to keep your active plan.`,
    });
  }

  return { success: true, orderId: String(order._id) };
}

/**
 * Automated cron engine that scans for expired subscriptions and downgrades them to the free plan.
 */
export async function enforcePlanExpirations(
  gracePeriodDays = 0
): Promise<{ evaluatedCount: number; downgradedCount: number; gracePeriodDays: number }> {
  await connectToDatabase();

  const now = new Date();
  const graceCutoff = new Date(now.getTime() - gracePeriodDays * 24 * 60 * 60 * 1000);

  const freePlan = await Plan.findOne({ isFreePlan: true, isEnabled: true }).lean();

  const expiredFilter: Record<string, unknown> = {
    role: 'company',
    planExpireDate: { $lt: graceCutoff },
  };

  if (freePlan) {
    expiredFilter.activePlanId = { $ne: freePlan._id };
  }

  const expiredUsers = await User.find(expiredFilter);

  let downgradedCount = 0;

  for (const user of expiredUsers) {
    if (freePlan) {
      user.activePlanId = freePlan._id;
      await user.save();
      downgradedCount++;

      if (user.activeBusinessId) {
        await Notification.create({
          recipientId: user._id,
          companyId: user._id,
          businessId: user.activeBusinessId,
          type: 'system_alert',
          title: 'Subscription Expired',
          message: `Your subscription has expired. Your account has been shifted to the ${freePlan.name} plan.`,
        });
      }
    }
  }

  return {
    evaluatedCount: expiredUsers.length,
    downgradedCount,
    gracePeriodDays,
  };
}
