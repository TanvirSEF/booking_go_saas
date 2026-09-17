export type NotificationType =
  | 'appointment_created'
  | 'appointment_status_changed'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'payment_received'
  | 'inquiry_received'
  | 'subscriber_joined'
  | 'system_alert';

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationFilterParams {
  page?: number;
  limit?: number;
  filter?: 'all' | 'unread';
}

export interface PaginatedNotificationsResult {
  notifications: NotificationDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface CreateNotificationInput {
  recipientId: string;
  companyId: string;
  businessId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
