import { z } from 'zod';

export interface IBusinessSeo {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  metaImage?: string;
  canonicalUrl?: string;
  ogType?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
}

export const businessSeoInputSchema = z.object({
  metaTitle: z.string().max(120, 'Meta title must not exceed 120 characters').optional().or(z.literal('')),
  metaDescription: z.string().max(320, 'Meta description must not exceed 320 characters').optional().or(z.literal('')),
  metaKeywords: z.string().max(300, 'Meta keywords must not exceed 300 characters').optional().or(z.literal('')),
  metaImage: z.string().url('Meta image must be a valid URL').optional().or(z.literal('')),
  canonicalUrl: z.string().url('Canonical URL must be a valid URL').optional().or(z.literal('')),
  ogType: z.string().default('website').optional(),
  twitterCard: z.enum(['summary', 'summary_large_image']).default('summary_large_image').optional(),
  noIndex: z.boolean().default(false).optional(),
});

export type BusinessSeoInput = z.infer<typeof businessSeoInputSchema>;

export interface SeoMetadataOptions {
  baseUrl?: string;
  customDomain?: string;
  path?: string;
}

export interface JsonLdOpeningHours {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string | string[];
  opens: string;
  closes: string;
}

export interface JsonLdReserveAction {
  '@type': 'ReserveAction';
  target: string;
  result?: {
    '@type': 'Reservation';
    name: string;
  };
}

export interface JsonLdLocalBusiness {
  '@context': 'https://schema.org';
  '@type': string;
  name: string;
  description?: string;
  url: string;
  image?: string;
  telephone?: string;
  priceRange?: string;
  currenciesAccepted?: string;
  openingHoursSpecification?: JsonLdOpeningHours[];
  potentialAction?: JsonLdReserveAction;
  makesOffer?: Array<{
    '@type': 'Offer';
    itemOffered: {
      '@type': 'Service';
      name: string;
      description?: string;
      price?: number;
      priceCurrency?: string;
    };
  }>;
}

export interface JsonLdBlogPosting {
  '@context': 'https://schema.org';
  '@type': 'BlogPosting';
  headline: string;
  description?: string;
  image?: string;
  datePublished: string;
  dateModified: string;
  author: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo?: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  mainEntityOfPage: {
    '@type': 'WebPage';
    '@id': string;
  };
}
