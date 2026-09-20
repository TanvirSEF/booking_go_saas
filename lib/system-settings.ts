import { connectToDatabase } from '@/lib/db';
import { SystemSetting, type SystemSettingGroup } from '@/models/SystemSetting';
import type { PublicSystemSettingsDTO, AdminSystemSettingsDTO } from '@/types/system-setting';

export interface SettingDefinition {
  key: string;
  value: string;
  group: SystemSettingGroup;
  isPublic: boolean;
  isSensitive: boolean;
  description: string;
  envFallback?: string;
}

export const MASKED_SECRET = '••••••••';

export const DEFAULT_SYSTEM_SETTINGS: SettingDefinition[] = [
  // 1. Brand
  {
    key: 'title_text',
    value: 'BookingGo',
    group: 'brand',
    isPublic: true,
    isSensitive: false,
    description: 'Public application title text',
    envFallback: 'NEXT_PUBLIC_APP_NAME',
  },
  {
    key: 'footer_text',
    value: '© 2026 BookingGo SaaS. All rights reserved.',
    group: 'brand',
    isPublic: true,
    isSensitive: false,
    description: 'Footer copyright label',
  },
  {
    key: 'logo_dark',
    value: '/images/logo-dark.png',
    group: 'brand',
    isPublic: true,
    isSensitive: false,
    description: 'Main brand dark logo URL',
  },
  {
    key: 'logo_light',
    value: '/images/logo-light.png',
    group: 'brand',
    isPublic: true,
    isSensitive: false,
    description: 'Main brand light logo URL',
  },
  {
    key: 'favicon',
    value: '/favicon.ico',
    group: 'brand',
    isPublic: true,
    isSensitive: false,
    description: 'Favicon icon URL',
  },
  {
    key: 'default_language',
    value: 'en',
    group: 'brand',
    isPublic: true,
    isSensitive: false,
    description: 'Default platform fallback locale',
  },
  {
    key: 'landing_page_is_on',
    value: 'on',
    group: 'brand',
    isPublic: true,
    isSensitive: false,
    description: 'Toggle visibility of root SaaS marketing landing page',
  },

  // 2. Regional & System
  {
    key: 'default_currency',
    value: 'USD',
    group: 'system',
    isPublic: true,
    isSensitive: false,
    description: 'Default platform currency ISO code',
  },
  {
    key: 'default_currency_symbol',
    value: '$',
    group: 'system',
    isPublic: true,
    isSensitive: false,
    description: 'Default platform currency symbol',
  },
  {
    key: 'currency_symbol_position',
    value: 'pre',
    group: 'system',
    isPublic: true,
    isSensitive: false,
    description: 'Placement of currency symbol (pre or post)',
  },
  {
    key: 'currency_format',
    value: '2',
    group: 'system',
    isPublic: true,
    isSensitive: false,
    description: 'Number of decimal positions in formatted prices',
  },
  {
    key: 'date_format',
    value: 'YYYY-MM-DD',
    group: 'system',
    isPublic: true,
    isSensitive: false,
    description: 'Global standard date display format',
  },
  {
    key: 'time_format',
    value: '12',
    group: 'system',
    isPublic: true,
    isSensitive: false,
    description: 'Standard 12-hour or 24-hour time presentation',
  },
  {
    key: 'timezone',
    value: 'UTC',
    group: 'system',
    isPublic: true,
    isSensitive: false,
    description: 'Platform baseline timezone',
  },

  // 3. Stripe Payment Gateway
  {
    key: 'stripe_is_on',
    value: 'off',
    group: 'stripe',
    isPublic: true,
    isSensitive: false,
    description: 'Enable Stripe for subscription billing',
  },
  {
    key: 'stripe_key',
    value: '',
    group: 'stripe',
    isPublic: true,
    isSensitive: false,
    description: 'Stripe Publishable Key',
    envFallback: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  },
  {
    key: 'stripe_secret',
    value: '',
    group: 'stripe',
    isPublic: false,
    isSensitive: true,
    description: 'Stripe Secret Key',
    envFallback: 'STRIPE_SECRET_KEY',
  },
  {
    key: 'stripe_webhook_secret',
    value: '',
    group: 'stripe',
    isPublic: false,
    isSensitive: true,
    description: 'Stripe Webhook Signing Secret',
    envFallback: 'STRIPE_WEBHOOK_SECRET',
  },

  // 4. PayPal Payment Gateway
  {
    key: 'paypal_is_on',
    value: 'off',
    group: 'paypal',
    isPublic: true,
    isSensitive: false,
    description: 'Enable PayPal for subscription billing',
  },
  {
    key: 'paypal_client_id',
    value: '',
    group: 'paypal',
    isPublic: true,
    isSensitive: false,
    description: 'PayPal Client ID',
    envFallback: 'PAYPAL_CLIENT_ID',
  },
  {
    key: 'paypal_secret_key',
    value: '',
    group: 'paypal',
    isPublic: false,
    isSensitive: true,
    description: 'PayPal Secret Key',
    envFallback: 'PAYPAL_SECRET_KEY',
  },
  {
    key: 'paypal_mode',
    value: 'sandbox',
    group: 'paypal',
    isPublic: true,
    isSensitive: false,
    description: 'PayPal execution environment (sandbox or live)',
  },

  // 5. Bank Transfer / Offline
  {
    key: 'bank_transfer_is_on',
    value: 'off',
    group: 'bank_transfer',
    isPublic: true,
    isSensitive: false,
    description: 'Enable offline Bank Transfer for plans and appointments',
  },
  {
    key: 'bank_name',
    value: '',
    group: 'bank_transfer',
    isPublic: true,
    isSensitive: false,
    description: 'Receiving Bank Name',
  },
  {
    key: 'account_number',
    value: '',
    group: 'bank_transfer',
    isPublic: true,
    isSensitive: false,
    description: 'Receiving Account Number or IBAN',
  },
  {
    key: 'routing_number',
    value: '',
    group: 'bank_transfer',
    isPublic: true,
    isSensitive: false,
    description: 'Routing Number / Sort Code',
  },
  {
    key: 'swift_code',
    value: '',
    group: 'bank_transfer',
    isPublic: true,
    isSensitive: false,
    description: 'SWIFT / BIC Code',
  },
  {
    key: 'bank_guidelines',
    value: 'Please transfer the plan total and upload your transaction receipt.',
    group: 'bank_transfer',
    isPublic: true,
    isSensitive: false,
    description: 'Instructions presented to user during bank transfer',
  },

  // 6. Email / SMTP
  {
    key: 'mail_driver',
    value: 'smtp',
    group: 'email',
    isPublic: false,
    isSensitive: false,
    description: 'Email transport driver',
  },
  {
    key: 'mail_host',
    value: 'smtp.mailtrap.io',
    group: 'email',
    isPublic: false,
    isSensitive: false,
    description: 'SMTP Server Hostname',
    envFallback: 'SMTP_HOST',
  },
  {
    key: 'mail_port',
    value: '587',
    group: 'email',
    isPublic: false,
    isSensitive: false,
    description: 'SMTP Server Port',
    envFallback: 'SMTP_PORT',
  },
  {
    key: 'mail_username',
    value: '',
    group: 'email',
    isPublic: false,
    isSensitive: false,
    description: 'SMTP Server Username',
    envFallback: 'SMTP_USER',
  },
  {
    key: 'mail_password',
    value: '',
    group: 'email',
    isPublic: false,
    isSensitive: true,
    description: 'SMTP Server Password',
    envFallback: 'SMTP_PASSWORD',
  },
  {
    key: 'mail_encryption',
    value: 'tls',
    group: 'email',
    isPublic: false,
    isSensitive: false,
    description: 'SMTP Encryption protocol (tls, ssl, none)',
  },
  {
    key: 'mail_from_address',
    value: 'notifications@bookinggo.saas',
    group: 'email',
    isPublic: false,
    isSensitive: false,
    description: 'Default sender email address',
    envFallback: 'SMTP_FROM_EMAIL',
  },
  {
    key: 'mail_from_name',
    value: 'BookingGo Platform',
    group: 'email',
    isPublic: false,
    isSensitive: false,
    description: 'Default sender display name',
    envFallback: 'SMTP_FROM_NAME',
  },

  // 7. Storage Engine
  {
    key: 'storage_type',
    value: 'local',
    group: 'storage',
    isPublic: true,
    isSensitive: false,
    description: 'Active storage driver (local, s3, wasabi)',
  },
  {
    key: 's3_key',
    value: '',
    group: 'storage',
    isPublic: false,
    isSensitive: false,
    description: 'AWS S3 Access Key',
    envFallback: 'AWS_ACCESS_KEY_ID',
  },
  {
    key: 's3_secret',
    value: '',
    group: 'storage',
    isPublic: false,
    isSensitive: true,
    description: 'AWS S3 Secret Access Key',
    envFallback: 'AWS_SECRET_ACCESS_KEY',
  },
  {
    key: 's3_region',
    value: 'us-east-1',
    group: 'storage',
    isPublic: false,
    isSensitive: false,
    description: 'AWS S3 Region',
    envFallback: 'AWS_REGION',
  },
  {
    key: 's3_bucket',
    value: '',
    group: 'storage',
    isPublic: false,
    isSensitive: false,
    description: 'AWS S3 Bucket Name',
    envFallback: 'AWS_BUCKET',
  },
  {
    key: 's3_url',
    value: '',
    group: 'storage',
    isPublic: false,
    isSensitive: false,
    description: 'AWS S3 Custom CDN / Public URL',
  },
  {
    key: 's3_endpoint',
    value: '',
    group: 'storage',
    isPublic: false,
    isSensitive: false,
    description: 'Custom S3 Endpoint (for Wasabi / MinIO)',
  },
  {
    key: 'max_upload_size_mb',
    value: '10',
    group: 'storage',
    isPublic: true,
    isSensitive: false,
    description: 'Max file upload size in megabytes',
  },

  // 8. Security & Google reCAPTCHA
  {
    key: 'recaptcha_is_on',
    value: 'off',
    group: 'recaptcha',
    isPublic: true,
    isSensitive: false,
    description: 'Enable Google reCAPTCHA on public forms',
  },
  {
    key: 'recaptcha_version',
    value: 'v2',
    group: 'recaptcha',
    isPublic: true,
    isSensitive: false,
    description: 'reCAPTCHA Version (v2 or v3)',
  },
  {
    key: 'recaptcha_site_key',
    value: '',
    group: 'recaptcha',
    isPublic: true,
    isSensitive: false,
    description: 'Google reCAPTCHA Site Key',
    envFallback: 'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',
  },
  {
    key: 'recaptcha_secret_key',
    value: '',
    group: 'recaptcha',
    isPublic: false,
    isSensitive: true,
    description: 'Google reCAPTCHA Secret Key',
    envFallback: 'RECAPTCHA_SECRET_KEY',
  },

  // 9. Auth & User Access
  {
    key: 'signup_is_on',
    value: 'on',
    group: 'auth',
    isPublic: true,
    isSensitive: false,
    description: 'Enable public tenant company registration',
  },
  {
    key: 'email_verification_is_on',
    value: 'off',
    group: 'auth',
    isPublic: true,
    isSensitive: false,
    description: 'Require verified email before allowing login',
  },
  {
    key: 'maintenance_mode_is_on',
    value: 'off',
    group: 'auth',
    isPublic: true,
    isSensitive: false,
    description: 'Enable maintenance mode for non-super-admin users',
  },
];

