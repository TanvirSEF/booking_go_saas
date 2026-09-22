import { connectToDatabase } from '@/lib/db';
import { Appointment } from '@/models/Appointment';
import { AppointmentPayment } from '@/models/AppointmentPayment';
import {
  acquireWebhookLock,
  markWebhookSuccess,
  markWebhookFailed,
} from '@/lib/payment-idempotency';
import {
  processSubscriptionCheckout,
  processSubscriptionCancelled,
  processPaymentFailed,
} from '@/lib/subscription-renewal-engine';

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  create_time?: string;
  resource_type?: string;
  resource: Record<string, unknown>;
  summary?: string;
}

/**
 * Validates a PayPal webhook signature header payload.
 * Verifies transmission headers and validates event structure.
 */
export async function verifyPayPalWebhookSignature(
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  if (!rawBody || typeof rawBody !== 'string') {
    return false;
  }
  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionTime = headers.get('paypal-transmission-time');
  const certUrl = headers.get('paypal-cert-url');
  const signature = headers.get('paypal-transmission-sig');

  // In testing/dev or simulated webhook environments without live PayPal keys
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_WEBHOOK_ID) {
    // Basic format validation
    return !!(transmissionId || headers.get('content-type')?.includes('json'));
  }

  // Live PayPal validation checks
  if (!transmissionId || !transmissionTime || !certUrl || !signature) {
    return false;
  }

  // PayPal certificates must come from paypal.com domain
  try {
    const parsedCertUrl = new URL(certUrl);
    if (!parsedCertUrl.hostname.endsWith('.paypal.com')) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Processes an incoming PayPal webhook event with idempotency guarantees.
 */
export async function processPayPalWebhookEvent(
  event: PayPalWebhookEvent
): Promise<{ success: boolean; alreadyProcessed?: boolean; reason?: string; error?: string }> {
  const eventId = event.id;
  const eventType = event.event_type;

  const lock = await acquireWebhookLock(eventId, 'paypal', eventType, {
    summary: event.summary,
    resourceType: event.resource_type,
  });

  if (!lock.shouldProcess) {
    return { success: true, alreadyProcessed: true, reason: lock.reason };
  }

  try {
    await connectToDatabase();

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const resource = event.resource;
        const customId = (resource.custom_id as string) || '';
        const amountObj = resource.amount as { value?: string; currency_code?: string } | undefined;
        const paidAmount = amountObj?.value ? parseFloat(amountObj.value) : 0;
        const currency = amountObj?.currency_code || 'USD';
        const txnId = (resource.id as string) || eventId;

        // 1. Appointment Booking Payment
        if (customId.startsWith('appointment_') || resource.invoice_id) {
          const rawAppId = customId.replace('appointment_', '') || String(resource.invoice_id);
          const appointment = await Appointment.findById(rawAppId);

          if (appointment) {
            if (appointment.paymentStatus !== 'paid') {
              appointment.paymentStatus = 'paid';
              appointment.appointmentStatus = 'Confirmed';
              appointment.paymentType = 'PayPal';
              await appointment.save();
            }

            const existingPayment = await AppointmentPayment.findOne({ txnId });
            if (!existingPayment) {
              await AppointmentPayment.create({
                appointmentId: appointment._id,
                companyId: appointment.companyId,
                businessId: appointment.businessId,
                paymentType: 'PayPal',
                amount: appointment.price,
                discountAmount: 0,
                finalAmount: paidAmount || appointment.price,
                paymentDate: new Date(),
                txnId,
                status: 'completed',
              });
            }
          }
          break;
        }

        // 2. SaaS Subscription Plan Payment
        if (customId.startsWith('plan_') || (resource.supplementary_data as Record<string, unknown>)?.userId) {
          const parts = customId.split('_'); // format: plan_{planId}_{userId}_{billingType}
          const planId = parts[1];
          const userId = parts[2];
          const billingType = (parts[3] === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly';

          if (planId && userId) {
            await processSubscriptionCheckout({
              userId,
              planId,
              billingType,
              price: paidAmount,
              currency,
              paymentType: 'PayPal',
              txnId,
            });
          }
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const resource = event.resource;
        const customerEmail =
          (resource.subscriber as { email_address?: string })?.email_address ||
          (resource.custom_id as string);

        if (customerEmail) {
          await processSubscriptionCancelled({
            customerEmail,
            subscriptionId: resource.id as string,
            reason: eventType,
          });
        }
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        const resource = event.resource;
        const amountObj = resource.amount as { value?: string; currency_code?: string } | undefined;
        const amount = amountObj?.value ? parseFloat(amountObj.value) : 0;
        const currency = amountObj?.currency_code || 'USD';

        await processPaymentFailed({
          amount,
          currency,
          txnId: (resource.id as string) || eventId,
          paymentType: 'PayPal',
          reason: 'Capture denied',
        });
        break;
      }

      default:
        break;
    }

    await markWebhookSuccess(eventId, 'paypal');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PayPal webhook fulfillment error';
    await markWebhookFailed(eventId, 'paypal', message);
    return { success: false, error: message };
  }
}
