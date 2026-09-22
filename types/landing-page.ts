import { z } from 'zod';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ITopbarSetting {
  status: boolean;
  notificationMsg: string;
}

export interface IHeroSetting {
  status: boolean;
  offerText: string;
  title: string;
  heading: string;
  description: string;
  trustedBy: string;
  liveDemoLink: string;
  buyNowLink: string;
  bannerImage: string;
  buttonText: string;
  partnerLogos: string[];
}

export interface IFeatureCard {
  id: string;
  logo: string;
  image?: string;
  heading: string;
  description: string;
  link: string;
  buttonText: string;
}

export interface IFeaturesSetting {
  status: boolean;
  title: string;
  heading: string;
  description: string;
  buyNowLink: string;
  cards: IFeatureCard[];
}

export interface IHighlightCard {
  id: string;
  logo: string;
  heading: string;
  description: string;
  link: string;
  buttonText: string;
}

export interface IHighlightSetting {
  status: boolean;
  heading: string;
  description: string;
  image: string;
  cards: IHighlightCard[];
}

export interface IScreenshotItem {
  id: string;
  image: string;
  heading: string;
}

export interface IScreenshotsSetting {
  status: boolean;
  heading: string;
  description: string;
  items: IScreenshotItem[];
}

export interface IBuiltTechCard {
  id: string;
  logo: string;
  heading: string;
  description: string;
  link: string;
  buttonText: string;
}

export interface IBuiltTechSetting {
  status: boolean;
  heading: string;
  description: string;
  cards: IBuiltTechCard[];
}

export interface IPackageDetailsSetting {
  status: boolean;
  heading: string;
  shortDescription: string;
  longDescription: string;
  link: string;
  buttonText: string;
}

export interface IReviewItem {
  id: string;
  tag: string;
  heading: string;
  description: string;
  image?: string;
  link: string;
  buttonText: string;
}

export interface IReviewsSetting {
  status: boolean;
  items: IReviewItem[];
}

export interface IFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface IFaqSetting {
  status: boolean;
  title: string;
  heading: string;
  description: string;
  items: IFaqItem[];
}

export interface IJoinUsSetting {
  status: boolean;
  heading: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

export interface IFooterLink {
  title: string;
  link: string;
}

export interface IFooterSection {
  heading: string;
  links: IFooterLink[];
}

export interface IFooterSetting {
  status: boolean;
  logo: string;
  description: string;
  copyright: string;
  supportLink: string;
  websiteName: string;
  websiteUrl: string;
  sections: IFooterSection[];
}

export interface ISeoSetting {
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  metaImage: string;
  googleAnalyticsId: string;
  facebookPixelId: string;
}

export interface IPixelItem {
  id: string;
  platform: string;
  pixelId: string;
}

export interface ICustomCodeSetting {
  customCss: string;
  customJs: string;
}

export interface ICustomPageItem {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  content?: string;
  pageUrl?: string;
  templateType: 'content' | 'url';
  header: boolean;
  footer: boolean;
  loginRequired: boolean;
}

export interface ILandingPageData {
  topbar: ITopbarSetting;
  hero: IHeroSetting;
  features: IFeaturesSetting;
  highlight: IHighlightSetting;
  screenshots: IScreenshotsSetting;
  builtTech: IBuiltTechSetting;
  packageDetails: IPackageDetailsSetting;
  reviews: IReviewsSetting;
  faq: IFaqSetting;
  joinUs: IJoinUsSetting;
  footer: IFooterSetting;
  seo: ISeoSetting;
  pixels: IPixelItem[];
  customCode: ICustomCodeSetting;
  customPages: ICustomPageItem[];
  sectionSequence: string[];
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const TopbarSchema = z.object({
  status: z.boolean().default(true),
  notificationMsg: z.string().default(''),
});

export const HeroSchema = z.object({
  status: z.boolean().default(true),
  offerText: z.string().default(''),
  title: z.string().default('Home'),
  heading: z.string().min(1, 'Hero heading is required'),
  description: z.string().default(''),
  trustedBy: z.string().default(''),
  liveDemoLink: z.string().default(''),
  buyNowLink: z.string().default(''),
  bannerImage: z.string().default(''),
  buttonText: z.string().default('View Live Demo'),
  partnerLogos: z.array(z.string()).default([]),
});

export const FeatureCardSchema = z.object({
  id: z.string().optional(),
  logo: z.string().default(''),
  image: z.string().default(''),
  heading: z.string().min(1, 'Feature heading is required'),
  description: z.string().default(''),
  link: z.string().default('#'),
  buttonText: z.string().default('Find Out More'),
});

export const FeaturesSchema = z.object({
  status: z.boolean().default(true),
  title: z.string().default('Features'),
  heading: z.string().default(''),
  description: z.string().default(''),
  buyNowLink: z.string().default(''),
  cards: z.array(FeatureCardSchema).default([]),
});

export const HighlightCardSchema = z.object({
  id: z.string().optional(),
  logo: z.string().default(''),
  heading: z.string().min(1, 'Highlight heading is required'),
  description: z.string().default(''),
  link: z.string().default('#'),
  buttonText: z.string().default('Find Out More'),
});

export const HighlightSchema = z.object({
  status: z.boolean().default(true),
  heading: z.string().min(1, 'Highlight section heading is required'),
  description: z.string().default(''),
  image: z.string().default(''),
  cards: z.array(HighlightCardSchema).default([]),
});

export const ScreenshotItemSchema = z.object({
  id: z.string().optional(),
  image: z.string().min(1, 'Image URL/path is required'),
  heading: z.string().min(1, 'Screenshot heading is required'),
});

export const ScreenshotsSchema = z.object({
  status: z.boolean().default(true),
  heading: z.string().default(''),
  description: z.string().default(''),
  items: z.array(ScreenshotItemSchema).default([]),
});

export const BuiltTechCardSchema = z.object({
  id: z.string().optional(),
  logo: z.string().default(''),
  heading: z.string().min(1, 'Card heading is required'),
  description: z.string().default(''),
  link: z.string().default('#'),
  buttonText: z.string().default('Find Out More'),
});

export const BuiltTechSchema = z.object({
  status: z.boolean().default(true),
  heading: z.string().min(1, 'Section heading is required'),
  description: z.string().default(''),
  cards: z.array(BuiltTechCardSchema).default([]),
});

export const PackageDetailsSchema = z.object({
  status: z.boolean().default(true),
  heading: z.string().min(1, 'Heading is required'),
  shortDescription: z.string().default(''),
  longDescription: z.string().default(''),
  link: z.string().default(''),
  buttonText: z.string().default('Get the Package'),
});

export const ReviewItemSchema = z.object({
  id: z.string().optional(),
  tag: z.string().default('FEATURED'),
  heading: z.string().min(1, 'Review heading is required'),
  description: z.string().min(1, 'Review description is required'),
  image: z.string().default(''),
  link: z.string().default('#'),
  buttonText: z.string().default('View Live Demo'),
});

export const ReviewsSchema = z.object({
  status: z.boolean().default(true),
  items: z.array(ReviewItemSchema).default([]),
});

export const FaqItemSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
});

