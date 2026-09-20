import { z } from 'zod';

export const toggleLoginAccessSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const suspendUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export const reactivateUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type ToggleLoginAccessInput = z.infer<typeof toggleLoginAccessSchema>;
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type ReactivateUserInput = z.infer<typeof reactivateUserSchema>;

export interface UserAccountStatusDTO {
  userId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isEnableLogin: boolean;
  tokenVersion: number;
  suspendedReason?: string | null;
  suspendedAt?: string | null;
  companyId?: string | null;
}

export interface UserManagementActionResult {
  success: boolean;
  message?: string;
  isEnableLogin?: boolean;
  isActive?: boolean;
  error?: string;
}
