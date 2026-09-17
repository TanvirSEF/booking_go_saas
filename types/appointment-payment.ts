export interface ValidateCouponInput {
  businessId?: string;
  couponCode: string;
  originalPrice: number;
}

export interface ValidatedCouponResult {
  couponId: string;
  couponCode: string;
  couponName: string;
  discountType: 'percentage' | 'flat';
  discount: number;
  discountAmount: number;
  finalPrice: number;
}

export interface ValidateCouponResponse {
  success: boolean;
  coupon?: ValidatedCouponResult;
  message?: string;
  error?: string;
}

export interface CreateAppointmentStripeSessionInput {
  appointmentId: string;
  couponCode?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface StripeSessionResponse {
  success: boolean;
  url?: string | null;
  sessionId?: string;
  error?: string;
}

export interface VerifyStripePaymentResponse {
  success: boolean;
  appointmentNumber?: string;
  paymentStatus?: string;
  amount?: number;
  error?: string;
}

export interface SubmitBankTransferInput {
  appointmentId: string;
  receiptUrl: string;
  bankName?: string;
  transactionReference?: string;
  notes?: string;
}

export interface SubmitBankTransferResponse {
  success: boolean;
  appointmentNumber?: string;
  message?: string;
  error?: string;
}

export interface UploadReceiptResponse {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}
