export type ContactInquiryStatus = 'new' | 'read' | 'replied' | 'archived';

export interface ContactInquiryDTO {
  id: string;
  name: string;
  email: string;
  contact: string;
  subject: string;
  message: string;
  theme: string;
  status: ContactInquiryStatus;
  replyNotes: string;
  repliedAt?: string;
  createdAt: string;
}

export interface SubmitContactInquiryInput {
  businessSlug: string;
  name: string;
  email: string;
  contact: string;
  subject: string;
  message: string;
  theme?: string;
  recaptchaToken?: string;
}

export interface UpdateInquiryStatusInput {
  id: string;
  status: ContactInquiryStatus;
  replyNotes?: string;
}

export interface ContactInquiryFilterParams {
  page?: number;
  limit?: number;
  status?: ContactInquiryStatus | 'all';
  search?: string;
}

export interface ContactInquiryCounts {
  total: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
}

export interface PaginatedContactInquiriesResult {
  inquiries: ContactInquiryDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: ContactInquiryCounts;
}

export interface ContactInquiryActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
