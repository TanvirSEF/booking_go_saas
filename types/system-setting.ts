import { z } from 'zod';

export type SystemSettingGroup =
  | 'brand'
  | 'system'
  | 'stripe'
  | 'paypal'
  | 'bank_transfer'
  | 'email'
  | 'storage'
  | 'recaptcha'
  | 'auth';

export const updateBrandSettingsSchema = z.object({
  title_text: z.string().min(1).max(100).trim().optional(),
  footer_text: z.string().max(255).trim().optional(),
  logo_dark: z.string().trim().optional(),
  logo_light: z.string().trim().optional(),
  favicon: z.string().trim().optional(),
  default_language: z.string().trim().optional(),
  landing_page_is_on: z.enum(['on', 'off']).optional(),
});

export const updateRegionalSettingsSchema = z.object({
  default_currency: z.string().min(1).max(10).trim().optional(),
  default_currency_symbol: z.string().min(1).max(10).trim().optional(),
  currency_symbol_position: z.enum(['pre', 'post']).optional(),
  currency_format: z.enum(['1', '2', '3']).optional(),
  date_format: z.string().trim().optional(),
  time_format: z.enum(['12', '24']).optional(),
  timezone: z.string().trim().optional(),
});

export const updateStripeSettingsSchema = z.object({
  stripe_is_on: z.enum(['on', 'off']).optional(),
  stripe_key: z.string().trim().optional(),
  stripe_secret: z.string().trim().optional(),
  stripe_webhook_secret: z.string().trim().optional(),
});

export const updatePaypalSettingsSchema = z.object({
  paypal_is_on: z.enum(['on', 'off']).optional(),
  paypal_client_id: z.string().trim().optional(),
  paypal_secret_key: z.string().trim().optional(),
  paypal_mode: z.enum(['sandbox', 'live']).optional(),
});

export const updateBankTransferSettingsSchema = z.object({
  bank_transfer_is_on: z.enum(['on', 'off']).optional(),
  bank_name: z.string().trim().optional(),
  account_number: z.string().trim().optional(),
  routing_number: z.string().trim().optional(),
  swift_code: z.string().trim().optional(),
  bank_guidelines: z.string().trim().optional(),
});

export const updateEmailSettingsSchema = z.object({
  mail_driver: z.string().trim().optional(),
  mail_host: z.string().trim().optional(),
  mail_port: z.union([z.string(), z.number()]).optional(),
  mail_username: z.string().trim().optional(),
  mail_password: z.string().trim().optional(),
  mail_encryption: z.enum(['tls', 'ssl', 'none']).optional(),
  mail_from_address: z.string().email().optional(),
  mail_from_name: z.string().trim().optional(),
});

export const updateStorageSettingsSchema = z.object({
  storage_type: z.enum(['local', 's3', 'wasabi']).optional(),
  s3_key: z.string().trim().optional(),
  s3_secret: z.string().trim().optional(),
  s3_region: z.string().trim().optional(),
  s3_bucket: z.string().trim().optional(),
  s3_url: z.string().trim().optional(),
  s3_endpoint: z.string().trim().optional(),
  max_upload_size_mb: z.union([z.string(), z.number()]).optional(),
});

export const updateRecaptchaSettingsSchema = z.object({
  recaptcha_is_on: z.enum(['on', 'off']).optional(),
  recaptcha_version: z.enum(['v2', 'v3']).optional(),
  recaptcha_site_key: z.string().trim().optional(),
  recaptcha_secret_key: z.string().trim().optional(),
});

export const updateAuthSettingsSchema = z.object({
  signup_is_on: z.enum(['on', 'off']).optional(),
  email_verification_is_on: z.enum(['on', 'off']).optional(),
  maintenance_mode_is_on: z.enum(['on', 'off']).optional(),
});

export const sendTestEmailSchema = z.object({
  testEmail: z.string().email('Please provide a valid recipient email address'),
});

export type UpdateBrandSettingsInput = z.infer<typeof updateBrandSettingsSchema>;
export type UpdateRegionalSettingsInput = z.infer<typeof updateRegionalSettingsSchema>;
export type UpdateStripeSettingsInput = z.infer<typeof updateStripeSettingsSchema>;
export type UpdatePaypalSettingsInput = z.infer<typeof updatePaypalSettingsSchema>;
export type UpdateBankTransferSettingsInput = z.infer<typeof updateBankTransferSettingsSchema>;
export type UpdateEmailSettingsInput = z.infer<typeof updateEmailSettingsSchema>;
export type UpdateStorageSettingsInput = z.infer<typeof updateStorageSettingsSchema>;
export type UpdateRecaptchaSettingsInput = z.infer<typeof updateRecaptchaSettingsSchema>;
export type UpdateAuthSettingsInput = z.infer<typeof updateAuthSettingsSchema>;
export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;

export interface PublicSystemSettingsDTO {
  titleText: string;
  footerText: string;
  logoDark: string;
  logoLight: string;
  favicon: string;
  defaultLanguage: string;
  landingPageIsOn: boolean;
  defaultCurrency: string;
  defaultCurrencySymbol: string;
  currencySymbolPosition: 'pre' | 'post';
  currencyFormat: string;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
  stripeIsOn: boolean;
  stripePublishableKey: string;
  paypalIsOn: boolean;
  paypalClientId: string;
  paypalMode: 'sandbox' | 'live';
  bankTransferIsOn: boolean;
  recaptchaIsOn: boolean;
  recaptchaSiteKey: string;
  recaptchaVersion: string;
  signupIsOn: boolean;
  emailVerificationIsOn: boolean;
  maintenanceModeIsOn: boolean;
}

export interface AdminSystemSettingsDTO {
  brand: Record<string, string>;
  system: Record<string, string>;
  stripe: Record<string, string>;
  paypal: Record<string, string>;
  bank_transfer: Record<string, string>;
  email: Record<string, string>;
  storage: Record<string, string>;
  recaptcha: Record<string, string>;
  auth: Record<string, string>;
}

export interface SystemSettingActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
