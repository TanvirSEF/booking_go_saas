export interface BusinessSettingsDTO {
  id: string;
  name: string;
  slug: string;
  formType: 'form-layout' | 'theme';
  layout: string;
  themeColor: string;
  logoDark: string;
  logoLight: string;
  currency: string;
  currencySymbol: string;
  appointmentPrefix: string;
  maximumSlot: number;
  appointmentReminderHours: number;
  domain: string;
  taxType: string;
  taxNumber: string;
  taxPercentage: number;
  invoiceFooterNotes: string;
  customCss: string;
  customJs: string;
  settings: Record<string, string>;
}

export interface UpdateGeneralSettingsInput {
  name?: string;
  currency?: string;
  currencySymbol?: string;
  domain?: string;
}

export interface UpdateBrandingSettingsInput {
  themeColor?: string;
  layout?: string;
  formType?: 'form-layout' | 'theme';
  logoDark?: string;
  logoLight?: string;
}

export interface UpdateAppointmentPolicyInput {
  appointmentPrefix?: string;
  maximumSlot?: number;
  appointmentReminderHours?: number;
}

export interface UpdateTaxInvoiceSettingsInput {
  taxType?: string;
  taxNumber?: string;
  taxPercentage?: number;
  invoiceFooterNotes?: string;
  customCss?: string;
  customJs?: string;
}

export interface SettingsActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
