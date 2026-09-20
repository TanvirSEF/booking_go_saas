import { z } from 'zod';

export const updateUserProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120).trim(),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim().optional(),
  mobileNo: z.string().trim().optional(),
  avatar: z.string().trim().optional(),
});

export const changeUserPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100),
    confirmPassword: z.string().min(6, 'Password confirmation must be at least 6 characters').max(100),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  });

export const updateUserPreferencesSchema = z.object({
  darkMode: z.boolean().optional(),
  lang: z.string().min(2).max(10).trim().optional(),
});

export const deleteUserAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required to delete your account'),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type ChangeUserPasswordInput = z.infer<typeof changeUserPasswordSchema>;
export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>;
export type DeleteUserAccountInput = z.infer<typeof deleteUserAccountSchema>;

export interface UserProfileDTO {
  id: string;
  name: string;
  email: string;
  mobileNo?: string;
  avatar: string;
  role: string;
  lang: string;
  darkMode: boolean;
  emailVerifiedAt?: string | null;
  createdAt: string;
}

export interface UserProfileActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
