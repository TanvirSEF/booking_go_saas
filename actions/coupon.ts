"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Coupon } from "@/models/Coupon";
import { UserCoupon } from "@/models/UserCoupon";
import { Order } from "@/models/Order";
import "@/models/User";
import {
  validateCouponRules,
  redeemCoupon,
  generateRandomCouponCode,
} from "@/lib/coupon-engine";
import type {
  CouponValidationResult,
  RedeemCouponResult,
  CouponStatsResult,
} from "@/types/coupon";

async function verifySuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super admin") {
    throw new Error("Unauthorized: Super Admin access required");
  }
  return session.user;
}

export interface CouponItem {
  id: string;
  name: string;
  code: string;
  discountType: "percentage" | "flat";
  discount: number;
  limit: number;
  usedCount: number;
  maxUsagePerUser?: number;
  minimumSpend?: number;
  maximumSpend?: number;
  expiryDate?: string | null;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCouponInput {
  name: string;
  code: string;
  discount: number;
  limit: number;
  discountType?: "percentage" | "flat";
  maxUsagePerUser?: number;
  minimumSpend?: number;
  maximumSpend?: number;
  expiryDate?: string | null;
  description?: string;
}

export interface UpdateCouponInput extends CreateCouponInput {
  couponId: string;
}

export interface CouponRedemptionItem {
  id: string;
  userName: string;
  date: string;
  planName: string;
  paymentType: string;
}

export async function getCouponsAction(): Promise<CouponItem[]> {
  await verifySuperAdmin();
  await connectToDatabase();

  const rawCoupons = await Coupon.find().sort({ createdAt: -1 }).lean();

  return rawCoupons.map((c) => ({
    id: String(c._id),
    name: c.name,
    code: c.code,
    discountType: (c.discountType as "percentage" | "flat") || "percentage",
    discount: c.discount,
    limit: c.limit,
    usedCount: c.usedCount || 0,
    maxUsagePerUser: c.maxUsagePerUser ?? 1,
    minimumSpend: c.minimumSpend ?? 0,
    maximumSpend: c.maximumSpend ?? 0,
    expiryDate: c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : null,
    description: c.description || "",
    isActive: c.isActive ?? true,
    createdAt: new Date(c.createdAt).toLocaleDateString(),
  }));
}

export async function createCouponAction(data: CreateCouponInput) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const name = data.name?.trim();
    const code = data.code?.toUpperCase().trim();
    const discount = Number(data.discount);
    const limit = Number(data.limit);
    const maxUsagePerUser = data.maxUsagePerUser !== undefined ? Number(data.maxUsagePerUser) : 1;
    const minimumSpend = data.minimumSpend !== undefined ? Number(data.minimumSpend) : 0;
    const maximumSpend = data.maximumSpend !== undefined ? Number(data.maximumSpend) : 0;

    if (!name) {
      return { success: false, error: "Please enter a coupon name." };
    }

    if (!code) {
      return { success: false, error: "Please enter or generate a coupon code." };
    }

    if (isNaN(discount) || discount < 0) {
      return { success: false, error: "Please enter a valid discount amount." };
    }

    if (data.discountType === "percentage" && discount > 100) {
      return { success: false, error: "Discount percentage cannot exceed 100%." };
    }

    if (isNaN(limit) || limit < 0) {
      return { success: false, error: "Limit must be a non-negative number." };
    }

    // Check code uniqueness
    const existing = await Coupon.findOne({ code }).lean();
    if (existing) {
      return { success: false, error: `Coupon code "${code}" already exists.` };
    }

    const newCoupon = new Coupon({
      name,
      code,
      discount,
      discountType: data.discountType || "percentage",
      limit,
      usedCount: 0,
      maxUsagePerUser,
      minimumSpend,
      maximumSpend,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      description: data.description || "",
      isActive: true,
    });
    await newCoupon.save();

    revalidatePath("/super-admin/coupons");
    return { success: true, couponId: String(newCoupon._id) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create coupon";
    return { success: false, error: message };
  }
}

export async function updateCouponAction(data: UpdateCouponInput) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const { couponId } = data;
    const name = data.name?.trim();
    const code = data.code?.toUpperCase().trim();
    const discount = Number(data.discount);
    const limit = Number(data.limit);
    const maxUsagePerUser = data.maxUsagePerUser !== undefined ? Number(data.maxUsagePerUser) : 1;
    const minimumSpend = data.minimumSpend !== undefined ? Number(data.minimumSpend) : 0;
    const maximumSpend = data.maximumSpend !== undefined ? Number(data.maximumSpend) : 0;

    if (!name) {
      return { success: false, error: "Please enter a coupon name." };
    }

    if (!code) {
      return { success: false, error: "Please enter a coupon code." };
    }

    if (isNaN(discount) || discount < 0) {
      return { success: false, error: "Please enter a valid discount amount." };
    }

    if (data.discountType === "percentage" && discount > 100) {
      return { success: false, error: "Discount percentage cannot exceed 100%." };
    }

    if (isNaN(limit) || limit < 0) {
      return { success: false, error: "Limit must be a non-negative number." };
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return { success: false, error: "Coupon not found." };
    }

    // Check uniqueness if code changed
    if (code !== coupon.code) {
      const existing = await Coupon.findOne({
        code,
        _id: { $ne: coupon._id },
      }).lean();

      if (existing) {
        return { success: false, error: `Coupon code "${code}" already exists.` };
      }
      coupon.code = code;
    }

    coupon.name = name;
    coupon.discount = discount;
    coupon.limit = limit;
    coupon.maxUsagePerUser = maxUsagePerUser;
    coupon.minimumSpend = minimumSpend;
    coupon.maximumSpend = maximumSpend;
    if (data.discountType) {
      coupon.discountType = data.discountType;
    }
    if (data.description !== undefined) {
      coupon.description = data.description;
    }
    if (data.expiryDate !== undefined) {
      coupon.expiryDate = data.expiryDate ? new Date(data.expiryDate) : undefined;
    }

    await coupon.save();

    revalidatePath("/super-admin/coupons");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update coupon";
    return { success: false, error: message };
  }
}

