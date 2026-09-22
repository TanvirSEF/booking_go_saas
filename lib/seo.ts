import type { Metadata } from 'next';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import { Blog } from '@/models/Blog';
import type { IBusiness, IBusinessHour } from '@/models/Business';
import type { IBlog } from '@/models/Blog';
import type { IService } from '@/models/Service';
import type {
  JsonLdLocalBusiness,
  JsonLdBlogPosting,
  JsonLdOpeningHours,
  SeoMetadataOptions,
} from '@/types/seo';

/**
 * Resolves the operational canonical base URL.
 * Honors tenant custom domain, options override, or platform environment URL.
 */
export function resolveBaseUrl(options?: SeoMetadataOptions, domain?: string): string {
  if (options?.customDomain) {
    return `https://${options.customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }
  if (domain && domain.trim().length > 0) {
    return `https://${domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }
  if (options?.baseUrl) {
    return options.baseUrl.replace(/\/$/, '');
  }
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, '');
  }
  return 'https://bookinggo.app';
}

/**
 * Safely extracts setting from a Business model settings Map or Record.
 */
function getSetting(settings: unknown, key: string): string | undefined {
  if (!settings) return undefined;
  if (typeof (settings as Map<string, string>).get === 'function') {
    return (settings as Map<string, string>).get(key);
  }
  if (typeof settings === 'object') {
    return (settings as Record<string, string>)[key];
  }
  return undefined;
}

/**
 * Builds dynamic Metadata for a tenant's public booking page (/appointments/[slug]).
 */
