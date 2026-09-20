import { z } from 'zod';

export interface RecaptchaVerifyOptions {
  expectedAction?: string;
  minScore?: number; // For v3 (0.0 to 1.0, default 0.5)
}

export interface RecaptchaVerifyResult {
  success: boolean;
  score?: number;
  action?: string;
  error?: string;
  bypassed?: boolean;
  hostname?: string;
}

export interface PublicRecaptchaConfigDTO {
  isEnabled: boolean;
  version: 'v2' | 'v3';
  siteKey: string;
}

export const verifyRecaptchaInputSchema = z.object({
  token: z.string().min(1, 'reCAPTCHA token is required'),
  action: z.string().optional(),
});

export type VerifyRecaptchaInput = z.infer<typeof verifyRecaptchaInputSchema>;
