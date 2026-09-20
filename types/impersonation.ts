import { z } from 'zod';

export interface ImpersonationTicketPayload {
  adminId: string;
  targetUserId: string;
  adminName: string;
  adminEmail: string;
  isRestore: boolean;
  exp: number;
  nonce: string;
}

export interface ImpersonationStatusDTO {
  isImpersonating: boolean;
  impersonatorAdminId: string | null;
  originalAdminName: string | null;
  originalAdminEmail: string | null;
  targetCompany: {
    id: string;
    name: string;
    email: string;
    businessName?: string;
  } | null;
}

export interface ImpersonationActionResult {
  success: boolean;
  message: string;
  ticket?: string;
  redirectUrl?: string;
  error?: string;
}

export const startImpersonationSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
});

export const toggleCompanyStatusSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  isActive: z.boolean(),
});
