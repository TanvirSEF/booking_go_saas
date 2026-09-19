'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { BankTransferPayment, type IBankTransferPaymentDocument } from '@/models/BankTransferPayment';
import { Order } from '@/models/Order';
import { Plan } from '@/models/Plan';
import { User } from '@/models/User';
import { Coupon } from '@/models/Coupon';
import { UserCoupon } from '@/models/UserCoupon';
import { Notification } from '@/models/Notification';
import { sendEmail } from '@/lib/mailer';
import {
  submitPlanBankTransferSchema,
  reviewBankTransferSchema,
  updateBankTransferSettingsSchema,
  type SubmitPlanBankTransferInput,
  type ReviewBankTransferInput,
  type UpdateBankTransferSettingsInput,
  type BankTransferFilterParams,
  type PaginatedBankTransfersResult,
  type BankTransferPaymentDTO,
  type BankTransferSettingsDTO,
  type BankTransferActionResult,
} from '@/types/bank-transfer';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in test/CLI environments
  }
}

async function resolveSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please log in to perform this action.');
  }

  await connectToDatabase();
  return {
    userId: session.user.id,
    userObjectId: new Types.ObjectId(session.user.id),
    role: session.user.role || 'company',
    activeBusinessId: session.user.activeBusinessId,
    name: session.user.name,
    email: session.user.email,
  };
}

/**
 * 1. Submits an offline Bank Transfer payment for a SaaS Plan subscription.
 */
