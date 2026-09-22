import { NextResponse } from 'next/server';
import {
  verifyPayPalWebhookSignature,
  processPayPalWebhookEvent,
  type PayPalWebhookEvent,
} from '@/lib/paypal-webhook-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const isValid = await verifyPayPalWebhookSignature(req.headers, rawBody);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid PayPal webhook signature or missing transmission headers' },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody) as PayPalWebhookEvent;
    const result = await processPayPalWebhookEvent(event);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(
      { received: true, alreadyProcessed: result.alreadyProcessed },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PayPal webhook processing failure';
    console.error(`❌ PayPal webhook error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
