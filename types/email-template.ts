import { z } from 'zod';

export interface EmailTemplateTranslationDTO {
  lang: string;
  subject: string;
  content: string;
}

export interface EmailTemplateDTO {
  id: string;
  name: string;
  slug: string;
  from: string;
  moduleName: string;
  companyId?: string | null;
  businessId?: string | null;
  variables: string[];
  translations: EmailTemplateTranslationDTO[];
  currentTranslation?: EmailTemplateTranslationDTO;
  isSystem: boolean;
  isCustomized: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailTemplateListItemDTO {
  id: string;
  name: string;
  slug: string;
  from: string;
  moduleName: string;
  variablesCount: number;
  availableLanguages: string[];
  isCustomized: boolean;
  isSystem: boolean;
  defaultSubject: string;
}

export const updateEmailTemplateSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  lang: z.string().min(2, 'Language code must be at least 2 characters').default('en'),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject cannot exceed 255 characters'),
  content: z.string().min(1, 'Content body is required'),
  from: z.string().min(1, 'From sender name is required').max(100),
  businessId: z.string().optional().nullable(),
});

export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;

export const sendTestEmailSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  recipientEmail: z.string().email('Valid recipient email address is required'),
  lang: z.string().default('en'),
  customVariables: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;

export interface EmailTemplateActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