/**
 * Initializes and seeds missing default system settings in MongoDB
 */
export async function ensureDefaultSystemSettingsSeeded(): Promise<void> {
  await connectToDatabase();

  const bulkOps = DEFAULT_SYSTEM_SETTINGS.map((setting) => ({
    updateOne: {
      filter: { key: setting.key },
      update: {
        $setOnInsert: {
          key: setting.key,
          value: setting.envFallback && process.env[setting.envFallback]
            ? (process.env[setting.envFallback] as string)
            : setting.value,
          group: setting.group,
          isPublic: setting.isPublic,
          isSensitive: setting.isSensitive,
          description: setting.description,
        },
      },
      upsert: true,
    },
  }));

  if (bulkOps.length > 0) {
    await SystemSetting.bulkWrite(bulkOps);
  }
}

/**
 * Fetches single system setting by key with optional fallback
 */
export async function getSystemSetting(key: string, fallback = ''): Promise<string> {
  await connectToDatabase();
  const setting = await SystemSetting.findOne({ key }).lean();
  if (setting && setting.value !== undefined && setting.value !== null) {
    return setting.value;
  }
  return fallback;
}

/**
 * Returns key-value record for a specific group of settings
 */
export async function getSystemSettingsByGroup(
  group: SystemSettingGroup
): Promise<Record<string, string>> {
  await connectToDatabase();
  await ensureDefaultSystemSettingsSeeded();

  const settings = await SystemSetting.find({ group }).lean();
  const result: Record<string, string> = {};
  for (const s of settings) {
    result[s.key] = s.value;
  }
  return result;
}

