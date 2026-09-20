export type AppointmentEmailEventType =
  | 'appointment_created'
  | 'appointment_status_changed'
  | 'appointment_rescheduled'
  | 'appointment_cancelled'
  | 'payment_received';

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
