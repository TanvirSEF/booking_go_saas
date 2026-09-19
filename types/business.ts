import { z } from 'zod';
import type { FormLayoutType, IBusinessHour, IBusinessHoliday } from '@/models/Business';

export const createBusinessSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Business name must be at least 2 characters.' })
    .max(100, { message: 'Business name cannot exceed 100 characters.' })
    .trim(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug must consist of lowercase alphanumeric characters and hyphens only.',
    })
    .optional()
    .or(z.literal('')),
  currency: z.string().min(1).max(10).default('USD'),
  currencySymbol: z.string().min(1).max(5).default('$'),
  appointmentPrefix: z.string().max(20).default('#APP000'),
  maximumSlot: z.number().int().min(1).max(100).default(1),
  appointmentReminderHours: z.number().int().min(1).max(168).default(24),
  formType: z.enum(['form-layout', 'theme']).default('form-layout'),
  layout: z.string().default('Formlayout1'),
  themeColor: z.string().default('color1-Formlayout1'),
  domain: z.string().optional().or(z.literal('')),
});

export const updateBusinessSchema = z.object({
  businessId: z.string().min(1, { message: 'Business ID is required.' }),
  name: z
    .string()
    .min(2, { message: 'Business name must be at least 2 characters.' })
    .max(100)
    .trim()
    .optional(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug must consist of lowercase alphanumeric characters and hyphens only.',
    })
    .optional()
    .or(z.literal('')),
  currency: z.string().min(1).max(10).optional(),
  currencySymbol: z.string().min(1).max(5).optional(),
  appointmentPrefix: z.string().max(20).optional(),
  maximumSlot: z.number().int().min(1).max(100).optional(),
  appointmentReminderHours: z.number().int().min(1).max(168).optional(),
  formType: z.enum(['form-layout', 'theme']).optional(),
  layout: z.string().optional(),
  themeColor: z.string().optional(),
  logoDark: z.string().optional().or(z.literal('')),
  logoLight: z.string().optional().or(z.literal('')),
  domain: z.string().optional().or(z.literal('')),
  settings: z.record(z.string(), z.string()).optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export interface BusinessDTO {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  formType: FormLayoutType;
  layout: string;
  themeColor: string;
  logoDark?: string;
  logoLight?: string;
  currency: string;
  currencySymbol: string;
  appointmentPrefix: string;
  maximumSlot: number;
  appointmentReminderHours: number;
  domain?: string;
  businessHours: IBusinessHour[];
  holidays: IBusinessHoliday[];
  settings: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  stats?: {
    locationsCount: number;
    servicesCount: number;
    staffCount: number;
    appointmentsCount: number;
  };
}

export interface BusinessActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
