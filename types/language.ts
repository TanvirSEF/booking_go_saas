import { z } from 'zod';

export type LanguageDirection = 'ltr' | 'rtl';

export const createLanguageSchema = z.object({
  code: z
    .string()
    .min(2, 'Language code must be at least 2 characters')
    .max(10, 'Language code cannot exceed 10 characters')
    .regex(/^[a-z]{2,3}(-[a-zA-Z]{2,4})?$/, 'Invalid ISO language code format (e.g. "en", "es", "ar", "zh-CN")')
    .transform((v) => v.toLowerCase().trim()),
  name: z.string().min(2, 'Language name must be at least 2 characters').max(60).trim(),
  direction: z.enum(['ltr', 'rtl']).default('ltr'),
  isDefault: z.boolean().optional().default(false),
  status: z.boolean().optional().default(true),
});

export const updateLanguageSchema = z.object({
  name: z.string().min(2).max(60).trim().optional(),
  direction: z.enum(['ltr', 'rtl']).optional(),
  isDefault: z.boolean().optional(),
  status: z.boolean().optional(),
});

export const updateTranslationsSchema = z.object({
  languageCode: z.string().min(2).transform((v) => v.toLowerCase().trim()),
  group: z.string().min(1).trim().default('general'),
  translations: z.record(z.string(), z.string()),
});

export const changeUserLanguageSchema = z.object({
  lang: z.string().min(2).transform((v) => v.toLowerCase().trim()),
});

export const importTranslationsSchema = z.object({
  languageCode: z.string().min(2).transform((v) => v.toLowerCase().trim()),
  group: z.string().min(1).trim().default('general'),
  data: z.record(z.string(), z.string()),
  overwrite: z.boolean().optional().default(true),
});

export type CreateLanguageInput = z.infer<typeof createLanguageSchema>;
export type UpdateLanguageInput = z.infer<typeof updateLanguageSchema>;
export type UpdateTranslationsInput = z.infer<typeof updateTranslationsSchema>;
export type ChangeUserLanguageInput = z.infer<typeof changeUserLanguageSchema>;
export type ImportTranslationsInput = z.infer<typeof importTranslationsSchema>;

export interface LanguageDTO {
  _id: string;
  code: string;
  name: string;
  direction: LanguageDirection;
  status: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  translationCount?: number;
}

export interface TranslationItemDTO {
  key: string;
  value: string;
  group: string;
  isCustomOverride?: boolean;
}

export interface TranslationDictionaryDTO {
  languageCode: string;
  languageName: string;
  direction: LanguageDirection;
  group: string;
  translations: Record<string, string>;
  isRTL: boolean;
}

export interface LanguageActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
