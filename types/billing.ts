export type BillingCycle = 'monthly' | 'yearly';

export interface CreateCheckoutSessionInput {
  planId: string;
  billingType: BillingCycle;
  couponCode?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResult {
  success: boolean;
  url?: string;
  error?: string;
  isFreePlan?: boolean;
  orderId?: string;
}

export interface StripeWebhookResponse {
  received: boolean;
  error?: string;
}