export async function resolveBusinessSeoMetadata(
  slug: string,
  options?: SeoMetadataOptions
): Promise<Metadata> {
  await connectToDatabase();
  const business = await Business.findOne({ slug }).lean();

  if (!business) {
    return {
      title: 'Business Not Found | BookingGo',
      description: 'The requested booking page could not be found.',
      robots: { index: false, follow: false },
    };
  }

  const baseUrl = resolveBaseUrl(options, business.domain);
  const path = options?.path || `/appointments/${slug}`;
  const defaultCanonical = `${baseUrl}${path}`;

  // Multi-tier Fallback Chain:
  // 1. business.seo.* (Next-gen dedicated SEO schema)
  // 2. business.settings.* (Legacy Laravel WorkDo compatibility)
  // 3. Dynamic business properties fallback
  const metaTitle =
    business.seo?.metaTitle?.trim() ||
    getSetting(business.settings, 'meta_title')?.trim() ||
    `Book Appointment | ${business.name}`;

  const metaDescription =
    business.seo?.metaDescription?.trim() ||
    getSetting(business.settings, 'meta_description')?.trim() ||
    `Book your service online with ${business.name}. Fast, easy, and secure scheduling.`;

  const metaKeywords =
    business.seo?.metaKeywords?.trim() ||
    getSetting(business.settings, 'meta_keywords')?.trim() ||
    `${business.name}, appointment, booking, calendar, reservations`;

  const customOgImage =
    business.seo?.metaImage?.trim() ||
    getSetting(business.settings, 'meta_image')?.trim();

  // Dynamic OpenGraph image generation fallback
  const ogImageUrl = customOgImage || `${baseUrl}/api/og/booking?slug=${slug}`;
  const canonicalUrl = business.seo?.canonicalUrl?.trim() || defaultCanonical;
  const noIndex = business.seo?.noIndex ?? false;

  const icons = [];
  if (business.logoLight) {
    icons.push({ rel: 'icon', url: business.logoLight });
  } else if (business.logoDark) {
    icons.push({ rel: 'icon', url: business.logoDark });
  } else {
    icons.push({ rel: 'icon', url: '/favicon.ico' });
  }

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: metaKeywords.split(',').map((k) => k.trim()).filter(Boolean),
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: canonicalUrl,
      siteName: business.name,
      locale: 'en_US',
      type: (business.seo?.ogType as 'website') || 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${business.name} Booking Preview`,
        },
      ],
    },
    twitter: {
      card: business.seo?.twitterCard || 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: [ogImageUrl],
    },
    icons: {
      icon: icons,
      apple: business.logoDark || business.logoLight || '/apple-touch-icon.png',
    },
  };
}

/**
 * Builds dynamic Metadata for a tenant's public blog post (/blog/[slug]).
 */
export async function resolveBlogSeoMetadata(
  businessSlug: string,
  postSlug: string,
  options?: SeoMetadataOptions
): Promise<Metadata> {
  await connectToDatabase();

  const business = businessSlug
    ? await Business.findOne({ slug: businessSlug }).lean()
    : null;

  const query: Record<string, unknown> = { slug: postSlug };
  if (business) {
    query.businessId = business._id;
  }

  const post = await Blog.findOne(query).lean();

  if (!post) {
    return {
      title: 'Article Not Found | Blog',
      description: 'The requested blog article could not be found.',
      robots: { index: false, follow: false },
    };
  }

  const baseUrl = resolveBaseUrl(options, business?.domain);
  const path = businessSlug
    ? `/blog/${postSlug}?business=${businessSlug}`
    : `/blog/${postSlug}`;
  const canonicalUrl = `${baseUrl}${path}`;

  const metaTitle = `${post.title} | ${business?.name || 'Blog'}`;
  const metaDescription = post.summary || post.title;
  const keywords = post.tags && post.tags.length > 0 ? post.tags : [post.category || 'Article'];

  const ogImageUrl =
    post.image ||
    `${baseUrl}/api/og/blog?slug=${post.slug}${business ? `&business=${business.slug}` : ''}`;

  return {
    title: metaTitle,
    description: metaDescription,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: post.status === 'published',
      follow: post.status === 'published',
      googleBot: {
        index: post.status === 'published',
        follow: post.status === 'published',
      },
    },
    openGraph: {
      title: post.title,
      description: metaDescription,
      url: canonicalUrl,
      siteName: business?.name || 'BookingGo',
      locale: 'en_US',
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      authors: [business?.name || 'Editorial Team'],
      tags: post.tags || [],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: metaDescription,
      images: [ogImageUrl],
    },
  };
}

/**
 * Generates Schema.org JSON-LD Structured Data for LocalBusiness.
 * Supports Google Search Rich Snippets and ReserveAction.
 */
export function generateLocalBusinessJsonLd(
  business: IBusiness,
  services?: IService[],
  baseUrl?: string
): JsonLdLocalBusiness {
  const rootUrl = baseUrl || resolveBaseUrl(undefined, business.domain);
  const bookingUrl = `${rootUrl}/appointments/${business.slug}`;

  // Map business hours to Schema.org OpeningHoursSpecification
  const openingHoursSpecification: JsonLdOpeningHours[] = (business.businessHours || [])
    .filter((h: IBusinessHour) => h.isOpen && h.startTime && h.endTime)
    .map((h: IBusinessHour) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.dayName,
      opens: h.startTime,
      closes: h.endTime,
    }));

  const jsonLd: JsonLdLocalBusiness = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description:
      business.seo?.metaDescription ||
      `Online appointment scheduling and professional services by ${business.name}.`,
    url: bookingUrl,
    image: business.logoDark || business.logoLight || `${rootUrl}/api/og/booking?slug=${business.slug}`,
    priceRange: '$$',
    currenciesAccepted: business.currency || 'USD',
    openingHoursSpecification,
    potentialAction: {
      '@type': 'ReserveAction',
      target: bookingUrl,
      result: {
        '@type': 'Reservation',
        name: `Appointment at ${business.name}`,
      },
    },
  };

  // Add services to makesOffer
  if (services && services.length > 0) {
    jsonLd.makesOffer = services.map((s) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: s.name,
        description: s.description || undefined,
        price: s.price,
        priceCurrency: business.currency || 'USD',
      },
    }));
  }

  return jsonLd;
}

/**
 * Generates Schema.org JSON-LD Structured Data for BlogPosting.
 */
export function generateBlogPostingJsonLd(
  post: IBlog,
  business?: IBusiness | null,
  baseUrl?: string
): JsonLdBlogPosting {
  const rootUrl = baseUrl || resolveBaseUrl(undefined, business?.domain);
  const articleUrl = `${rootUrl}/blog/${post.slug}${business ? `?business=${business.slug}` : ''}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary || post.title,
    image: post.image || `${rootUrl}/api/og/blog?slug=${post.slug}`,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date().toISOString(),
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: business?.name || 'Author',
    },
    publisher: {
      '@type': 'Organization',
      name: business?.name || 'BookingGo',
      logo: (business?.logoDark || business?.logoLight)
        ? {
            '@type': 'ImageObject',
            url: business.logoDark || business.logoLight || '',
          }
        : undefined,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
  };
}