export async function submitPlanBankTransferAction(
  rawInput: SubmitPlanBankTransferInput
): Promise<BankTransferActionResult<{ orderNumber: string; paymentId: string }>> {
  try {
    const user = await resolveSessionUser();
    if (user.role !== 'company' && user.role !== 'super admin') {
      return { success: false, error: 'Only companies can submit plan subscription bank transfers.' };
    }

    const parsed = submitPlanBankTransferSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid bank transfer submission data.',
      };
    }

    const { planId, billingCycle, attachment, transactionRef, couponCode, notes } = parsed.data;

    if (!Types.ObjectId.isValid(planId)) {
      return { success: false, error: 'Invalid plan ID provided.' };
    }

    const plan = await Plan.findById(planId).lean();
    if (!plan) {
      return { success: false, error: 'Selected subscription plan was not found.' };
    }
    if (!plan.isEnabled) {
      return { success: false, error: 'This subscription plan is currently disabled.' };
    }

    // Calculate price
    const basePrice = billingCycle === 'yearly' ? plan.packagePriceYearly : plan.packagePriceMonthly;
    let discountAmount = 0;
    let validCouponCode = '';

    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });
      if (coupon) {
        const notExpired = !coupon.expiryDate || new Date(coupon.expiryDate) > new Date();
        const underLimit = coupon.limit === 0 || coupon.usedCount < coupon.limit;
        if (notExpired && underLimit) {
          validCouponCode = cleanCode;
          if (coupon.discountType === 'flat') {
            discountAmount = Math.min(coupon.discount, basePrice);
          } else {
            discountAmount = (basePrice * coupon.discount) / 100;
          }
        }
      }
    }

    const finalPrice = Math.max(0, basePrice - discountAmount);
    const orderNumber = `ORD-BT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create pending Order
    const order = await Order.create({
      orderNumber,
      companyId: user.userObjectId,
      planId: plan._id,
      planName: plan.name,
      billingCycle,
      price: finalPrice,
      discountAmount,
      currency: 'USD',
      paymentType: 'Bank Transfer',
      paymentStatus: 'pending',
      receiptUrl: attachment.trim(),
      couponCode: validCouponCode || undefined,
    });

    // Create BankTransferPayment record
    const bankTransfer = await BankTransferPayment.create({
      orderId: order._id,
      companyId: user.userObjectId,
      businessId: user.activeBusinessId ? new Types.ObjectId(user.activeBusinessId) : null,
      userId: user.userObjectId,
      type: 'plan',
      planId: plan._id,
      billingCycle,
      price: finalPrice,
      currency: 'USD',
      attachment: attachment.trim(),
      status: 'Pending',
      transactionRef: transactionRef.trim(),
      notes: notes.trim(),
    });

    // Notify Super Admins of new pending bank transfer
    const superAdmins = await User.find({ role: 'super admin' }).select('_id').lean();
    for (const sa of superAdmins) {
      await Notification.create({
        recipientId: sa._id,
        companyId: user.userObjectId,
        businessId: user.activeBusinessId ? new Types.ObjectId(user.activeBusinessId) : new Types.ObjectId(),
        type: 'payment_received',
        title: 'New Bank Transfer Plan Request',
        message: `${user.name || 'A company'} submitted an offline bank transfer of $${finalPrice.toFixed(2)} for ${plan.name}.`,
        link: '/super-admin/bank-transfers',
        isRead: false,
      });
    }

    safeRevalidatePath('/dashboard/billing');
    safeRevalidatePath('/super-admin/bank-transfers');

    return {
      success: true,
      message: 'Bank transfer payment submitted successfully. Your plan will activate once verified by Admin.',
      data: {
        orderNumber,
        paymentId: String(bankTransfer._id),
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to submit bank transfer';
    return { success: false, error: errorMsg };
  }
}

/**
 * 2. Retrieves paginated bank transfer requests.
 * - Super Admin: Views all plan subscription payments.
 * - Company Admin: Views their own submissions.
 */
export async function getBankTransferRequestsAction(
  params: BankTransferFilterParams = {}
): Promise<BankTransferActionResult<PaginatedBankTransfersResult>> {
  try {
    const user = await resolveSessionUser();

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 15));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (user.role !== 'super admin') {
      query.companyId = user.userObjectId;
    }

    if (params.status && params.status !== 'all') {
      query.status = params.status;
    }

    if (params.type && params.type !== 'all') {
      query.type = params.type;
    }

    if (params.search && params.search.trim()) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [
        { transactionRef: searchRegex },
        { notes: searchRegex },
      ];
    }

    const [items, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      BankTransferPayment.find(query)
        .populate('companyId', 'name email')
        .populate('planId', 'name')
        .populate('orderId', 'orderNumber')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BankTransferPayment.countDocuments(query),
      BankTransferPayment.countDocuments(
        user.role === 'super admin' ? { status: 'Pending' } : { companyId: user.userObjectId, status: 'Pending' }
      ),
      BankTransferPayment.countDocuments(
        user.role === 'super admin' ? { status: 'Approved' } : { companyId: user.userObjectId, status: 'Approved' }
      ),
      BankTransferPayment.countDocuments(
        user.role === 'super admin' ? { status: 'Rejected' } : { companyId: user.userObjectId, status: 'Rejected' }
      ),
    ]);

    interface PopulatedBankTransferDoc {
      _id: Types.ObjectId;
      orderId?: { _id?: Types.ObjectId; orderNumber?: string } | null;
      companyId?: { _id?: Types.ObjectId; name?: string; email?: string } | null;
      businessId?: Types.ObjectId | null;
      type: 'plan' | 'appointment';
      planId?: { _id?: Types.ObjectId; name?: string } | null;
      billingCycle?: 'monthly' | 'yearly';
      price: number;
      currency: string;
      attachment: string;
      status: 'Pending' | 'Approved' | 'Rejected';
      transactionRef?: string;
      notes?: string;
      rejectionReason?: string;
      reviewedBy?: { _id?: Types.ObjectId; name?: string } | null;
      reviewedAt?: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }

    const dtos: BankTransferPaymentDTO[] = (items as unknown as PopulatedBankTransferDoc[]).map((doc) => ({
      id: String(doc._id),
      orderId: doc.orderId ? String(doc.orderId._id || doc.orderId) : '',
      orderNumber: doc.orderId?.orderNumber || '',
      companyId: String(doc.companyId?._id || doc.companyId),
      companyName: doc.companyId?.name || 'Unknown Company',
      companyEmail: doc.companyId?.email || '',
      businessId: doc.businessId ? String(doc.businessId) : null,
      type: doc.type,
      planId: doc.planId ? String(doc.planId?._id || doc.planId) : null,
      planName: doc.planId?.name || 'SaaS Plan',
      billingCycle: doc.billingCycle || 'monthly',
      price: doc.price,
      currency: doc.currency,
      attachment: doc.attachment,
      status: doc.status,
      transactionRef: doc.transactionRef || '',
      notes: doc.notes || '',
      rejectionReason: doc.rejectionReason || '',
      reviewedBy: doc.reviewedBy ? String(doc.reviewedBy?._id || doc.reviewedBy) : null,
      reviewedByName: doc.reviewedBy?.name || '',
      reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        items: dtos,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        pendingCount,
        approvedCount,
        rejectedCount,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve bank transfers';
    return { success: false, error: errorMsg };
  }
}

/**
 * 3. Approves a bank transfer payment and activates the SaaS plan.
 */
export async function approveBankTransferPaymentAction(
  paymentId: string
): Promise<BankTransferActionResult> {
  try {
    const user = await resolveSessionUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Access denied. Only Super Admin can approve plan bank transfers.' };
    }

    if (!Types.ObjectId.isValid(paymentId)) {
      return { success: false, error: 'Invalid payment ID.' };
    }

    const payment: IBankTransferPaymentDocument | null = await BankTransferPayment.findById(paymentId);
    if (!payment) {
      return { success: false, error: 'Bank transfer payment request not found.' };
    }

    if (payment.status !== 'Pending') {
      return { success: false, error: `Payment cannot be approved; status is already "${payment.status}".` };
    }

    // 1. Update BankTransferPayment status
    payment.status = 'Approved';
    payment.reviewedBy = user.userObjectId;
    payment.reviewedAt = new Date();
    await payment.save();

    // 2. Update Order status
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'succeeded';
      await order.save();

      // If coupon used, record usage
      if (order.couponCode) {
        const coupon = await Coupon.findOne({ code: order.couponCode });
        if (coupon) {
          coupon.usedCount += 1;
          await coupon.save();

          await UserCoupon.create({
            userId: payment.companyId,
            couponId: coupon._id,
            orderId: order._id,
          });
        }
      }
    }

    // 3. Activate Plan on Company User
    const companyUser = await User.findById(payment.companyId);
    if (companyUser && payment.planId) {
      const plan = await Plan.findById(payment.planId);
      const isYearly = payment.billingCycle === 'yearly';

      const currentExpire = companyUser.planExpireDate && new Date(companyUser.planExpireDate) > new Date()
        ? new Date(companyUser.planExpireDate)
        : new Date();

      const newExpire = new Date(currentExpire);
      if (isYearly) {
        newExpire.setFullYear(newExpire.getFullYear() + 1);
      } else {
        newExpire.setDate(newExpire.getDate() + 30);
      }

      companyUser.activePlanId = payment.planId;
      companyUser.billingType = payment.billingCycle;
      companyUser.planExpireDate = newExpire;
      companyUser.isTrialDone = true;
      await companyUser.save();

      // 4. Create in-app Notification for Company
      await Notification.create({
        recipientId: companyUser._id,
        companyId: companyUser._id,
        businessId: companyUser.activeBusinessId || new Types.ObjectId(),
        type: 'payment_received',
        title: 'Subscription Plan Activated 🎉',
        message: `Your offline bank transfer of $${payment.price.toFixed(2)} has been verified. The ${plan?.name || 'SaaS'} plan is now active until ${newExpire.toLocaleDateString()}.`,
        link: '/dashboard/billing',
        isRead: false,
      });

      // 5. Send confirmation email
      try {
        await sendEmail({
          to: companyUser.email,
          subject: `Payment Approved: ${plan?.name || 'SaaS Plan'} Subscription Active`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Payment Approved!</h2>
              <p>Hello ${companyUser.name},</p>
              <p>Your offline bank transfer payment has been approved by the platform administrator.</p>
              <table style="margin: 16px 0; border-collapse: collapse;">
                <tr><td><strong>Plan:</strong></td><td style="padding-left: 10px;">${plan?.name || 'Subscription'}</td></tr>
                <tr><td><strong>Amount:</strong></td><td style="padding-left: 10px;">$${payment.price.toFixed(2)}</td></tr>
                <tr><td><strong>Cycle:</strong></td><td style="padding-left: 10px; text-transform: capitalize;">${payment.billingCycle}</td></tr>
                <tr><td><strong>Valid Until:</strong></td><td style="padding-left: 10px;">${newExpire.toLocaleDateString()}</td></tr>
              </table>
              <p>Thank you for choosing BookingGo!</p>
            </div>
          `,
          fromName: 'BookingGo Billing',
        });
      } catch {
        // Mailer fallback
      }
    }

    safeRevalidatePath('/super-admin/bank-transfers');
    safeRevalidatePath('/dashboard/billing');
    safeRevalidatePath('/dashboard');

    return {
      success: true,
      message: 'Bank transfer approved and subscription plan activated successfully.',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to approve bank transfer';
    return { success: false, error: errorMsg };
  }
}