export const FaqSchema = z.object({
  status: z.boolean().default(true),
  title: z.string().default('FAQ'),
  heading: z.string().default('Frequently Asked Questions'),
  description: z.string().default(''),
  items: z.array(FaqItemSchema).default([]),
});

export const JoinUsSchema = z.object({
  status: z.boolean().default(true),
  heading: z.string().min(1, 'Heading is required'),
  description: z.string().default(''),
  buttonText: z.string().default('Join Our Community'),
  buttonLink: z.string().default('#'),
});

export const FooterLinkSchema = z.object({
  title: z.string().min(1, 'Link title is required'),
  link: z.string().default('#'),
});

export const FooterSectionSchema = z.object({
  heading: z.string().min(1, 'Section heading is required'),
  links: z.array(FooterLinkSchema).default([]),
});

export const FooterSchema = z.object({
  status: z.boolean().default(true),
  logo: z.string().default(''),
  description: z.string().default(''),
  copyright: z.string().default('All Rights Reserved'),
  supportLink: z.string().default('#'),
  websiteName: z.string().default('workdo.io'),
  websiteUrl: z.string().default('https://workdo.io/'),
  sections: z.array(FooterSectionSchema).default([]),
});

export const SeoSchema = z.object({
  metaTitle: z.string().default(''),
  metaKeywords: z.string().default(''),
  metaDescription: z.string().default(''),
  metaImage: z.string().default(''),
  googleAnalyticsId: z.string().default(''),
  facebookPixelId: z.string().default(''),
});

export const PixelItemSchema = z.object({
  id: z.string().optional(),
  platform: z.enum([
    'facebook',
    'twitter',
    'linkedin',
    'pinterest',
    'quora',
    'bing',
    'google-adwords',
    'google-analytics',
    'snapchat',
    'tiktok',
  ]),
  pixelId: z.string().min(1, 'Pixel ID is required'),
});

export const CustomCodeSchema = z.object({
  customCss: z.string().default(''),
  customJs: z.string().default(''),
});

export const CustomPageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Page name is required'),
  slug: z.string().min(1, 'Page slug is required'),
  shortDescription: z.string().optional(),
  content: z.string().optional(),
  pageUrl: z.string().optional(),
  templateType: z.enum(['content', 'url']).default('content'),
  header: z.boolean().default(true),
  footer: z.boolean().default(true),
  loginRequired: z.boolean().default(false),
});

export const SectionSequenceSchema = z.object({
  sequence: z.array(z.string()),
});
