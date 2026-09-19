import { z } from 'zod';

export const registerCompanySchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Full name must be at least 2 characters.' })
    .max(100, { message: 'Full name must not exceed 100 characters.' })
    .trim(),
  email: z
    .string()
    .email({ message: 'Please enter a valid email address.' })
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long.' })
    .max(100, { message: 'Password must not exceed 100 characters.' }),
  businessName: z
    .string()
    .min(2, { message: 'Business or Company name must be at least 2 characters.' })
    .max(100, { message: 'Business name must not exceed 100 characters.' })
    .trim(),
  mobileNo: z
    .string()
    .optional()
    .or(z.literal('')),
});

export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;

export interface RegisterCompanyResult {
  success: boolean;
  error?: string;
  message?: string;
  userId?: string;
  businessSlug?: string;
}
