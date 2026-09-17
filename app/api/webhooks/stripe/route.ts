import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Coupon } from "@/models/Coupon";
import { UserCoupon } from "@/models/UserCoupon";
import { Appointment } from "@/models/Appointment";
import { AppointmentPayment } from "@/models/AppointmentPayment";
import { Business } from "@/models/Business";
import { Service } from "@/models/Service";
import { sendPaymentReceiptEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET in environment");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error(`⚠️ Stripe webhook signature error: ${message}`);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await connectToDatabase();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        const {
          userId,
          planId,
          planName,
          billingType = "monthly",
          discountAmount = "0",
          couponCode,
          couponId,
        } = metadata;

        // 1. Handle Appointment Booking Payments
        if (metadata.type === "appointment" || metadata.appointmentId) {
          const appointmentId = metadata.appointmentId;
          const appointment = await Appointment.findById(appointmentId);

          if (appointment) {
            const paidAmount = session.amount_total
              ? session.amount_total / 100
              : appointment.price;

            if (appointment.paymentStatus !== "paid") {
              appointment.paymentStatus = "paid";
              appointment.appointmentStatus = "Confirmed";
              appointment.paymentType = "Stripe";

              const timestamp = new Date().toLocaleString();
              const log = `[${timestamp}] Stripe payment confirmed via Webhook (Txn: ${session.payment_intent || session.id})`;
              appointment.notes = appointment.notes ? `${appointment.notes}\n${log}` : log;
              await appointment.save();
            }

            const txnId = (session.payment_intent as string) || session.id;
            const existingPayment = await AppointmentPayment.findOne({ txnId });

            if (!existingPayment) {
              await AppointmentPayment.create({
                appointmentId: appointment._id,
                companyId: appointment.companyId,
                businessId: appointment.businessId,
                paymentType: "Stripe",
                amount: appointment.price,
                discountAmount: Number(metadata.discountAmount || 0),
                finalAmount: paidAmount,
                paymentDate: new Date(),
                txnId,
                receiptUrl: session.customer_details?.email || "",
                status: "completed",
              });

              // Asynchronously dispatch payment receipt email
              void (async () => {
                try {
                  const [biz, svc] = await Promise.all([
                    Business.findById(appointment.businessId).select("name").lean(),
                    Service.findById(appointment.serviceId).select("name").lean(),
                  ]);
                  await sendPaymentReceiptEmail({
                    customerName: appointment.name,
                    customerEmail: appointment.email,
                    appointmentNumber: appointment.appointmentNumber,
                    serviceName: svc?.name || "Appointment Service",
                    amount: appointment.price,
                    discountAmount: Number(metadata.discountAmount || 0),
                    finalAmount: paidAmount,
                    paymentType: "Stripe",
                    businessName: biz?.name || "BookingGo",
                  });
                } catch (e) {
                  console.error("[Mailer] Stripe receipt email error:", e);
                }
              })();

              if (metadata.couponId) {
                await Coupon.findByIdAndUpdate(metadata.couponId, {
                  $inc: { usedCount: 1 },
                });
              }
            }
          }
          break;
        }

        // 2. Handle SaaS Plan Subscription Payments
        if (userId && planId) {
          const isYearly = billingType === "yearly";
          const expireDate = new Date();
          if (isYearly) {
            expireDate.setFullYear(expireDate.getFullYear() + 1);
          } else {
            expireDate.setDate(expireDate.getDate() + 30);
          }

          // 1. Update User active subscription
          await User.findByIdAndUpdate(userId, {
            activePlanId: planId,
            billingType: isYearly ? "yearly" : "monthly",
            planExpireDate: expireDate,
            isTrialDone: true,
          });

          // 2. Create Order record
          const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const paidAmount = session.amount_total
            ? session.amount_total / 100
            : 0;

          const order = await Order.create({
            orderNumber,
            companyId: userId,
            planId,
            planName: planName || "SaaS Subscription",
            billingCycle: isYearly ? "yearly" : "monthly",
            price: paidAmount,
            discountAmount: Number(discountAmount) || 0,
            currency: (session.currency || "USD").toUpperCase(),
            paymentType: "Stripe",
            paymentStatus: "succeeded",
            txnId: session.id,
            couponCode: couponCode || undefined,
          });

          // 3. Track coupon usage if redeemed
          if (couponId) {
            await Coupon.findByIdAndUpdate(couponId, {
              $inc: { usedCount: 1 },
            });
            await UserCoupon.create({
              userId,
              couponId,
              orderId: order._id,
              usedAt: new Date(),
            });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // Recurring invoice renewal
        if (invoice.customer_email) {
          const user = await User.findOne({
            email: invoice.customer_email.toLowerCase().trim(),
          });

          if (user && user.activePlanId) {
            const isYearly = user.billingType === "yearly";
            const baseDate = user.planExpireDate && user.planExpireDate > new Date()
              ? new Date(user.planExpireDate)
              : new Date();

            if (isYearly) {
              baseDate.setFullYear(baseDate.getFullYear() + 1);
            } else {
              baseDate.setDate(baseDate.getDate() + 30);
            }

            user.planExpireDate = baseDate;
            await user.save();

            const orderNumber = `ORD-REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const paidAmount = invoice.amount_paid
              ? invoice.amount_paid / 100
              : 0;

            await Order.create({
              orderNumber,
              companyId: user._id,
              planId: user.activePlanId,
              planName: "SaaS Renewal",
              billingCycle: user.billingType || "monthly",
              price: paidAmount,
              discountAmount: 0,
              currency: (invoice.currency || "USD").toUpperCase(),
              paymentType: "Stripe",
              paymentStatus: "succeeded",
              txnId: invoice.id,
              receiptUrl: invoice.hosted_invoice_url || undefined,
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`ℹ️ Stripe subscription deleted: ${subscription.id}`);
        break;
      }

      default: {
        // Unhandled event types acknowledged with 200
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    console.error(`❌ Webhook fulfillment error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
