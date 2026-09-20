import Stripe from 'stripe';

function getEffectiveStripeKey(): string {
  return process.env.STRIPE_SECRET_KEY?.trim() || '';
}

// Dummy fallback key to allow safe module initialization during static build analysis
const BUILD_FALLBACK_KEY = 'sk_test_dummy_build_key_for_static_analysis_only';

let cachedStripe: Stripe | null = null;
let currentKey: string = '';

export function getOrCreateStripeInstance(): Stripe {
  const actualKey = getEffectiveStripeKey();
  const keyToUse = actualKey || BUILD_FALLBACK_KEY;

  if (!cachedStripe || currentKey !== keyToUse) {
    cachedStripe = new Stripe(keyToUse, {
      typescript: true,
      appInfo: {
        name: 'BookingGo SaaS',
        version: '0.0.1',
      },
    });
    currentKey = keyToUse;
  }
  return cachedStripe;
}

/**
 * Dynamically resolves a Stripe client instance at runtime.
 * Checks environment variables first, then queries MongoDB SystemSetting.
 */
export async function getStripeClient(): Promise<Stripe> {
  let key = getEffectiveStripeKey();
  if (!key) {
    try {
      const { getSystemSetting } = await import('@/lib/system-settings');
      const dbKey = await getSystemSetting('stripe_secret');
      if (dbKey && dbKey.trim()) {
        key = dbKey.trim();
      }
    } catch {
      // Graceful fallback if database is unavailable
    }
  }

  if (!key) {
    throw new Error('Stripe is not configured. Please configure your Stripe Secret Key in Super Admin Settings or environment variables.');
  }

  return new Stripe(key, {
    typescript: true,
    appInfo: {
      name: 'BookingGo SaaS',
      version: '0.0.1',
    },
  });
}

/**
 * Safe Proxy wrapper for backward compatibility.
 * Allows `import { stripe } from '@/lib/stripe'` without crashing at module evaluation time.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop: string | symbol) {
    const instance = getOrCreateStripeInstance();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export default stripe;
