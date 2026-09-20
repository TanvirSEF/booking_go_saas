import mongoose from 'mongoose';
import {
  ensureLandingPageSettingsSeeded,
  getPublicLandingPageData,
  getCustomPageBySlug,
  generatePlatformPixelSnippet,
  DEFAULT_LANDING_PAGE_DATA,
} from '../lib/landing-page';
import { LandingPageSetting } from '../models/LandingPageSetting';
import {
  HeroSchema,
  FaqSchema,
  PixelItemSchema,
  SectionSequenceSchema,
} from '../types/landing-page';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment.');
  process.exit(1);
}

async function runTest() {
  console.log('🧪 Starting Public Landing Page CMS Integration Tests...');
  await mongoose.connect(MONGODB_URI as string);
  console.log('✅ Connected to MongoDB Atlas.');

  let passedAssertions = 0;
  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`❌ Assertion failed: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    console.log(`  ✓ ${msg}`);
    passedAssertions++;
  }

  // --------------------------------------------------------------------------
  // Test 1: Seeding Engine
  // --------------------------------------------------------------------------
  console.log('\n[1/7] Testing Seeding Engine & Data Bootstrapping...');
  const seeded = await ensureLandingPageSettingsSeeded();
  assert(Boolean(seeded), 'Seeded landing page payload returned');
  assert(seeded.topbar.status === true, 'Topbar default status is true');
  assert(seeded.hero.heading.length > 10, 'Hero heading initialized with WorkDo copy');
  assert(seeded.features.cards.length >= 3, 'Default features seeded (>= 3 cards)');
  assert(seeded.customPages.length >= 3, 'Default custom pages seeded (About Us, Terms, Privacy)');

  // --------------------------------------------------------------------------
  // Test 2: High-Speed SSR Data Provider
  // --------------------------------------------------------------------------
  console.log('\n[2/7] Testing High-Speed SSR Data Provider...');
  const ssrData = await getPublicLandingPageData();
  assert(Boolean(ssrData), 'SSR landing page data returned');
  assert(ssrData.screenshots.items.length >= 5, 'Screenshots list returned for SSR (5 screenshots)');
  assert(ssrData.builtTech.cards.length >= 4, 'BuiltTech cards returned for SSR');
  assert(ssrData.faq.items.length >= 4, 'FAQ items returned for SSR');
  assert(ssrData.footer.sections.length >= 3, 'Footer link sections returned for SSR');

  // --------------------------------------------------------------------------
  // Test 3: Custom Pages Provider & Lookup
  // --------------------------------------------------------------------------
  console.log('\n[3/7] Testing Custom Page Lookup by Slug...');
  const aboutPage = await getCustomPageBySlug('about_us');
  assert(Boolean(aboutPage), 'Found custom page about_us');
  assert(aboutPage?.name === 'About Us', 'Page name is About Us');

  const termsPage = await getCustomPageBySlug('terms_and_conditions');
  assert(Boolean(termsPage), 'Found custom page terms_and_conditions');

  const nonExistent = await getCustomPageBySlug('non_existent_page_123');
  assert(nonExistent === null, 'Non-existent slug returns null');

  // --------------------------------------------------------------------------
  // Test 4: Zod Validation Schemas
  // --------------------------------------------------------------------------
  console.log('\n[4/7] Testing Zod Validation Schemas...');
  const validHero = HeroSchema.safeParse({
    heading: 'New Custom Hero Heading',
    description: 'Updated description for testing',
    buttonText: 'Book Now',
  });
  assert(validHero.success, 'HeroSchema successfully validates valid payload');

  const invalidHero = HeroSchema.safeParse({
    heading: '', // required
  });
  assert(!invalidHero.success, 'HeroSchema rejects empty heading');

  const validFaq = FaqSchema.safeParse({
    title: 'FAQ',
    heading: 'Got Questions?',
    items: [{ question: 'What is this?', answer: 'It is BookingGo SaaS.' }],
  });
  assert(validFaq.success, 'FaqSchema validates properly');

  const validPixel = PixelItemSchema.safeParse({
    platform: 'facebook',
    pixelId: '1234567890',
  });
  assert(validPixel.success, 'PixelItemSchema validates supported platform');

  // --------------------------------------------------------------------------
  // Test 5: Section Updates & Database Mutations
  // --------------------------------------------------------------------------
  console.log('\n[5/7] Testing Database Section Mutations...');
  const testHeading = 'Empowering Modern Service Businesses Worldwide [TEST]';
  await LandingPageSetting.findOneAndUpdate(
    { slug: 'default' },
    { $set: { 'hero.heading': testHeading } },
    { returnDocument: 'after' }
  );

  const updatedData = await getPublicLandingPageData();
  assert(updatedData.hero.heading === testHeading, 'Hero heading updated in MongoDB Atlas');

  // --------------------------------------------------------------------------
  // Test 6: Section Toggles and Reordering
  // --------------------------------------------------------------------------
  console.log('\n[6/7] Testing Section Toggles & Sequencing...');
  await LandingPageSetting.findOneAndUpdate(
    { slug: 'default' },
    { $set: { 'topbar.status': false } }
  );
  const toggledData = await getPublicLandingPageData();
  assert(toggledData.topbar.status === false, 'Topbar status toggled to false');

  const newSequence = ['hero', 'features', 'faq', 'joinUs', 'footer'];
  const validSeq = SectionSequenceSchema.safeParse({ sequence: newSequence });
  assert(validSeq.success, 'SectionSequenceSchema validates custom sequence');
  await LandingPageSetting.findOneAndUpdate(
    { slug: 'default' },
    { $set: { sectionSequence: newSequence } }
  );
  const resequencedData = await getPublicLandingPageData();
  assert(resequencedData.sectionSequence[0] === 'hero', 'Section sequence updated');

  // --------------------------------------------------------------------------
  // Test 7: Clean-Up & Reset to Original WorkDo Defaults
  // --------------------------------------------------------------------------
  console.log('\n[7/7] Testing Default Reset & Clean-Up...');
  await LandingPageSetting.findOneAndUpdate(
    { slug: 'default' },
    { $set: DEFAULT_LANDING_PAGE_DATA },
    { returnDocument: 'after' }
  );
  const resetData = await getPublicLandingPageData();
  assert(resetData.hero.heading === DEFAULT_LANDING_PAGE_DATA.hero.heading, 'Hero restored to default copy');
  assert(resetData.topbar.status === true, 'Topbar status restored to true');
  assert(resetData.sectionSequence.length === DEFAULT_LANDING_PAGE_DATA.sectionSequence.length, 'Sequence restored');

  // Pixel snippet test
  const snippet = generatePlatformPixelSnippet('facebook', '99887766');
  assert(snippet.includes('fbq'), 'Facebook pixel code snippet generated properly');

  console.log('----------------------------------------------------');
  console.log(`🎉 All ${passedAssertions} assertions passed successfully!`);
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
