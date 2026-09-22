import crypto from 'crypto';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Coupon, type ICouponDocument, type CouponDiscountType } from '@/models/Coupon';
import { UserCoupon } from '@/models/UserCoupon';
import type {
  CouponDiscountCalculation,
  CouponValidationResult,
  RedeemCouponOptions,
  RedeemCouponResult,
} from '@/types/coupon';

/**
 * Calculates discount and net amount based on discount type (percentage vs flat).
 * Guaranteed to return non-negative currency amounts rounded to 2 decimal places.
 */
export function calculateCouponDiscount(
  discountType: CouponDiscountType,
  discountValue: number,
  orderAmount: number
): CouponDiscountCalculation {
  const safeAmount = Math.max(0, orderAmount);
  let discount = 0;

  if (safeAmount > 0 && discountValue > 0) {
    if (discountType === 'percentage') {
      const percentage = Math.min(100, Math.max(0, discountValue));
      discount = (safeAmount * percentage) / 100;
    } else {
      // Flat rate discount
      discount = Math.min(discountValue, safeAmount);
    }
  }

  const roundedDiscount = Math.round(discount * 100) / 100;
  const finalAmount = Math.max(0, Math.round((safeAmount - roundedDiscount) * 100) / 100);

  return {
    originalAmount: safeAmount,
    discountAmount: roundedDiscount,
    finalAmount,
    formattedDiscount: `$${roundedDiscount.toFixed(2)}`,
    formattedFinalAmount: `$${finalAmount.toFixed(2)}`,
  };
}

/**
 * Validates a coupon against all business rules:
 * 1. Existence and active status
 * 2. Expiration date
 * 3. Global usage limit
 * 4. Minimum order spend
 * 5. Maximum order spend
 * 6. Per-user redemption limit (if userId provided)
 */
export async function validateCouponRules(
  couponCode: string,
  orderAmount: number,
  userId?: string
): Promise<CouponValidationResult> {
  if (!couponCode || !couponCode.trim()) {
    return { success: false, error: 'Please enter a coupon code.' };
  }

  await connectToDatabase();

  const cleanCode = couponCode.trim().toUpperCase();
  const coupon: ICouponDocument | null = await Coupon.findOne({ code: cleanCode });

  if (!coupon) {
    return { success: false, error: `Coupon code "${cleanCode}" is invalid.` };
  }

  if (coupon.isActive === false) {
    return { success: false, error: `Coupon code "${cleanCode}" is currently inactive.` };
  }

  const now = new Date();
  if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < now.getTime()) {
    return { success: false, error: `Coupon code "${cleanCode}" has expired.` };
  }

  if (coupon.limit > 0 && (coupon.usedCount || 0) >= coupon.limit) {
    return { success: false, error: `Coupon code "${cleanCode}" has reached its maximum usage limit.` };
  }

  const safeAmount = Math.max(0, orderAmount);
  if (coupon.minimumSpend > 0 && safeAmount < coupon.minimumSpend) {
    return {
      success: false,
      error: `Order amount ($${safeAmount.toFixed(2)}) is below the minimum spend requirement of $${coupon.minimumSpend.toFixed(2)} for coupon "${cleanCode}".`,
    };
  }

  if (coupon.maximumSpend && coupon.maximumSpend > 0 && safeAmount > coupon.maximumSpend) {
    return {
      success: false,
      error: `Order amount ($${safeAmount.toFixed(2)}) exceeds the maximum spend limit of $${coupon.maximumSpend.toFixed(2)} for coupon "${cleanCode}".`,
    };
  }

  // Check per-user redemption limit if userId is supplied
  if (userId && Types.ObjectId.isValid(userId)) {
    const userLimit = typeof coupon.maxUsagePerUser === 'number' ? coupon.maxUsagePerUser : 1;
    if (userLimit > 0) {
      const userUsageCount = await UserCoupon.countDocuments({
        userId: new Types.ObjectId(userId),
        couponId: coupon._id,
      });

      if (userUsageCount >= userLimit) {
        return {
          success: false,
          error: `You have already redeemed coupon "${cleanCode}" the maximum number of times allowed (${userLimit}).`,
        };
      }
    }
  }

  const calculation = calculateCouponDiscount(
    coupon.discountType,
    coupon.discount,
    safeAmount
  );

  return {
    success: true,
    coupon: {
      id: String(coupon._id),
      name: coupon.name,
      code: coupon.code,
      discountType: coupon.discountType,
      discount: coupon.discount,
      minimumSpend: coupon.minimumSpend,
      maximumSpend: coupon.maximumSpend,
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString() : null,
    },
    calculation,
  };
}

/**
 * Atomically redeems a coupon during checkout to protect against concurrency race conditions.
 * Uses conditional atomic $inc update and logs usage to UserCoupon.
 */
export async function redeemCoupon(
  options: RedeemCouponOptions
): Promise<RedeemCouponResult> {
  const { code, orderAmount, userId, orderId } = options;

  await connectToDatabase();

  const validation = await validateCouponRules(code, orderAmount, userId);
  if (!validation.success || !validation.coupon || !validation.calculation) {
    return { success: false, error: validation.error || 'Failed to validate coupon.' };
  }

  const couponId = new Types.ObjectId(validation.coupon.id);

  // Atomic reservation update: only increment if limit is 0 (unlimited) OR usedCount < limit
  const atomicUpdated = await Coupon.findOneAndUpdate(
    {
      _id: couponId,
      isActive: true,
      $or: [
        { limit: 0 },
        { limit: { $exists: false } },
        { $expr: { $lt: ['$usedCount', '$limit'] } },
      ],
    },
    { $inc: { usedCount: 1 } },
    { returnDocument: 'after' }
  );

  if (!atomicUpdated) {
    return {
      success: false,
      error: `Coupon "${validation.coupon.code}" usage limit was reached during checkout.`,
    };
  }

  // Create audit record in UserCoupon
  const userCoupon = await UserCoupon.create({
    userId: new Types.ObjectId(userId),
    couponId,
    orderId: orderId && Types.ObjectId.isValid(orderId) ? new Types.ObjectId(orderId) : undefined,
    usedAt: new Date(),
  });

  return {
    success: true,
    couponId: String(couponId),
    userCouponId: String(userCoupon._id),
    calculation: validation.calculation,
  };
}

/**
 * Generates an uppercase alphanumeric coupon code with optional prefix.
 * e.g. PROMO-8X92-K7L1
 */
export function generateRandomCouponCode(prefix = 'PROMO', segmentLength = 4): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous characters: 0, 1, O, I
  function getSegment(): string {
    const bytes = crypto.randomBytes(segmentLength);
    let str = '';
    for (let i = 0; i < segmentLength; i++) {
      str += chars[bytes[i] % chars.length];
    }
    return str;
  }

  const cleanPrefix = prefix ? prefix.trim().toUpperCase() : 'PROMO';
  return `${cleanPrefix}-${getSegment()}-${getSegment()}`;
}
