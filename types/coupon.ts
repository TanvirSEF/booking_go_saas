import type { CouponDiscountType } from '@/models/Coupon';

export interface CouponDiscountCalculation {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  formattedDiscount: string;
  formattedFinalAmount: string;
}

export interface CouponValidationResult {
  success: boolean;
  error?: string;
  coupon?: {
    id: string;
    name: string;
    code: string;
    discountType: CouponDiscountType;
    discount: number;
    minimumSpend: number;
    maximumSpend?: number;
    expiryDate?: string | null;
  };
  calculation?: CouponDiscountCalculation;
}

export interface RedeemCouponOptions {
  code: string;
  orderAmount: number;
  userId: string;
  orderId?: string;
}

export interface RedeemCouponResult {
  success: boolean;
  error?: string;
  couponId?: string;
  userCouponId?: string;
  calculation?: CouponDiscountCalculation;
}

export interface CouponStatsResult {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
}
