export type AppointmentEmailEventType =
  | 'appointment_created'
  | 'appointment_status_changed'
  | 'appointment_rescheduled'
  | 'appointment_cancelled'
  | 'payment_received'
  | 'appointment_reminder';

export interface AppointmentEmailPayload {
  appointmentId: string;
  eventType: AppointmentEmailEventType;
  overrideRecipientEmail?: string;
  extraVariables?: Record<string, string | number | undefined | null>;
}

export interface EmailDispatchResult {
  success: boolean;
  event: AppointmentEmailEventType;
  customerDelivered: boolean;
  staffDelivered: boolean;
  recipientCount: number;
  customerError?: string;
  staffError?: string;
  error?: string;
}

export interface ReminderProcessOptions {
  dryRun?: boolean;
  lookaheadHours?: number;
  businessId?: string;
  limit?: number;
}

export interface ReminderItemResult {
  appointmentId: string;
  appointmentNumber: string;
  email: string;
  date: string;
  time: string;
  success: boolean;
  error?: string;
}

export interface ReminderProcessResult {
  success: boolean;
  timestamp: string;
  dryRun: boolean;
  lookaheadHours: number;
  matched: number;
  dispatched: number;
  failed: number;
  skipped: number;
  results: ReminderItemResult[];
  error?: string;
}