export async function toggleCouponStatusAction(couponId: string) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return { success: false, error: "Coupon not found." };
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    revalidatePath("/super-admin/coupons");
    return { success: true, isActive: coupon.isActive };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle coupon status";
    return { success: false, error: message };
  }
}

export async function deleteCouponAction(couponId: string) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return { success: false, error: "Coupon not found." };
    }

    // Remove UserCoupon logs for this coupon
    await UserCoupon.deleteMany({ couponId: coupon._id });

    // Remove coupon
    await Coupon.findByIdAndDelete(coupon._id);

    revalidatePath("/super-admin/coupons");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete coupon";
    return { success: false, error: message };
  }
}

export async function getCouponDetailsAction(couponId: string) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const coupon = await Coupon.findById(couponId).lean();
    if (!coupon) {
      return { success: false, error: "Coupon not found." };
    }

    // Find orders that used this coupon code
    const orders = await Order.find({ couponCode: coupon.code })
      .sort({ createdAt: -1 })
      .populate("companyId", "name email")
      .lean();

    // Also check UserCoupon records as fallback
    const userCoupons = await UserCoupon.find({ couponId: coupon._id })
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .populate("orderId")
      .lean();

    const redemptions: CouponRedemptionItem[] = [];

    if (orders.length > 0) {
      for (const order of orders) {
        const user = order.companyId as unknown as { name?: string; email?: string } | null;
        redemptions.push({
          id: String(order._id),
          userName: user?.name || user?.email || "Tenant User",
          date: new Date(order.createdAt).toLocaleDateString(),
          planName: order.planName || "Subscription Plan",
          paymentType: order.paymentType || "Card",
        });
      }
    } else if (userCoupons.length > 0) {
      for (const uc of userCoupons) {
        const user = uc.userId as unknown as { name?: string; email?: string } | null;
        const ord = uc.orderId as unknown as { planName?: string; paymentType?: string } | null;
        redemptions.push({
          id: String(uc._id),
          userName: user?.name || user?.email || "Tenant User",
          date: new Date(uc.createdAt || uc.usedAt).toLocaleDateString(),
          planName: ord?.planName || "Subscription Plan",
          paymentType: ord?.paymentType || "Payment Gateway",
        });
      }
    }

    return {
      success: true,
      coupon: {
        id: String(coupon._id),
        name: coupon.name,
        code: coupon.code,
        discount: coupon.discount,
        limit: coupon.limit,
        usedCount: coupon.usedCount || redemptions.length,
      },
      redemptions,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load coupon details";
    return { success: false, error: message };
  }
}

/**
 * Public action to validate a coupon and preview the calculated discount before payment.
 */
export async function validateCouponAction(
  code: string,
  orderAmount: number,
  userId?: string
): Promise<CouponValidationResult> {
  return validateCouponRules(code, orderAmount, userId);
}

/**
 * Server action to atomically redeem a coupon and log the redemption during checkout.
 */
export async function redeemCouponAction(data: {
  code: string;
  orderAmount: number;
  userId: string;
  orderId?: string;
}): Promise<RedeemCouponResult> {
  return redeemCoupon(data);
}

/**
 * Helper action to generate a fresh uppercase coupon code.
 */
export async function generateCouponCodeAction(
  prefix?: string
): Promise<{ success: boolean; code: string }> {
  const code = generateRandomCouponCode(prefix);
  return { success: true, code };
}

/**
 * Super Admin metrics action to aggregate coupon stats across all orders and redemptions.
 */
export async function getCouponStatsAction(): Promise<{
  success: boolean;
  data?: CouponStatsResult;
  error?: string;
}> {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const [totalCoupons, activeCoupons, totalRedemptions, ordersWithDiscount] = await Promise.all([
      Coupon.countDocuments(),
      Coupon.countDocuments({ isActive: true }),
      UserCoupon.countDocuments(),
      Order.find({ discountAmount: { $gt: 0 } }).select("discountAmount").lean(),
    ]);

    const totalDiscountGiven = ordersWithDiscount.reduce(
      (acc, curr) => acc + (curr.discountAmount || 0),
      0
    );

    return {
      success: true,
      data: {
        totalCoupons,
        activeCoupons,
        totalRedemptions,
        totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load coupon stats";
    return { success: false, error: message };
  }
}
