import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ Warning: STRIPE_SECRET_KEY is not defined in environment variables.');
}

export const stripe = new Stripe(stripeSecretKey, {
  typescript: true,
  appInfo: {
    name: 'BookingGo SaaS',
    version: '0.0.1',
  },
});

export default stripe;