/**
 * Returns safe public settings for unauthenticated pages
 */
export async function getPublicSystemSettings(): Promise<PublicSystemSettingsDTO> {
  await connectToDatabase();
  await ensureDefaultSystemSettingsSeeded();

  const settings = await SystemSetting.find({ isPublic: true }).lean();
  const map = new Map<string, string>();
  for (const s of settings) {
    map.set(s.key, s.value);
  }

  return {
    titleText: map.get('title_text') || 'BookingGo',
    footerText: map.get('footer_text') || '© 2026 BookingGo SaaS. All rights reserved.',
    logoDark: map.get('logo_dark') || '/images/logo-dark.png',
    logoLight: map.get('logo_light') || '/images/logo-light.png',
    favicon: map.get('favicon') || '/favicon.ico',
    defaultLanguage: map.get('default_language') || 'en',
    landingPageIsOn: map.get('landing_page_is_on') !== 'off',
    defaultCurrency: map.get('default_currency') || 'USD',
    defaultCurrencySymbol: map.get('default_currency_symbol') || '$',
    currencySymbolPosition: (map.get('currency_symbol_position') as 'pre' | 'post') || 'pre',
    currencyFormat: map.get('currency_format') || '2',
    dateFormat: map.get('date_format') || 'YYYY-MM-DD',
    timeFormat: map.get('time_format') || '12',
    timezone: map.get('timezone') || 'UTC',
    stripeIsOn: map.get('stripe_is_on') === 'on',
    stripePublishableKey: map.get('stripe_key') || '',
    paypalIsOn: map.get('paypal_is_on') === 'on',
    paypalClientId: map.get('paypal_client_id') || '',
    paypalMode: (map.get('paypal_mode') as 'sandbox' | 'live') || 'sandbox',
    bankTransferIsOn: map.get('bank_transfer_is_on') === 'on',
    recaptchaIsOn: map.get('recaptcha_is_on') === 'on',
    recaptchaSiteKey: map.get('recaptcha_site_key') || '',
    recaptchaVersion: map.get('recaptcha_version') || 'v2',
    signupIsOn: map.get('signup_is_on') !== 'off',
    emailVerificationIsOn: map.get('email_verification_is_on') === 'on',
    maintenanceModeIsOn: map.get('maintenance_mode_is_on') === 'on',
  };
}

/**
 * Returns all settings grouped for Super Admin view with secrets masked
 */
export async function getAllSystemSettingsForAdmin(): Promise<AdminSystemSettingsDTO> {
  await connectToDatabase();
  await ensureDefaultSystemSettingsSeeded();

  const settings = await SystemSetting.find().lean();

  const grouped: AdminSystemSettingsDTO = {
    brand: {},
    system: {},
    stripe: {},
    paypal: {},
    bank_transfer: {},
    email: {},
    storage: {},
    recaptcha: {},
    auth: {},
  };

  for (const s of settings) {
    if (grouped[s.group]) {
      // Mask sensitive secret values for admin display
      if (s.isSensitive && s.value && s.value.trim() !== '') {
        grouped[s.group][s.key] = MASKED_SECRET;
      } else {
        grouped[s.group][s.key] = s.value;
      }
    }
  }

  return grouped;
}
