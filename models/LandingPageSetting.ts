import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type {
  ITopbarSetting,
  IHeroSetting,
  IFeatureCard,
  IFeaturesSetting,
  IHighlightCard,
  IHighlightSetting,
  IScreenshotItem,
  IScreenshotsSetting,
  IBuiltTechCard,
  IBuiltTechSetting,
  IPackageDetailsSetting,
  IReviewItem,
  IReviewsSetting,
  IFaqItem,
  IFaqSetting,
  IJoinUsSetting,
  IFooterLink,
  IFooterSection,
  IFooterSetting,
  ISeoSetting,
  IPixelItem,
  ICustomCodeSetting,
  ICustomPageItem,
} from '@/types/landing-page';

export interface ILandingPageSettingDocument extends Document {
  slug: string;
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
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// Subschemas
// ----------------------------------------------------------------------------

const TopbarSchema = new Schema<ITopbarSetting>(
  {
    status: { type: Boolean, default: true },
    notificationMsg: {
      type: String,
      default: '70% Special Offer. Don’t Miss it. The offer ends in 72 hours.',
      trim: true,
    },
  },
  { _id: false }
);

const HeroSchema = new Schema<IHeroSetting>(
  {
    status: { type: Boolean, default: true },
    offerText: { type: String, default: '70% Special Offer', trim: true },
    title: { type: String, default: 'Home', trim: true },
    heading: {
      type: String,
      default:
        'Empowering Businesses with Seamless Booking Management Solutions and Enhanced Customer Experiences.',
      trim: true,
    },
    description: {
      type: String,
      default:
        'Simplify your booking processes with BookingGo SaaS, the ultimate solution for efficient and hassle-free booking management.',
      trim: true,
    },
    trustedBy: {
      type: String,
      default: 'Our best partners and +11,000 customers worldwide satisfied with our services.',
      trim: true,
    },
    liveDemoLink: { type: String, default: '/login', trim: true },
    buyNowLink: { type: String, default: '', trim: true },
    bannerImage: { type: String, default: '/images/landing/hero-banner.png', trim: true },
    buttonText: { type: String, default: 'View Live Demo', trim: true },
    partnerLogos: { type: [String], default: [] },
  },
  { _id: false }
);

const FeatureCardSchema = new Schema<IFeatureCard>(
  {
    id: { type: String, required: true },
    logo: { type: String, default: '', trim: true },
    image: { type: String, default: '', trim: true },
    heading: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    link: { type: String, default: '#', trim: true },
    buttonText: { type: String, default: 'Find Out More', trim: true },
  },
  { _id: false }
);

const FeaturesSchema = new Schema<IFeaturesSetting>(
  {
    status: { type: Boolean, default: true },
    title: { type: String, default: 'Features', trim: true },
    heading: { type: String, default: 'Powerful Features for Modern Scheduling', trim: true },
    description: {
      type: String,
      default: 'Everything you need to automate bookings, payments, and customer management.',
      trim: true,
    },
    buyNowLink: { type: String, default: '', trim: true },
    cards: { type: [FeatureCardSchema], default: [] },
  },
  { _id: false }
);

const HighlightCardSchema = new Schema<IHighlightCard>(
  {
    id: { type: String, required: true },
    logo: { type: String, default: '', trim: true },
    heading: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    link: { type: String, default: '#', trim: true },
    buttonText: { type: String, default: 'Find Out More', trim: true },
  },
  { _id: false }
);

const HighlightSchema = new Schema<IHighlightSetting>(
  {
    status: { type: Boolean, default: true },
    heading: {
      type: String,
      default: 'Why Choose Dedicated Modules for Your Business?',
      trim: true,
    },
    description: {
      type: String,
      default:
        'With BookingGo, you can conveniently manage all your business functions from a single unified hub.',
      trim: true,
    },
    image: { type: String, default: '/images/landing/dedicated.png', trim: true },
    cards: { type: [HighlightCardSchema], default: [] },
  },
  { _id: false }
);

const ScreenshotItemSchema = new Schema<IScreenshotItem>(
  {
    id: { type: String, required: true },
    image: { type: String, required: true, trim: true },
    heading: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ScreenshotsSchema = new Schema<IScreenshotsSetting>(
  {
    status: { type: Boolean, default: true },
    heading: { type: String, default: 'Platform Preview & Screenshots', trim: true },
    description: {
      type: String,
      default: 'Take a visual tour through our lightning-fast booking workflows.',
      trim: true,
    },
    items: { type: [ScreenshotItemSchema], default: [] },
  },
  { _id: false }
);

const BuiltTechCardSchema = new Schema<IBuiltTechCard>(
  {
    id: { type: String, required: true },
    logo: { type: String, default: '', trim: true },
    heading: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    link: { type: String, default: '#', trim: true },
    buttonText: { type: String, default: 'Find Out More', trim: true },
  },
  { _id: false }
);

const BuiltTechSchema = new Schema<IBuiltTechSetting>(
  {
    status: { type: Boolean, default: true },
    heading: {
      type: String,
      default: 'Built with Technology You Can Trust',
      trim: true,
    },
    description: {
      type: String,
      default:
        'Engineered with Next.js 16, TypeScript, Tailwind CSS, and MongoDB Atlas for sub-second responses and enterprise stability.',
      trim: true,
    },
    cards: { type: [BuiltTechCardSchema], default: [] },
  },
  { _id: false }
);

const PackageDetailsSchema = new Schema<IPackageDetailsSetting>(
  {
    status: { type: Boolean, default: true },
    heading: {
      type: String,
      default: 'Start an Online Booking Business with a Complete SaaS Package',
      trim: true,
    },
    shortDescription: {
      type: String,
      default:
        'Get a multi-tenant booking appointment SaaS with complete CRM, staff management, and automated payment gateways.',
      trim: true,
    },
    longDescription: {
      type: String,
      default:
        'A comprehensive platform giving you everything needed to manage client appointments, accept credit card and bank transfer payments, automate reminders, and grow your subscription revenue.',
      trim: true,
    },
    link: { type: String, default: '/register', trim: true },
    buttonText: { type: String, default: 'Get Started Today', trim: true },
  },
  { _id: false }
);

const ReviewItemSchema = new Schema<IReviewItem>(
  {
    id: { type: String, required: true },
    tag: { type: String, default: 'SOLID FOUNDATION', trim: true },
    heading: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    image: { type: String, default: '', trim: true },
    link: { type: String, default: '/login', trim: true },
    buttonText: { type: String, default: 'View Live Demo', trim: true },
  },
  { _id: false }
);

const ReviewsSchema = new Schema<IReviewsSetting>(
  {
    status: { type: Boolean, default: true },
    items: { type: [ReviewItemSchema], default: [] },
  },
  { _id: false }
);

const FaqItemSchema = new Schema<IFaqItem>(
  {
    id: { type: String, required: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const FaqSchema = new Schema<IFaqSetting>(
  {
    status: { type: Boolean, default: true },
    title: { type: String, default: 'FAQ', trim: true },
    heading: { type: String, default: 'Frequently Asked Questions', trim: true },
    description: {
      type: String,
      default: 'Find quick answers to common questions about BookingGo SaaS.',
      trim: true,
    },
    items: { type: [FaqItemSchema], default: [] },
  },
  { _id: false }
);

const JoinUsSchema = new Schema<IJoinUsSetting>(
  {
    status: { type: Boolean, default: true },
    heading: { type: String, default: 'Join Our Growing Platform Today', trim: true },
    description: {
      type: String,
      default: 'Empower your booking schedule and eliminate appointment no-shows.',
      trim: true,
    },
    buttonText: { type: String, default: 'Create Free Account', trim: true },
    buttonLink: { type: String, default: '/register', trim: true },
  },
  { _id: false }
);

const FooterLinkSchema = new Schema<IFooterLink>(
  {
    title: { type: String, required: true, trim: true },
    link: { type: String, default: '#', trim: true },
  },
  { _id: false }
);

const FooterSectionSchema = new Schema<IFooterSection>(
  {
    heading: { type: String, required: true, trim: true },
    links: { type: [FooterLinkSchema], default: [] },
  },
  { _id: false }
);

const FooterSchema = new Schema<IFooterSetting>(
  {
    status: { type: Boolean, default: true },
    logo: { type: String, default: '/images/landing/footer-logo.png', trim: true },
    description: {
      type: String,
      default: 'We build modern web tools to help you jump-start your daily appointment operations.',
      trim: true,
    },
    copyright: { type: String, default: 'All Rights Reserved to', trim: true },
    supportLink: { type: String, default: '/contact', trim: true },
    websiteName: { type: String, default: 'BookingGo SaaS', trim: true },
    websiteUrl: { type: String, default: 'https://bookinggo.io/', trim: true },
    sections: { type: [FooterSectionSchema], default: [] },
  },
  { _id: false }
);

const SeoSchema = new Schema<ISeoSetting>(
  {
    metaTitle: { type: String, default: 'BookingGo - Modern Appointment & SaaS Management', trim: true },
    metaKeywords: {
      type: String,
      default: 'appointment booking, scheduling saas, workdo, nextjs booking engine',
      trim: true,
    },
    metaDescription: {
      type: String,
      default:
        'All-in-one booking and appointment management platform for businesses, clinics, salons, and consultants.',
      trim: true,
    },
    metaImage: { type: String, default: '', trim: true },
    googleAnalyticsId: { type: String, default: '', trim: true },
    facebookPixelId: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const PixelItemSchema = new Schema<IPixelItem>(
  {
    id: { type: String, required: true },
    platform: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    pixelId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const CustomCodeSchema = new Schema<ICustomCodeSetting>(
  {
    customCss: { type: String, default: '' },
    customJs: { type: String, default: '' },
  },
  { _id: false }
);

const CustomPageItemSchema = new Schema<ICustomPageItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    shortDescription: { type: String, default: '', trim: true },
    content: { type: String, default: '' },
    pageUrl: { type: String, default: '', trim: true },
    templateType: { type: String, enum: ['content', 'url'], default: 'content' },
    header: { type: Boolean, default: true },
    footer: { type: Boolean, default: true },
    loginRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

// ----------------------------------------------------------------------------
// Master Document Schema
// ----------------------------------------------------------------------------

const LandingPageSettingSchema = new Schema<ILandingPageSettingDocument>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      default: 'default',
      trim: true,
      index: true,
    },
    topbar: { type: TopbarSchema, default: () => ({}) },
    hero: { type: HeroSchema, default: () => ({}) },
    features: { type: FeaturesSchema, default: () => ({}) },
    highlight: { type: HighlightSchema, default: () => ({}) },
    screenshots: { type: ScreenshotsSchema, default: () => ({}) },
    builtTech: { type: BuiltTechSchema, default: () => ({}) },
    packageDetails: { type: PackageDetailsSchema, default: () => ({}) },
    reviews: { type: ReviewsSchema, default: () => ({}) },
    faq: { type: FaqSchema, default: () => ({}) },
    joinUs: { type: JoinUsSchema, default: () => ({}) },
    footer: { type: FooterSchema, default: () => ({}) },
    seo: { type: SeoSchema, default: () => ({}) },
    pixels: { type: [PixelItemSchema], default: [] },
    customCode: { type: CustomCodeSchema, default: () => ({}) },
    customPages: { type: [CustomPageItemSchema], default: [] },
    sectionSequence: {
      type: [String],
      default: [
        'topbar',
        'hero',
        'features',
        'highlight',
        'screenshots',
        'builtTech',
        'packageDetails',
        'reviews',
        'faq',
        'joinUs',
        'footer',
      ],
    },
  },
  {
    timestamps: true,
  }
);

export const LandingPageSetting: Model<ILandingPageSettingDocument> =
  (mongoose.models.LandingPageSetting as Model<ILandingPageSettingDocument>) ||
  mongoose.model<ILandingPageSettingDocument>('LandingPageSetting', LandingPageSettingSchema);

export default LandingPageSetting;
