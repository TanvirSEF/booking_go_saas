import { z } from 'zod';

export type ThemePreset = 'theme1' | 'theme2' | 'theme3' | 'theme4' | 'theme5';

export interface ThemeFeatureDTO {
  title: string;
  description: string;
  icon?: string;
}

export interface ThemeGalleryImageDTO {
  url: string;
  caption?: string;
}

export interface ThemeBannerDTO {
  title: string;
  subTitle: string;
  image: string;
  buttonText: string;
  buttonUrl: string;
  isVisible: boolean;
}

export interface ThemeAboutDTO {
  title: string;
  description: string;
  image: string;
  features: ThemeFeatureDTO[];
  isVisible: boolean;
}

export interface ThemeGalleryDTO {
  title: string;
  images: ThemeGalleryImageDTO[];
  isVisible: boolean;
}

export interface ThemeFooterDTO {
  copyright: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
}

export interface ThemeStylingDTO {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  customCss: string;
  customJs: string;
}

export interface DomainMappingDTO {
  customDomain?: string;
  subdomain?: string;
  isVerified: boolean;
  verifiedAt?: string | null;
  dnsCnameTarget?: string;
}

export interface ThemeSettingDTO {
  id: string;
  businessId: string;
  businessName?: string;
  businessSlug?: string;
  companyId: string;
  activeTheme: ThemePreset;
  banner: ThemeBannerDTO;
  about: ThemeAboutDTO;
  gallery: ThemeGalleryDTO;
  footer: ThemeFooterDTO;
  styling: ThemeStylingDTO;
  domainMapping: DomainMappingDTO;
  updatedAt: string;
}

export const themeFeatureSchema = z.object({
  title: z.string().min(1, 'Feature title is required').max(100),
  description: z.string().max(300).default(''),
  icon: z.string().optional().default(''),
});

export const themeGalleryImageSchema = z.object({
  url: z.string().min(1, 'Image URL is required'),
  caption: z.string().max(150).optional().default(''),
});

export const updateThemeSectionsSchema = z.object({
  businessId: z.string().optional(),
  banner: z
    .object({
      title: z.string().max(200).optional(),
      subTitle: z.string().max(500).optional(),
      image: z.string().optional(),
      buttonText: z.string().max(100).optional(),
      buttonUrl: z.string().max(300).optional(),
      isVisible: z.boolean().optional(),
    })
    .optional(),
  about: z
    .object({
      title: z.string().max(200).optional(),
      description: z.string().max(2000).optional(),
      image: z.string().optional(),
      features: z.array(themeFeatureSchema).optional(),
      isVisible: z.boolean().optional(),
    })
    .optional(),
  gallery: z
    .object({
      title: z.string().max(200).optional(),
      images: z.array(themeGalleryImageSchema).optional(),
      isVisible: z.boolean().optional(),
    })
    .optional(),
  footer: z
    .object({
      copyright: z.string().max(200).optional(),
      socialLinks: z
        .object({
          facebook: z.string().optional(),
          instagram: z.string().optional(),
          twitter: z.string().optional(),
          linkedin: z.string().optional(),
          youtube: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  styling: z
    .object({
      primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Valid hex color required').optional(),
      secondaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Valid hex color required').optional(),
      fontFamily: z.string().max(100).optional(),
      customCss: z.string().optional(),
      customJs: z.string().optional(),
    })
    .optional(),
});

export type UpdateThemeSectionsInput = z.infer<typeof updateThemeSectionsSchema>;

export const switchThemeSchema = z.object({
  theme: z.enum(['theme1', 'theme2', 'theme3', 'theme4', 'theme5']),
  businessId: z.string().optional(),
});

export type SwitchThemeInput = z.infer<typeof switchThemeSchema>;

export const customDomainMappingSchema = z.object({
  businessId: z.string().optional(),
  customDomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      'Please enter a valid fully qualified domain name (e.g. booking.mycompany.com)'
    )
    .optional()
    .or(z.literal('')),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .max(50)
    .optional()
    .or(z.literal('')),
});

export type CustomDomainMappingInput = z.infer<typeof customDomainMappingSchema>;

export interface ThemeActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
