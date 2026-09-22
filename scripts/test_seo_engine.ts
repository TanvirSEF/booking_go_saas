import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { Business, type IBusiness } from '../models/Business';
import { Service, type IService } from '../models/Service';
import { Blog, type IBlog } from '../models/Blog';
import { User } from '../models/User';
import {
  resolveBusinessSeoMetadata,
  resolveBlogSeoMetadata,
  generateLocalBusinessJsonLd,
  generateBlogPostingJsonLd,
  resolveBaseUrl,
} from '../lib/seo';
import { businessSeoInputSchema } from '../types/seo';
import { GET as getBookingOgImage } from '../app/api/og/booking/route';
import { GET as getBlogOgImage } from '../app/api/og/blog/route';

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition: unknown, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function run() {
  console.log('===============================================================');
  console.log('🚀 Running Live Atlas Integration Tests: SEO & OpenGraph Engine');
  console.log('===============================================================\n');

  await connectToDatabase();

  const testSuffix = `test_${Date.now()}`;
  const companyUser = await User.create({
    name: 'SEO Test Company Owner',
    email: `seo_owner_${testSuffix}@example.com`,
    password: 'Password123!',
    role: 'company',
  });

  const business = await Business.create({
    companyId: companyUser._id,
    name: 'Metropolitan Luxury Spa',
    slug: `metro-spa-${testSuffix}`,
    currency: 'USD',
    currencySymbol: '$',
    themeColor: '#4f46e5',
    businessHours: [
      { dayName: 'Monday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Tuesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Wednesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Thursday', isOpen: true, startTime: '10:00', endTime: '19:00', breakHours: [] },
      { dayName: 'Friday', isOpen: true, startTime: '09:00', endTime: '17:00', breakHours: [] },
      { dayName: 'Saturday', isOpen: false, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Sunday', isOpen: false, startTime: '09:00', endTime: '18:00', breakHours: [] },
    ],
  });

  const testCategoryId = new mongoose.Types.ObjectId();

  await Service.create({
    companyId: companyUser._id,
    businessId: business._id,
    categoryId: testCategoryId,
    name: 'Signature Swedish Massage',
    durationMinutes: 60,
    price: 120,
    isActive: true,
  });

  await Service.create({
    companyId: companyUser._id,
    businessId: business._id,
    categoryId: testCategoryId,
    name: 'Deep Cleansing Facial',
    durationMinutes: 45,
    price: 95,
    isActive: true,
  });

  const blogPost = await Blog.create({
    companyId: companyUser._id,
    businessId: business._id,
    authorId: companyUser._id,
    title: 'Top 5 Wellness Habits for Radiant Skin',
    slug: `wellness-habits-${testSuffix}`,
    summary: 'Discover expert wellness tips and holistic routines from our certified therapists.',
    content: 'Full article body detailing holistic routines...',
    category: 'Skincare',
    tags: ['wellness', 'skincare', 'relaxation'],
    status: 'published',
    publishedAt: new Date(),
    theme: 'modern',
    views: 142,
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Base URL Resolution
    // -------------------------------------------------------------
    console.log('👉 Test 1: Base URL Resolution Hierarchy');
    const customDomainUrl = resolveBaseUrl({ customDomain: 'https://spa.luxuryliving.com/' });
    assert(customDomainUrl === 'https://spa.luxuryliving.com', 'Resolves customDomain option cleanly without trailing slash');

    const businessDomainUrl = resolveBaseUrl(undefined, 'booking.myspa.org/');
    assert(businessDomainUrl === 'https://booking.myspa.org', 'Resolves business.domain with https protocol');

    const overrideUrl = resolveBaseUrl({ baseUrl: 'https://preview.bookinggo.com/' });
    assert(overrideUrl === 'https://preview.bookinggo.com', 'Resolves explicit baseUrl option');

    // -------------------------------------------------------------
    // Test 2: Default Business Metadata Generation (Fallbacks)
    // -------------------------------------------------------------
    console.log('\n👉 Test 2: Default Business SEO Metadata Generation (Fallbacks)');
    const defaultMeta = await resolveBusinessSeoMetadata(business.slug, {
      baseUrl: 'https://bookinggo.app',
    });

    assert(defaultMeta.title === `Book Appointment | ${business.name}`, 'Generates default meta title from business name');
    assert(
      typeof defaultMeta.description === 'string' &&
        defaultMeta.description.includes(business.name),
      'Generates default meta description including business name'
    );
    assert(
      Array.isArray(defaultMeta.keywords) && defaultMeta.keywords.includes(business.name),
      'Keywords array includes business name'
    );
    assert(
      defaultMeta.alternates?.canonical === `https://bookinggo.app/appointments/${business.slug}`,
      'Generates canonical URL matching booking route'
    );
    assert(
      (defaultMeta.openGraph as Record<string, unknown>)?.siteName === business.name,
      'OpenGraph siteName matches business name'
    );
    const ogImages = (defaultMeta.openGraph as Record<string, unknown>)?.images as Array<{ url: string }>;
    assert(
      Array.isArray(ogImages) && ogImages[0]?.url === `https://bookinggo.app/api/og/booking?slug=${business.slug}`,
      'OpenGraph image falls back to dynamic OG preview endpoint'
    );
    assert(
      (defaultMeta.twitter as Record<string, unknown>)?.card === 'summary_large_image',
      'Twitter card defaults to summary_large_image'
    );
    assert(
      (defaultMeta.robots as Record<string, unknown>)?.index === true,
      'Robots directive defaults to index: true'
    );

    // -------------------------------------------------------------
    // Test 3: Legacy WorkDo Settings Fallback
    // -------------------------------------------------------------
    console.log('\n👉 Test 3: Legacy Laravel WorkDo Settings Compatibility');
    await Business.findByIdAndUpdate(business._id, {
      settings: {
        meta_title: 'WorkDo Legacy Spa Title',
        meta_description: 'Legacy meta description from WorkDo database',
        meta_keywords: 'legacy, workdo, relaxation',
        meta_image: 'https://storage.workdo.io/meta.jpg',
      },
    });

    const legacyMeta = await resolveBusinessSeoMetadata(business.slug, {
      baseUrl: 'https://bookinggo.app',
    });
    assert(legacyMeta.title === 'WorkDo Legacy Spa Title', 'Resolves legacy settings.meta_title');
    assert(legacyMeta.description === 'Legacy meta description from WorkDo database', 'Resolves legacy settings.meta_description');
    assert(
      Array.isArray(legacyMeta.keywords) && legacyMeta.keywords.includes('legacy'),
      'Resolves legacy settings.meta_keywords'
    );
    const legacyOgImages = (legacyMeta.openGraph as Record<string, unknown>)?.images as Array<{ url: string }>;
    assert(legacyOgImages[0]?.url === 'https://storage.workdo.io/meta.jpg', 'Resolves legacy settings.meta_image');

    // -------------------------------------------------------------
    // Test 4: Tenant Modern SEO Subdocument Overrides (IBusiness.seo)
    // -------------------------------------------------------------
    console.log('\n👉 Test 4: Dedicated Tenant SEO Configuration (IBusiness.seo)');
    await Business.findByIdAndUpdate(business._id, {
      seo: {
        metaTitle: 'Award-Winning Luxury Spa & Wellness Retreat',
        metaDescription: 'Experience five-star relaxation, Swedish massages, and holistic therapies.',
        metaKeywords: 'luxury spa, massage downtown, wellness facial',
        metaImage: 'https://cdn.luxuryspa.com/og-banner.png',
        canonicalUrl: 'https://luxuryspa.com/appointments',
        ogType: 'website',
        twitterCard: 'summary_large_image',
        noIndex: false,
      },
    });

    const modernMeta = await resolveBusinessSeoMetadata(business.slug, {
      baseUrl: 'https://bookinggo.app',
    });
    assert(modernMeta.title === 'Award-Winning Luxury Spa & Wellness Retreat', 'Dedicated seo.metaTitle takes highest precedence');
    assert(
      modernMeta.description === 'Experience five-star relaxation, Swedish massages, and holistic therapies.',
      'Dedicated seo.metaDescription overrides legacy settings'
    );
    assert(
      modernMeta.alternates?.canonical === 'https://luxuryspa.com/appointments',
      'Honors custom dedicated canonicalUrl'
    );
    const modernOgImages = (modernMeta.openGraph as Record<string, unknown>)?.images as Array<{ url: string }>;
    assert(
      modernOgImages[0]?.url === 'https://cdn.luxuryspa.com/og-banner.png',
      'Dedicated seo.metaImage takes precedence'
    );

    // -------------------------------------------------------------
    // Test 5: Robots NoIndex Directive
    // -------------------------------------------------------------
    console.log('\n👉 Test 5: Robots noIndex Directive Enforcement');
    await Business.findByIdAndUpdate(business._id, {
      'seo.noIndex': true,
    });

    const noIndexMeta = await resolveBusinessSeoMetadata(business.slug);
    assert(
      (noIndexMeta.robots as Record<string, unknown>)?.index === false &&
        (noIndexMeta.robots as Record<string, unknown>)?.follow === false,
      'Enforces noIndex: false and follow: false when business seo.noIndex is true'
    );

    // -------------------------------------------------------------
    // Test 6: Non-Existent Business Fallback
    // -------------------------------------------------------------
    console.log('\n👉 Test 6: 404 / Missing Business Graceful Fallback');
    const missingMeta = await resolveBusinessSeoMetadata('non-existent-business-xyz');
    assert(missingMeta.title === 'Business Not Found | BookingGo', 'Returns 404 Not Found title for missing slug');
    assert(
      (missingMeta.robots as Record<string, unknown>)?.index === false,
      'Sets robots noindex on 404 page'
    );

    // -------------------------------------------------------------
    // Test 7: Schema.org LocalBusiness JSON-LD Generator
    // -------------------------------------------------------------
    console.log('\n👉 Test 7: Schema.org LocalBusiness JSON-LD Generator');
    const freshBusinessDoc = await Business.findById(business._id).lean();
    const serviceDocs = await Service.find({ businessId: business._id }).lean();

    const localBusinessLd = generateLocalBusinessJsonLd(
      freshBusinessDoc as unknown as IBusiness,
      serviceDocs as unknown as IService[],
      'https://bookinggo.app'
    );

    assert(localBusinessLd['@context'] === 'https://schema.org', 'JSON-LD @context is https://schema.org');
    assert(localBusinessLd['@type'] === 'LocalBusiness', 'JSON-LD @type is LocalBusiness');
    assert(localBusinessLd.name === business.name, 'JSON-LD name matches business name');
    assert(
      localBusinessLd.potentialAction?.['@type'] === 'ReserveAction',
      'JSON-LD potentialAction includes Schema.org ReserveAction for Google Search booking button'
    );
    assert(
      localBusinessLd.potentialAction?.target === `https://bookinggo.app/appointments/${business.slug}`,
      'ReserveAction target matches full booking URL'
    );
    assert(
      Array.isArray(localBusinessLd.openingHoursSpecification) &&
        localBusinessLd.openingHoursSpecification.length === 5,
      'OpeningHoursSpecification includes exactly 5 open business days'
    );
    assert(
      Array.isArray(localBusinessLd.makesOffer) && localBusinessLd.makesOffer.length === 2,
      'makesOffer includes 2 services offered by the business'
    );
    assert(
      localBusinessLd.makesOffer?.[0]?.itemOffered.name === 'Signature Swedish Massage',
      'First service offer correctly mapped with name and price'
    );

    // -------------------------------------------------------------
    // Test 8: Schema.org BlogPosting JSON-LD Generator
    // -------------------------------------------------------------
    console.log('\n👉 Test 8: Schema.org BlogPosting JSON-LD Generator');
    const blogPostDoc = await Blog.findById(blogPost._id).lean();
    const blogLd = generateBlogPostingJsonLd(
      blogPostDoc as unknown as IBlog,
      freshBusinessDoc as unknown as IBusiness,
      'https://bookinggo.app'
    );

    assert(blogLd['@context'] === 'https://schema.org', 'BlogPosting @context is https://schema.org');
    assert(blogLd['@type'] === 'BlogPosting', 'BlogPosting @type is BlogPosting');
    assert(blogLd.headline === blogPost.title, 'BlogPosting headline matches article title');
    assert(blogLd.author.name === business.name, 'BlogPosting author is business organization');
    assert(
      blogLd.mainEntityOfPage['@id'].includes(blogPost.slug),
      'BlogPosting mainEntityOfPage points to canonical article URL'
    );

    // -------------------------------------------------------------
    // Test 9: Blog SEO Metadata Resolver
    // -------------------------------------------------------------
    console.log('\n👉 Test 9: Blog SEO Metadata Resolver');
    const blogMeta = await resolveBlogSeoMetadata(business.slug, blogPost.slug, {
      baseUrl: 'https://bookinggo.app',
    });

    assert(blogMeta.title === `${blogPost.title} | ${business.name}`, 'Blog meta title includes post title and business name');
    assert(blogMeta.description === blogPost.summary, 'Blog meta description matches summary');
    assert(
      (blogMeta.openGraph as Record<string, unknown>)?.type === 'article',
      'OpenGraph type for blog post is article'
    );
    assert(
      Array.isArray((blogMeta.openGraph as Record<string, unknown>)?.tags) &&
        ((blogMeta.openGraph as Record<string, unknown>)?.tags as string[]).includes('wellness'),
      'OpenGraph tags include blog tags'
    );

    // -------------------------------------------------------------
    // Test 10: Zod Validation Schema Compliance
    // -------------------------------------------------------------
    console.log('\n👉 Test 10: Zod Validation Schema for SEO Settings');
    const validSeoPayload = {
      metaTitle: 'Valid SEO Title Under 120 chars',
      metaDescription: 'Valid SEO Description that provides insightful overview of the business offerings.',
      metaKeywords: 'seo, test, booking',
      metaImage: 'https://example.com/image.png',
      canonicalUrl: 'https://example.com/booking',
      ogType: 'website',
      twitterCard: 'summary_large_image' as const,
      noIndex: false,
    };

    const parseResult = businessSeoInputSchema.safeParse(validSeoPayload);
    assert(parseResult.success === true, 'Zod accepts valid SEO payload');

    const invalidUrlPayload = {
      ...validSeoPayload,
      metaImage: 'not-a-valid-url',
    };
    const invalidResult = businessSeoInputSchema.safeParse(invalidUrlPayload);
    assert(invalidResult.success === false, 'Zod rejects invalid metaImage URL');

    const longTitlePayload = {
      ...validSeoPayload,
      metaTitle: 'A'.repeat(150),
    };
    const longTitleResult = businessSeoInputSchema.safeParse(longTitlePayload);
    assert(longTitleResult.success === false, 'Zod rejects metaTitle longer than 120 characters');

    // -------------------------------------------------------------
    // Test 11: Dynamic OpenGraph Image Route Generation (/api/og/*)
    // -------------------------------------------------------------
    console.log('\n👉 Test 11: Dynamic OpenGraph Image Route Generation (/api/og/*)');
    const ogBookingReq = new NextRequest(new Request(`https://bookinggo.app/api/og/booking?slug=${business.slug}`));
    const ogBookingRes = await getBookingOgImage(ogBookingReq);
    assert(ogBookingRes.status === 200, 'Booking OG image endpoint returns HTTP 200');
    assert(
      Boolean(ogBookingRes.headers.get('content-type')?.includes('image/png')),
      'Booking OG image endpoint produces image/png content-type'
    );

    const ogBlogReq = new NextRequest(new Request(`https://bookinggo.app/api/og/blog?slug=${blogPost.slug}&business=${business.slug}`));
    const ogBlogRes = await getBlogOgImage(ogBlogReq);
    assert(ogBlogRes.status === 200, 'Blog OG image endpoint returns HTTP 200');
    assert(
      Boolean(ogBlogRes.headers.get('content-type')?.includes('image/png')),
      'Blog OG image endpoint produces image/png content-type'
    );

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(`🎉 All SEO & OpenGraph Integration Tests Passed: ${passedAssertions}/${totalAssertions} Assertions!`);
    console.log('===============================================================\n');
  } finally {
    // Clean up test documents
    await Business.findByIdAndDelete(business._id);
    await Service.deleteMany({ businessId: business._id });
    await Blog.findByIdAndDelete(blogPost._id);
    await User.findByIdAndDelete(companyUser._id);
    await mongoose.disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
