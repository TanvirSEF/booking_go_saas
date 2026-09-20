'use server';

import {
  getPublicRecaptchaConfig,
  verifyRecaptchaToken,
} from '@/lib/recaptcha';
import {
  verifyRecaptchaInputSchema,
  type PublicRecaptchaConfigDTO,
  type RecaptchaVerifyResult,
} from '@/types/recaptcha';

/**
 * Retrieves public reCAPTCHA settings (enabled status, version, and siteKey).
 * Safely exposed to public clients for dynamic widget mounting.
 */
export async function getPublicRecaptchaConfigAction(): Promise<{
  success: boolean;
  data: PublicRecaptchaConfigDTO;
}> {
  const config = await getPublicRecaptchaConfig();
  return {
    success: true,
    data: config,
  };
}

/**
 * Validates a client reCAPTCHA token against Google's SiteVerify API.
 */
export async function verifyRecaptchaTokenAction(
  token: string,
  action?: string
): Promise<RecaptchaVerifyResult> {
  const validation = verifyRecaptchaInputSchema.safeParse({ token, action });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Invalid reCAPTCHA parameters.',
    };
  }

  return verifyRecaptchaToken(validation.data.token, {
    expectedAction: validation.data.action,
  });
}
