import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { connectToDatabase } from '@/lib/db';
import { Appointment } from '@/models/Appointment';
import { AppointmentPayment } from '@/models/AppointmentPayment';
import { Business } from '@/models/Business';
import { Service } from '@/models/Service';
import { Coupon } from '@/models/Coupon';
import { sendPaymentReceiptEmail } from '@/lib/mailer';
import {
  acquireWebhookLock,
  markWebhookSuccess,
  markWebhookFailed,
} from '@/lib/payment-idempotency';
import {
  processSubscriptionCheckout,
  processRecurringRenewalInvoice,
  processSubscriptionCancelled,
  processPaymentFailed,
} from '@/lib/subscription-renewal-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    try {
      const { getSystemSetting } = await import('@/lib/system-settings');
      webhookSecret = (await getSystemSetting('stripe_webhook_secret'))?.trim();
    } catch {
      // Graceful fallback
    }
  }

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET in environment or database settings');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    console.error(`⚠️ Stripe webhook signature error: ${message}`);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Idempotency check: acquire atomic lock for this event ID
  const lock = await acquireWebhookLock(event.id, 'stripe', event.type);
  if (!lock.shouldProcess) {
    return NextResponse.json(
      { received: true, alreadyProcessed: true, reason: lock.reason },
      { status: 200 }
    );
  }

  try {
    await connectToDatabase();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        const {
          userId,
          planId,
          planName,
          billingType = 'monthly',
          discountAmount = '0',
          couponCode,
          couponId,
        } = metadata;

        // 1. Handle Appointment Booking Payments
        if (metadata.type === 'appointment' || metadata.appointmentId) {
          const appointmentId = metadata.appointmentId;
          const appointment = await Appointment.findById(appointmentId);

          if (appointment) {
            const paidAmount = session.amount_total
              ? session.amount_total / 100
              : appointment.price;

            if (appointment.paymentStatus !== 'paid') {
              appointment.paymentStatus = 'paid';
              appointment.appointmentStatus = 'Confirmed';
              appointment.paymentType = 'Stripe';

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
                paymentType: 'Stripe',
                amount: appointment.price,
                discountAmount: Number(metadata.discountAmount || 0),
                finalAmount: paidAmount,
                paymentDate: new Date(),
                txnId,
                receiptUrl: session.customer_details?.email || '',
                status: 'completed',
              });

              // Asynchronously dispatch payment receipt email
              void (async () => {
                try {
                  const [biz, svc] = await Promise.all([
                    Business.findById(appointment.businessId).select('name').lean(),
                    Service.findById(appointment.serviceId).select('name').lean(),
                  ]);
                  await sendPaymentReceiptEmail({
                    customerName: appointment.name,
                    customerEmail: appointment.email,
                    appointmentNumber: appointment.appointmentNumber,
                    serviceName: svc?.name || 'Appointment Service',
                    amount: appointment.price,
                    discountAmount: Number(metadata.discountAmount || 0),
                    finalAmount: paidAmount,
                    paymentType: 'Stripe',
                    businessName: biz?.name || 'BookingGo',
                  });
                } catch (e) {
                  console.error('[Mailer] Stripe receipt email error:', e);
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

        // 2. Handle SaaS Plan Subscription Payments via Shared Renewal Engine
        if (userId && planId) {
          const paidAmount = session.amount_total
            ? session.amount_total / 100
            : 0;

          await processSubscriptionCheckout({
            userId,
            planId,
            planName: planName || 'SaaS Subscription',
            billingType: billingType === 'yearly' ? 'yearly' : 'monthly',
            price: paidAmount,
            discountAmount: Number(discountAmount) || 0,
            currency: (session.currency || 'USD').toUpperCase(),
            paymentType: 'Stripe',
            txnId: session.id,
            couponCode: couponCode || undefined,
            couponId: couponId || undefined,
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.customer_email) {
          const paidAmount = invoice.amount_paid
            ? invoice.amount_paid / 100
            : 0;

          await processRecurringRenewalInvoice({
            customerEmail: invoice.customer_email,
            amountPaid: paidAmount,
            currency: (invoice.currency || 'USD').toUpperCase(),
            invoiceId: invoice.id,
            hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
            paymentType: 'Stripe',
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await processSubscriptionCancelled({
          subscriptionId: subscription.id,
          reason: 'Stripe customer subscription deleted',
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const amount = invoice.amount_due ? invoice.amount_due / 100 : 0;
        await processPaymentFailed({
          customerEmail: invoice.customer_email || undefined,
          amount,
          currency: (invoice.currency || 'USD').toUpperCase(),
          txnId: invoice.id,
          paymentType: 'Stripe',
          reason: 'Invoice payment failed',
        });
        break;
      }

      default:
        break;
    }

    await markWebhookSuccess(event.id, 'stripe');
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook fulfillment error';
    await markWebhookFailed(event.id, 'stripe', message);
    console.error(`❌ Webhook fulfillment error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
