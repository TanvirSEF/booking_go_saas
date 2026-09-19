import { z } from 'zod';

export type BankTransferStatus = 'Pending' | 'Approved' | 'Rejected';
export type BankTransferType = 'plan' | 'appointment';

export interface BankTransferPaymentDTO {
  id: string;
  orderId: string;
  orderNumber?: string;
  companyId: string;
  companyName?: string;
  companyEmail?: string;
  businessId?: string | null;
  businessName?: string;
  type: BankTransferType;
  planId?: string | null;
  planName?: string;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  currency: string;
  attachment: string;
  status: BankTransferStatus;
  transactionRef?: string;
  notes?: string;
  rejectionReason?: string;
  reviewedBy?: string | null;
  reviewedByName?: string;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransferSettingsDTO {
  bankTransferEnabled: boolean;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  routingNumber?: string;
  ibanSwift?: string;
  instructions?: string;
}

export const submitPlanBankTransferSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  attachment: z.string().min(1, 'Payment receipt attachment is required'),
  transactionRef: z.string().optional().default(''),
  couponCode: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export type SubmitPlanBankTransferInput = z.infer<typeof submitPlanBankTransferSchema>;

export const reviewBankTransferSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  action: z.enum(['Approve', 'Reject']),
  rejectionReason: z.string().optional(),
}).refine(
  (data) => {
    if (data.action === 'Reject' && (!data.rejectionReason || !data.rejectionReason.trim())) {
      return false;
    }
    return true;
  },
  {
    message: 'Rejection reason is required when rejecting a payment.',
    path: ['rejectionReason'],
  }
);

export type ReviewBankTransferInput = z.infer<typeof reviewBankTransferSchema>;

export const updateBankTransferSettingsSchema = z.object({
  bankTransferEnabled: z.boolean().default(true),
  bankName: z.string().min(1, 'Bank name is required').max(100),
  accountHolder: z.string().min(1, 'Account holder name is required').max(100),
  accountNumber: z.string().min(1, 'Account number is required').max(50),
  routingNumber: z.string().optional().default(''),
  ibanSwift: z.string().optional().default(''),
  instructions: z.string().optional().default(''),
});

export type UpdateBankTransferSettingsInput = z.infer<typeof updateBankTransferSettingsSchema>;

export interface BankTransferFilterParams {
  status?: BankTransferStatus | 'all';
  type?: BankTransferType | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedBankTransfersResult {
  items: BankTransferPaymentDTO[];
  total: number;
  page: number;
  totalPages: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export interface BankTransferActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