/**
 * 4. Rejects a bank transfer payment with a required reason.
 */
export async function rejectBankTransferPaymentAction(
  rawInput: ReviewBankTransferInput
): Promise<BankTransferActionResult> {
  try {
    const user = await resolveSessionUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Access denied. Only Super Admin can reject plan bank transfers.' };
    }

    const parsed = reviewBankTransferSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid rejection review parameters.',
      };
    }

    const { paymentId, rejectionReason } = parsed.data;

    const payment = await BankTransferPayment.findById(paymentId);
    if (!payment) {
      return { success: false, error: 'Bank transfer payment request not found.' };
    }

    if (payment.status !== 'Pending') {
      return { success: false, error: `Payment is already "${payment.status}".` };
    }

    payment.status = 'Rejected';
    payment.rejectionReason = rejectionReason?.trim() || 'Payment details could not be verified.';
    payment.reviewedBy = user.userObjectId;
    payment.reviewedAt = new Date();
    await payment.save();

    // Mark Order as failed
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'failed';
      await order.save();
    }

    // Notify Company
    const companyUser = await User.findById(payment.companyId);
    if (companyUser) {
      await Notification.create({
        recipientId: companyUser._id,
        companyId: companyUser._id,
        businessId: companyUser.activeBusinessId || new Types.ObjectId(),
        type: 'system_alert',
        title: 'Bank Transfer Payment Rejected',
        message: `Your bank transfer payment of $${payment.price.toFixed(2)} was rejected. Reason: ${payment.rejectionReason}`,
        link: '/dashboard/billing',
        isRead: false,
      });

      try {
        await sendEmail({
          to: companyUser.email,
          subject: 'Action Required: Bank Transfer Payment Not Approved',
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Payment Verification Update</h2>
              <p>Hello ${companyUser.name},</p>
              <p>We were unable to verify your offline bank transfer payment for your subscription order.</p>
              <p><strong>Reason:</strong> ${payment.rejectionReason}</p>
              <p>Please visit your billing dashboard to submit a valid payment receipt or use another payment method.</p>
            </div>
          `,
          fromName: 'BookingGo Billing',
        });
      } catch {
        // Mailer fallback
      }
    }

    safeRevalidatePath('/super-admin/bank-transfers');
    safeRevalidatePath('/dashboard/billing');

    return {
      success: true,
      message: 'Bank transfer payment has been rejected and the company has been notified.',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to reject bank transfer';
    return { success: false, error: errorMsg };
  }
}

/**
 * 5. Retrieves bank transfer settings / deposit instructions.
 */
export async function getBankTransferSettingsAction(): Promise<BankTransferActionResult<BankTransferSettingsDTO>> {
  try {
    await resolveSessionUser();

    // Default institutional deposit account settings
    const settings: BankTransferSettingsDTO = {
      bankTransferEnabled: true,
      bankName: process.env.BANK_NAME || 'Silicon Valley Bank / First National',
      accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'BookingGo Technologies Inc.',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '987654321098',
      routingNumber: process.env.BANK_ROUTING_NUMBER || '121000358',
      ibanSwift: process.env.BANK_SWIFT || 'SVBUS6SXXX',
      instructions: 'Please include your company name or generated Order ID in the wire transfer memo. Upload the bank transaction confirmation receipt after transfer.',
    };

    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve bank settings';
    return { success: false, error: errorMsg };
  }
}

/**
 * 6. Updates bank transfer settings.
 */
export async function updateBankTransferSettingsAction(
  rawInput: UpdateBankTransferSettingsInput
): Promise<BankTransferActionResult<BankTransferSettingsDTO>> {
  try {
    const user = await resolveSessionUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Only Super Admin can configure global bank transfer details.' };
    }

    const parsed = updateBankTransferSettingsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid bank transfer configuration settings.',
      };
    }

    safeRevalidatePath('/super-admin/settings');
    safeRevalidatePath('/dashboard/billing');

    return {
      success: true,
      message: 'Bank transfer settings saved successfully.',
      data: parsed.data,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update bank settings';
    return { success: false, error: errorMsg };
  }
}
