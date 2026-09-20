import { connectToDatabase } from '@/lib/db';
import { SystemSetting } from '@/models/SystemSetting';
import type {
  RecaptchaVerifyOptions,
  RecaptchaVerifyResult,
  PublicRecaptchaConfigDTO,
} from '@/types/recaptcha';

export interface RecaptchaInternalConfig {
  isEnabled: boolean;
  version: 'v2' | 'v3';
  siteKey: string;
  secretKey: string;
}

interface GoogleSiteVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

/**
 * Resolves reCAPTCHA configuration from MongoDB SystemSetting with environment variable fallbacks.
 */
export async function getRecaptchaConfig(): Promise<RecaptchaInternalConfig> {
  await connectToDatabase();

  const settings = await SystemSetting.find({ group: 'recaptcha' }).lean();
  const map = new Map<string, string>();
  for (const s of settings) {
    map.set(s.key, s.value);
  }

  const isEnabledFromDb = map.get('recaptcha_is_on') === 'on';
  const version = (map.get('recaptcha_version') as 'v2' | 'v3') || 'v2';
  const siteKey =
    map.get('recaptcha_site_key') || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
  const secretKey =
    map.get('recaptcha_secret_key') || process.env.RECAPTCHA_SECRET_KEY || '';

  const isEnabled = isEnabledFromDb || process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === 'true';

  return {
    isEnabled,
    version,
    siteKey,
    secretKey,
  };
}

/**
 * Checks whether reCAPTCHA verification is actively enforced.
 */
export async function isRecaptchaEnabled(): Promise<boolean> {
  const config = await getRecaptchaConfig();
  return Boolean(config.isEnabled && config.secretKey);
}

/**
 * Returns public reCAPTCHA details for client components without exposing secret keys.
 */
export async function getPublicRecaptchaConfig(): Promise<PublicRecaptchaConfigDTO> {
  const config = await getRecaptchaConfig();
  return {
    isEnabled: Boolean(config.isEnabled && config.siteKey),
    version: config.version,
    siteKey: config.siteKey,
  };
}

/**
 * Verifies a client-provided reCAPTCHA response token against Google's verification API.
 * - If reCAPTCHA is turned off or not configured, gracefully bypasses with { success: true, bypassed: true }.
 * - Enforces 5-second timeout to prevent blocking user transactions.
 * - Handles both reCAPTCHA v2 (checkbox) and v3 (invisible score & action validation).
 */
export async function verifyRecaptchaToken(
  token?: string | null,
  options?: RecaptchaVerifyOptions
): Promise<RecaptchaVerifyResult> {
  try {
    const config = await getRecaptchaConfig();

    // 1. Zero-configuration or disabled bypass
    if (!config.isEnabled || !config.secretKey) {
      return { success: true, bypassed: true };
    }

    // 2. Token presence check when active
    if (!token || !token.trim()) {
      return {
        success: false,
        error: 'reCAPTCHA verification token is required.',
      };
    }

    // 3. Dispatch validation to Google SiteVerify API
    const formData = new URLSearchParams();
    formData.append('secret', config.secretKey);
    formData.append('response', token.trim());

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(5000), // 5s timeout guard
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Google reCAPTCHA verification service returned status ${response.status}.`,
      };
    }

    const data: GoogleSiteVerifyResponse = await response.json();

    if (!data.success) {
      const errorCodes = data['error-codes']?.join(', ') || 'invalid-token';
      return {
        success: false,
        error: `reCAPTCHA verification failed (${errorCodes}). Please try again.`,
      };
    }

    // 4. Version 3 Score & Action validation
    if (config.version === 'v3') {
      const minScore = options?.minScore ?? 0.5;
      if (typeof data.score === 'number' && data.score < minScore) {
        return {
          success: false,
          score: data.score,
          action: data.action,
          error: 'Low security confidence score. Suspicious bot activity detected.',
        };
      }

      if (options?.expectedAction && data.action && data.action !== options.expectedAction) {
        return {
          success: false,
          action: data.action,
          error: `reCAPTCHA action mismatch (expected ${options.expectedAction}, received ${data.action}).`,
        };
      }
    }

    return {
      success: true,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
    };
  } catch (error) {
    // If request timed out or network error occurred
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'reCAPTCHA verification timed out. Please try again.',
      };
    }

    const message = error instanceof Error ? error.message : 'Unknown reCAPTCHA error.';
    return {
      success: false,
      error: `reCAPTCHA verification error: ${message}`,
    };
  }
}
