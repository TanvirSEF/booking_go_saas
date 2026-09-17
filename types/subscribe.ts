export type SubscriberStatus = 'active' | 'unsubscribed';

export interface SubscriberDTO {
  id: string;
  email: string;
  theme: string;
  source: string;
  status: SubscriberStatus;
  unsubscribedAt?: string;
  createdAt: string;
}

export interface SubscribeNewsletterInput {
  businessSlug: string;
  email: string;
  theme?: string;
  source?: string;
}

export interface SubscriberFilterParams {
  page?: number;
  limit?: number;
  status?: SubscriberStatus | 'all';
  search?: string;
}

export interface SubscriberCounts {
  total: number;
  active: number;
  unsubscribed: number;
}

export interface PaginatedSubscribersResult {
  subscribers: SubscriberDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: SubscriberCounts;
}

export interface ExportSubscribersResult {
  csvContent: string;
  filename: string;
  totalCount: number;
}

export interface SubscriberActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
