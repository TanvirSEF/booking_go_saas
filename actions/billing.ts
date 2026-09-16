"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { Plan } from "@/models/Plan";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Coupon } from "@/models/Coupon";
import { UserCoupon } from "@/models/UserCoupon";
import type {
  CreateCheckoutSessionInput,
  CheckoutSessionResult,
} from "@/types/billing";

export async function createStripeCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CheckoutSessionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Please log in to continue." };
    }

    if (!input.planId) {
      return { success: false, error: "Plan ID is required." };
    }

    await connectToDatabase();

    const plan = await Plan.findById(input.planId).lean();
    if (!plan) {
      return { success: false, error: "Selected plan was not found." };
    }

    if (!plan.isEnabled) {
      return { success: false, error: "This plan is currently not available." };
    }

    const billingType = input.billingType === "yearly" ? "yearly" : "monthly";
    const rawPrice =
      billingType === "yearly"
        ? plan.packagePriceYearly
        : plan.packagePriceMonthly;

    let discountAmount = 0;
    let validCouponId: string | null = null;
    let couponCodeClean = "";

    if (input.couponCode && input.couponCode.trim()) {
      couponCodeClean = input.couponCode.trim().toUpperCase();
      const coupon = await Coupon.findOne({
        code: couponCodeClean,
        isActive: true,
      });

      if (!coupon) {
        return { success: false, error: `Coupon code "${couponCodeClean}" is invalid.` };
      }

      if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
        return { success: false, error: `Coupon code "${couponCodeClean}" has expired.` };
      }

      if (coupon.limit > 0 && coupon.usedCount >= coupon.limit) {
        return { success: false, error: `Coupon code "${couponCodeClean}" has reached its redemption limit.` };
      }

      validCouponId = String(coupon._id);

      if (coupon.discountType === "flat") {
        discountAmount = Math.min(coupon.discount, rawPrice);
      } else {
        discountAmount = (rawPrice * coupon.discount) / 100;
      }
    }

    const finalPrice = Math.max(0, rawPrice - discountAmount);

    // Free Plan or $0 activation flow
    if (plan.isFreePlan || finalPrice <= 0) {
      const expireDate = new Date();
      if (billingType === "yearly") {
        expireDate.setFullYear(expireDate.getFullYear() + 1);
      } else {
        expireDate.setDate(expireDate.getDate() + 30);
      }

      await User.findByIdAndUpdate(session.user.id, {
        activePlanId: plan._id,
        billingType,
        planExpireDate: expireDate,
        isTrialDone: true,
      });

      const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const order = await Order.create({
        orderNumber,
        companyId: session.user.id,
        planId: plan._id,
        planName: plan.name,
        billingCycle: billingType,
        price: 0,
        discountAmount,
        currency: "USD",
        paymentType: "Free Plan",
        paymentStatus: "succeeded",
        couponCode: couponCodeClean || undefined,
      });

      if (validCouponId) {
        await Coupon.findByIdAndUpdate(validCouponId, {
          $inc: { usedCount: 1 },
        });
        await UserCoupon.create({
          userId: session.user.id,
          couponId: validCouponId,
          orderId: order._id,
          usedAt: new Date(),
        });
      }

      revalidatePath("/dashboard");
      return {
        success: true,
        isFreePlan: true,
        orderId: String(order._id),
        url: "/dashboard?payment=free_activated",
      };
    }

    // Paid Plan - Stripe Checkout Session
    const baseUrl =
      process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "http://localhost:3000";
    const successUrl =
      input.successUrl ||
      `${baseUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      input.cancelUrl || `${baseUrl}/dashboard?payment=cancelled`;

    const unitAmountCents = Math.round(finalPrice * 100);

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: session.user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${plan.name} (${billingType === "yearly" ? "Yearly" : "Monthly"})`,
              description:
                plan.description ||
                `Subscription to ${plan.name} billed ${billingType}`,
            },
            unit_amount: unitAmountCents,
            recurring: {
              interval: billingType === "yearly" ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        planId: String(plan._id),
        planName: plan.name,
        billingType,
        rawPrice: String(rawPrice),
        discountAmount: String(discountAmount),
        couponCode: couponCodeClean,
        couponId: validCouponId || "",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return {
      success: true,
      url: checkoutSession.url || undefined,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to create checkout session";
    return { success: false, error: errorMsg };
  }
}
