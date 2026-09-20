import { connectToDatabase } from '@/lib/db';
import { LandingPageSetting } from '@/models/LandingPageSetting';
import type {
  ILandingPageData,
  ICustomPageItem,
} from '@/types/landing-page';

// ============================================================================
// Master Default Landing Page Data (WorkDo Replication)
// ============================================================================

export const DEFAULT_LANDING_PAGE_DATA: ILandingPageData = {
  topbar: {
    status: true,
    notificationMsg: '70% Special Offer. Don’t Miss it. The offer ends in 72 hours.',
  },
  hero: {
    status: true,
    offerText: '70% Special Offer',
    title: 'Home',
    heading:
      'Empowering Businesses with Seamless Booking Management Solutions and Enhanced Customer Experiences.',
    description:
      'Simplify your booking processes with BookingGo SaaS, the ultimate solution for efficient and hassle-free booking management.',
    trustedBy: 'Our best partners and +11,000 customers worldwide satisfied with our services.',
    liveDemoLink: '/login',
    buyNowLink: '',
    bannerImage: '/images/landing/hero-banner.png',
    buttonText: 'View Live Demo',
    partnerLogos: [
      '/images/landing/partners/partner-1.svg',
      '/images/landing/partners/partner-2.svg',
      '/images/landing/partners/partner-3.svg',
      '/images/landing/partners/partner-4.svg',
    ],
  },
  features: {
    status: true,
    title: 'Features',
    heading: 'Streamlined Booking & Operations for Growing Businesses',
    description:
      'BookingGo SaaS simplifies the booking lifecycle, allowing businesses to efficiently manage appointments, schedules, and staff through intuitive tools.',
    buyNowLink: '',
    cards: [
      {
        id: 'feat-1',
        logo: 'calendar',
        heading: 'Streamlined Booking Management',
        description:
          'Simplify appointment scheduling, calendar sync, and real-time slot management to save valuable time and eliminate double bookings.',
        link: '#',
        buttonText: 'Find Out More',
      },
      {
        id: 'feat-2',
        logo: 'users',
        heading: 'Enhanced Customer Experience',
        description:
          'Provide customers with a modern, mobile-first booking experience with automated confirmations, reminders, and custom fields.',
        link: '#',
        buttonText: 'Find Out More',
      },
      {
        id: 'feat-3',
        logo: 'chart',
        heading: 'Comprehensive Business Insights',
        description:
          'Gain deep visibility into booking revenue, customer frequency, and staff utilization with real-time operational analytics.',
        link: '#',
        buttonText: 'Find Out More',
      },
    ],
  },
  highlight: {
    status: true,
    heading: 'Why Choose Dedicated Modules for Your Business?',
    description:
      'With BookingGo, you can conveniently manage all your business functions from a single unified hub.',
    image: '/images/landing/dedicated.png',
    cards: [
      {
        id: 'high-1',
        logo: 'camera',
        heading: 'Photography Studio Business Theme',
        description:
          'Customizable booking flows tailored for photography studios, studio rental slots, package add-ons, and automated deposits.',
        link: '#',
        buttonText: 'Explore Theme',
      },
      {
        id: 'high-2',
        logo: 'tool',
        heading: 'Auto & Car Services Business Theme',
        description:
          'Specialized appointment scheduling for vehicle inspection, maintenance slots, diagnostic add-ons, and instant price estimations.',
        link: '#',
        buttonText: 'Explore Theme',
      },
      {
        id: 'high-3',
        logo: 'tag',
        heading: 'Custom Status Workflow Engine',
        description:
          'Define bespoke appointment lifecycle statuses matching your unique business operations with automated color coding and alerts.',
        link: '#',
        buttonText: 'Explore Module',
      },
      {
        id: 'high-4',
        logo: 'clock',
        heading: 'Slot Capacity & Overbooking Guard',
        description:
          'Maximize capacity without overloading staff. Define concurrent capacity limits per time slot for seamless customer flows.',
        link: '#',
        buttonText: 'Explore Module',
      },
    ],
  },
  screenshots: {
    status: true,
    heading: 'Explore Our Intuitive Interface',
    description:
      'Engineered for clarity and speed. Manage bookings, services, and staff from desktop or mobile effortlessly.',
    items: [
      { id: 'screen-1', image: '/images/landing/screenshot-1.png', heading: 'Executive Dashboard & Analytics' },
      { id: 'screen-2', image: '/images/landing/screenshot-2.png', heading: 'Interactive Booking Wizard' },
      { id: 'screen-3', image: '/images/landing/screenshot-3.png', heading: 'Staff Scheduling & Availability' },
      { id: 'screen-4', image: '/images/landing/screenshot-4.png', heading: 'Real-time Appointment Calendar' },
      { id: 'screen-5', image: '/images/landing/screenshot-5.png', heading: 'Payment & Invoice Management' },
    ],
  },
  builtTech: {
    status: true,
    heading: 'Built with Technology You Can Trust',
    description:
      'Engineered with Next.js 16, TypeScript, Tailwind CSS, and MongoDB Atlas for sub-second responses and enterprise stability.',
    cards: [
      {
        id: 'tech-1',
        logo: 'nextjs',
        heading: 'Next.js 16 App Router',
        description:
          'Lightning-fast Server Components, streaming SSR, and edge caching deliver unrivaled page load performance.',
        link: '#',
        buttonText: 'Find Out More',
      },
      {
        id: 'tech-2',
        logo: 'mongodb',
        heading: 'MongoDB Atlas Cloud',
        description:
          'Scalable multi-tenant document architecture with high-availability replication and sub-millisecond query execution.',
        link: '#',
        buttonText: 'Find Out More',
      },
      {
        id: 'tech-3',
        logo: 'shield',
        heading: 'Role-Based Access Control',
        description:
          'Enterprise-grade multi-tenant permission matrix safeguarding company data and staff access boundaries.',
        link: '#',
        buttonText: 'Find Out More',
      },
      {
        id: 'tech-4',
        logo: 'credit-card',
        heading: 'Multi-Gateway Payments',
        description:
          'Native support for Stripe, PayPal, and verified Bank Transfer payments with automated receipt generation.',
        link: '#',
        buttonText: 'Find Out More',
      },
    ],
  },
  packageDetails: {
    status: true,
    heading: 'Start an Online Booking Business with a Complete SaaS Package',
    shortDescription:
      'Get a multi-tenant booking appointment SaaS with complete CRM, staff management, and automated payment gateways.',
    longDescription:
      'An all-in-one software package designed for entrepreneurs, clinics, salons, fitness studios, and professional service providers. Expand your client base, eliminate scheduling confusion, and streamline online payments from day one.',
    link: '/register',
    buttonText: 'Get the Package',
  },
  reviews: {
    status: true,
    items: [
      {
        id: 'rev-1',
        tag: 'SOLID FOUNDATION',
        heading: 'Transformed our client booking efficiency overnight',
        description:
          'BookingGo gave our clinic a unified, professional appointment experience. Automated email reminders reduced client no-shows by 80% in the first month alone.',
        link: '/login',
        buttonText: 'View Live Demo',
      },
      {
        id: 'rev-2',
        tag: 'ENTERPRISE SCALING',
        heading: 'Effortless multi-location staff management',
        description:
          'Managing over 20 specialists across multiple branches used to require multiple spreadsheets. With BookingGo, each staff member manages their hours with pinpoint precision.',
        link: '/login',
        buttonText: 'View Live Demo',
      },
      {
        id: 'rev-3',
        tag: 'HIGH CONVERSION',
        heading: 'The booking wizard converts visitors into paying clients',
        description:
          'The mobile booking wizard is blazingly fast. Our customers love how effortless it is to pick a service, select a specialist, and pay via Stripe within seconds.',
        link: '/login',
        buttonText: 'View Live Demo',
      },
    ],
  },
  faq: {
    status: true,
    title: 'FAQ',
    heading: 'Frequently Asked Questions',
    description: 'Find answers to common questions regarding BookingGo SaaS platform features and setup.',
    items: [
      {
        id: 'faq-1',
        question: 'How does BookingGo handle multi-tenant business companies?',
        answer:
          'Every registered company operates in an isolated workspace with their own unique services, staff specialists, locations, customer records, and appointment schedules.',
      },
      {
        id: 'faq-2',
        question: 'Can clients pay online when booking an appointment?',
        answer:
          'Yes, companies can enable Stripe Elements, PayPal Smart Buttons, or Manual Bank Transfers to collect instant payments or service deposits during checkout.',
      },
      {
        id: 'faq-3',
        question: 'Can I customize the public booking pages with my own brand?',
        answer:
          'Absolutely. Companies can customize themes, brand colors, business logos, custom domain mappings, and personalized notification templates.',
      },
      {
        id: 'faq-4',
        question: 'Are automated email notifications and reminders supported?',
        answer:
          'Yes, customizable HTML email templates trigger automatically for booking confirmations, cancellations, reschedules, and specialist notifications via SMTP.',
      },
    ],
  },
  joinUs: {
    status: true,
    heading: 'Join Thousands of Satisfied Businesses Today',
    description:
      'Start accepting bookings online with the ultimate scheduling platform. Create your free account in less than 2 minutes.',
    buttonText: 'Get Started for Free',
    buttonLink: '/register',
  },
  footer: {
    status: true,
    logo: '/images/landing/footer-logo.png',
    description: 'We build modern web tools to help you jump-start your daily business appointment operations.',
    copyright: 'All Rights Reserved to',
    supportLink: '/contact',
    websiteName: 'BookingGo SaaS',
    websiteUrl: 'https://bookinggo.io/',
    sections: [
      {
        heading: 'Company',
        links: [
          { title: 'About Us', link: '/pages/about_us' },
          { title: 'Pricing Plans', link: '/pricing' },
          { title: 'Blog', link: '/blog' },
          { title: 'Contact', link: '/contact' },
        ],
      },
      {
        heading: 'Help & Support',
        links: [
          { title: 'Knowledge Base', link: '#' },
          { title: 'Contact Support', link: '/contact' },
          { title: 'API Documentation', link: '#' },
          { title: 'System Status', link: '#' },
        ],
      },
      {
        heading: 'Legal',
        links: [
          { title: 'Terms & Conditions', link: '/pages/terms_and_conditions' },
          { title: 'Privacy Policy', link: '/pages/privacy_policy' },
          { title: 'License Agreement', link: '#' },
        ],
      },
    ],
  },
  seo: {
    metaTitle: 'BookingGo - Modern Appointment & SaaS Management',
    metaKeywords: 'appointment booking, scheduling saas, workdo, nextjs booking engine, stripe payments',
    metaDescription:
      'All-in-one booking and appointment management platform for businesses, clinics, salons, and consultants.',
    metaImage: '/images/landing/og-cover.png',
    googleAnalyticsId: '',
    facebookPixelId: '',
  },
  pixels: [],
  customCode: {
    customCss: '',
    customJs: '',
  },
  customPages: [
    {
      id: 'page-about',
      name: 'About Us',
      slug: 'about_us',
      shortDescription:
        'BookingGo offers comprehensive web scheduling solutions to businesses. We aim to provide products that are beautifully designed, user friendly, and a delight to use.',
      content:
        '<p>At BookingGo, our vision is to become the leading destination for business scheduling by creating disruptive web solutions accessible to all.</p><p>We diligently work towards bringing our clients IT solutions that transform how their appointments function. Rather than confuse you with complex booking engines, we focus on delivering streamlined, intuitive tools.</p>',
      templateType: 'content',
      header: true,
      footer: true,
      loginRequired: false,
    },
    {
      id: 'page-terms',
      name: 'Terms and Conditions',
      slug: 'terms_and_conditions',
      shortDescription:
        'Our Terms and Conditions outline user agreements, data protection policies, payment terms, and intellectual property rights.',
      content:
        '<p><strong>Service Agreement:</strong> Users agree to abide by the terms outlined in the Service Agreement, which governs the use of BookingGo SaaS and its features.</p><p><strong>Data Protection:</strong> BookingGo SaaS prioritizes user privacy and data protection, adhering to strict policies and regulations to safeguard sensitive information.</p><p><strong>Payment Terms:</strong> Users are responsible for adhering to the payment terms specified in their active plan subscription tier.</p>',
      templateType: 'content',
      header: false,
      footer: true,
      loginRequired: false,
    },
    {
      id: 'page-privacy',
      name: 'Privacy Policy',
      slug: 'privacy_policy',
      shortDescription:
        'Protecting your privacy is our priority at BookingGo SaaS, ensuring your data is used transparently and securely.',
      content:
        '<p>At BookingGo SaaS, we prioritize your privacy and are committed to safeguarding your personal information.</p><p>Our privacy policy outlines the types of data we collect, how we use it, and the measures we take to protect it. We collect information strictly to enhance user experience, provide personalized booking services, and ensure platform security.</p>',
      templateType: 'content',
      header: false,
      footer: true,
      loginRequired: false,
    },
  ],
  sectionSequence: [
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
};

// ============================================================================
// Core Database Helpers
// ============================================================================

/**
 * Ensures the singleton LandingPageSetting document exists in MongoDB Atlas.
 * Automatically seeds default WorkDo content if not found.
 */
export async function ensureLandingPageSettingsSeeded(): Promise<ILandingPageData> {
  await connectToDatabase();

  let doc = await LandingPageSetting.findOne({ slug: 'default' });
  if (!doc) {
    doc = await LandingPageSetting.create({
      slug: 'default',
      ...DEFAULT_LANDING_PAGE_DATA,
    });
  }

  return cleanLandingPagePayload(doc);
}

/**
 * Fast SSR Provider for the public marketing landing page (`/`).
 * Retrieves dynamic landing page settings with fallback to default data.
 */
export async function getPublicLandingPageData(): Promise<ILandingPageData> {
  try {
    await connectToDatabase();
    const doc = await LandingPageSetting.findOne({ slug: 'default' }).lean();
    if (!doc) {
      return await ensureLandingPageSettingsSeeded();
    }
    return cleanLandingPagePayload(doc);
  } catch (error) {
    console.error('[getPublicLandingPageData] Failed to load landing page settings, returning defaults:', error);
    return DEFAULT_LANDING_PAGE_DATA;
  }
}

/**
 * Retrieves a published custom CMS page by its slug (e.g. `about_us`, `terms_and_conditions`).
 */
export async function getCustomPageBySlug(slug: string): Promise<ICustomPageItem | null> {
  try {
    const data = await getPublicLandingPageData();
    const cleanSlug = slug.toLowerCase().trim();
    const page = data.customPages.find((p) => p.slug === cleanSlug);
    return page || null;
  } catch (error) {
    console.error(`[getCustomPageBySlug] Error looking up page ${slug}:`, error);
    return null;
  }
}

/**
 * Generates tracking script tags safely for Super Admin pixel integrations.
 */
export function generatePlatformPixelSnippet(platform: string, pixelId: string): string {
  if (!pixelId) return '';

  switch (platform) {
    case 'facebook':
      return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${pixelId}');fbq('track', 'PageView');`;
    case 'google-analytics':
      return `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${pixelId}');`;
    default:
      return `/* Pixel: ${platform} (${pixelId}) */`;
  }
}

/**
 * Serializes raw MongoDB document into clean TypeScript ILandingPageData payload.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanLandingPagePayload(rawDoc: any): ILandingPageData {
  return {
    topbar: {
      status: rawDoc.topbar?.status ?? true,
      notificationMsg: rawDoc.topbar?.notificationMsg ?? DEFAULT_LANDING_PAGE_DATA.topbar.notificationMsg,
    },
    hero: {
      status: rawDoc.hero?.status ?? true,
      offerText: rawDoc.hero?.offerText ?? DEFAULT_LANDING_PAGE_DATA.hero.offerText,
      title: rawDoc.hero?.title ?? DEFAULT_LANDING_PAGE_DATA.hero.title,
      heading: rawDoc.hero?.heading ?? DEFAULT_LANDING_PAGE_DATA.hero.heading,
      description: rawDoc.hero?.description ?? DEFAULT_LANDING_PAGE_DATA.hero.description,
      trustedBy: rawDoc.hero?.trustedBy ?? DEFAULT_LANDING_PAGE_DATA.hero.trustedBy,
      liveDemoLink: rawDoc.hero?.liveDemoLink ?? DEFAULT_LANDING_PAGE_DATA.hero.liveDemoLink,
      buyNowLink: rawDoc.hero?.buyNowLink ?? '',
      bannerImage: rawDoc.hero?.bannerImage ?? DEFAULT_LANDING_PAGE_DATA.hero.bannerImage,
      buttonText: rawDoc.hero?.buttonText ?? DEFAULT_LANDING_PAGE_DATA.hero.buttonText,
      partnerLogos: rawDoc.hero?.partnerLogos ?? DEFAULT_LANDING_PAGE_DATA.hero.partnerLogos,
    },
    features: {
      status: rawDoc.features?.status ?? true,
      title: rawDoc.features?.title ?? DEFAULT_LANDING_PAGE_DATA.features.title,
      heading: rawDoc.features?.heading ?? DEFAULT_LANDING_PAGE_DATA.features.heading,
      description: rawDoc.features?.description ?? DEFAULT_LANDING_PAGE_DATA.features.description,
      buyNowLink: rawDoc.features?.buyNowLink ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cards: (rawDoc.features?.cards ?? DEFAULT_LANDING_PAGE_DATA.features.cards).map((c: any) => ({
        id: c.id || c._id?.toString() || '',
        logo: c.logo || '',
        heading: c.heading || '',
        description: c.description || '',
        link: c.link || '#',
        buttonText: c.buttonText || 'Find Out More',
      })),
    },
    highlight: {
      status: rawDoc.highlight?.status ?? true,
      heading: rawDoc.highlight?.heading ?? DEFAULT_LANDING_PAGE_DATA.highlight.heading,
      description: rawDoc.highlight?.description ?? DEFAULT_LANDING_PAGE_DATA.highlight.description,
      image: rawDoc.highlight?.image ?? DEFAULT_LANDING_PAGE_DATA.highlight.image,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cards: (rawDoc.highlight?.cards ?? DEFAULT_LANDING_PAGE_DATA.highlight.cards).map((c: any) => ({
        id: c.id || c._id?.toString() || '',
        logo: c.logo || '',
        heading: c.heading || '',
        description: c.description || '',
        link: c.link || '#',
        buttonText: c.buttonText || 'Find Out More',
      })),
    },
    screenshots: {
      status: rawDoc.screenshots?.status ?? true,
      heading: rawDoc.screenshots?.heading ?? DEFAULT_LANDING_PAGE_DATA.screenshots.heading,
      description: rawDoc.screenshots?.description ?? DEFAULT_LANDING_PAGE_DATA.screenshots.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (rawDoc.screenshots?.items ?? DEFAULT_LANDING_PAGE_DATA.screenshots.items).map((s: any) => ({
        id: s.id || s._id?.toString() || '',
        image: s.image || '',
        heading: s.heading || '',
      })),
    },
    builtTech: {
      status: rawDoc.builtTech?.status ?? true,
      heading: rawDoc.builtTech?.heading ?? DEFAULT_LANDING_PAGE_DATA.builtTech.heading,
      description: rawDoc.builtTech?.description ?? DEFAULT_LANDING_PAGE_DATA.builtTech.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cards: (rawDoc.builtTech?.cards ?? DEFAULT_LANDING_PAGE_DATA.builtTech.cards).map((c: any) => ({
        id: c.id || c._id?.toString() || '',
        logo: c.logo || '',
        heading: c.heading || '',
        description: c.description || '',
        link: c.link || '#',
        buttonText: c.buttonText || 'Find Out More',
      })),
    },
    packageDetails: {
      status: rawDoc.packageDetails?.status ?? true,
      heading: rawDoc.packageDetails?.heading ?? DEFAULT_LANDING_PAGE_DATA.packageDetails.heading,
      shortDescription:
        rawDoc.packageDetails?.shortDescription ?? DEFAULT_LANDING_PAGE_DATA.packageDetails.shortDescription,
      longDescription:
        rawDoc.packageDetails?.longDescription ?? DEFAULT_LANDING_PAGE_DATA.packageDetails.longDescription,
      link: rawDoc.packageDetails?.link ?? DEFAULT_LANDING_PAGE_DATA.packageDetails.link,
      buttonText: rawDoc.packageDetails?.buttonText ?? DEFAULT_LANDING_PAGE_DATA.packageDetails.buttonText,
    },
    reviews: {
      status: rawDoc.reviews?.status ?? true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (rawDoc.reviews?.items ?? DEFAULT_LANDING_PAGE_DATA.reviews.items).map((r: any) => ({
        id: r.id || r._id?.toString() || '',
        tag: r.tag || 'FEATURED',
        heading: r.heading || '',
        description: r.description || '',
        link: r.link || '/login',
        buttonText: r.buttonText || 'View Live Demo',
      })),
    },
    faq: {
      status: rawDoc.faq?.status ?? true,
      title: rawDoc.faq?.title ?? DEFAULT_LANDING_PAGE_DATA.faq.title,
      heading: rawDoc.faq?.heading ?? DEFAULT_LANDING_PAGE_DATA.faq.heading,
      description: rawDoc.faq?.description ?? DEFAULT_LANDING_PAGE_DATA.faq.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (rawDoc.faq?.items ?? DEFAULT_LANDING_PAGE_DATA.faq.items).map((f: any) => ({
        id: f.id || f._id?.toString() || '',
        question: f.question || '',
        answer: f.answer || '',
      })),
    },
    joinUs: {
      status: rawDoc.joinUs?.status ?? true,
      heading: rawDoc.joinUs?.heading ?? DEFAULT_LANDING_PAGE_DATA.joinUs.heading,
      description: rawDoc.joinUs?.description ?? DEFAULT_LANDING_PAGE_DATA.joinUs.description,
      buttonText: rawDoc.joinUs?.buttonText ?? DEFAULT_LANDING_PAGE_DATA.joinUs.buttonText,
      buttonLink: rawDoc.joinUs?.buttonLink ?? DEFAULT_LANDING_PAGE_DATA.joinUs.buttonLink,
    },
    footer: {
      status: rawDoc.footer?.status ?? true,
      logo: rawDoc.footer?.logo ?? DEFAULT_LANDING_PAGE_DATA.footer.logo,
      description: rawDoc.footer?.description ?? DEFAULT_LANDING_PAGE_DATA.footer.description,
      copyright: rawDoc.footer?.copyright ?? DEFAULT_LANDING_PAGE_DATA.footer.copyright,
      supportLink: rawDoc.footer?.supportLink ?? DEFAULT_LANDING_PAGE_DATA.footer.supportLink,
      websiteName: rawDoc.footer?.websiteName ?? DEFAULT_LANDING_PAGE_DATA.footer.websiteName,
      websiteUrl: rawDoc.footer?.websiteUrl ?? DEFAULT_LANDING_PAGE_DATA.footer.websiteUrl,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sections: (rawDoc.footer?.sections ?? DEFAULT_LANDING_PAGE_DATA.footer.sections).map((sec: any) => ({
        heading: sec.heading || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        links: (sec.links ?? []).map((l: any) => ({
          title: l.title || '',
          link: l.link || '#',
        })),
      })),
    },
    seo: {
      metaTitle: rawDoc.seo?.metaTitle ?? DEFAULT_LANDING_PAGE_DATA.seo.metaTitle,
      metaKeywords: rawDoc.seo?.metaKeywords ?? DEFAULT_LANDING_PAGE_DATA.seo.metaKeywords,
      metaDescription: rawDoc.seo?.metaDescription ?? DEFAULT_LANDING_PAGE_DATA.seo.metaDescription,
      metaImage: rawDoc.seo?.metaImage ?? DEFAULT_LANDING_PAGE_DATA.seo.metaImage,
      googleAnalyticsId: rawDoc.seo?.googleAnalyticsId ?? '',
      facebookPixelId: rawDoc.seo?.facebookPixelId ?? '',
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pixels: (rawDoc.pixels ?? []).map((p: any) => ({
      id: p.id || p._id?.toString() || '',
      platform: p.platform,
      pixelId: p.pixelId,
    })),
    customCode: {
      customCss: rawDoc.customCode?.customCss ?? '',
      customJs: rawDoc.customCode?.customJs ?? '',
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customPages: (rawDoc.customPages ?? DEFAULT_LANDING_PAGE_DATA.customPages).map((p: any) => ({
      id: p.id || p._id?.toString() || '',
      name: p.name || '',
      slug: p.slug || '',
      shortDescription: p.shortDescription || '',
      content: p.content || '',
      pageUrl: p.pageUrl || '',
      templateType: p.templateType || 'content',
      header: p.header ?? true,
      footer: p.footer ?? true,
      loginRequired: p.loginRequired ?? false,
    })),
    sectionSequence: rawDoc.sectionSequence ?? DEFAULT_LANDING_PAGE_DATA.sectionSequence,
  };
}
