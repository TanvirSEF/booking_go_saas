'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { LandingPageSetting } from '@/models/LandingPageSetting';
import {
  DEFAULT_LANDING_PAGE_DATA,
  ensureLandingPageSettingsSeeded,
  getPublicLandingPageData,
} from '@/lib/landing-page';
import {
  TopbarSchema,
  HeroSchema,
  FeaturesSchema,
  HighlightSchema,
  ScreenshotsSchema,
  BuiltTechSchema,
  PackageDetailsSchema,
  ReviewsSchema,
  FaqSchema,
  JoinUsSchema,
  FooterSchema,
  SeoSchema,
  CustomCodeSchema,
  CustomPageSchema,
  PixelItemSchema,
  SectionSequenceSchema,
  type ILandingPageData,
  type ICustomPageItem,
  type IPixelItem,
} from '@/types/landing-page';

export type LandingPageActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
};

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in tests / scripts
  }
}

async function resolveSuperAdminSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please log in to manage landing page settings.');
  }

  if (session.user.role !== 'super admin') {
    throw new Error('Permission denied: Only Super Admin can modify public landing page CMS.');
  }

  await connectToDatabase();
  return {
    userId: session.user.id,
  };
}

/**
 * Super Admin Action: Retrieve full CMS configuration for administration.
 */
export async function getAdminLandingPageSettingsAction(): Promise<LandingPageActionResult<ILandingPageData>> {
  try {
    await resolveSuperAdminSession();
    const data = await getPublicLandingPageData();
    return {
      success: true,
      message: 'Landing page settings retrieved successfully.',
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve landing page settings.',
    };
  }
}

/**
 * Super Admin Action: Update Topbar Section.
 */
export async function updateTopbarSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = TopbarSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid topbar parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { topbar: parsed.data } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Topbar section updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update topbar.',
    };
  }
}

/**
 * Super Admin Action: Update Hero / Home Section.
 */
export async function updateHeroSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = HeroSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid hero parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { hero: parsed.data } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Hero banner section updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update hero section.',
    };
  }
}

/**
 * Super Admin Action: Update Features Section.
 */
export async function updateFeaturesSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = FeaturesSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid features parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    // Ensure all cards have unique IDs
    const cardsWithIds = parsed.data.cards.map((c) => ({
      ...c,
      id: c.id || randomUUID(),
    }));

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { features: { ...parsed.data, cards: cardsWithIds } } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Features section updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update features section.',
    };
  }
}

/**
 * Super Admin Action: Update Highlight / Dedicated Module Section.
 */
export async function updateHighlightSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = HighlightSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid highlight parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const cardsWithIds = parsed.data.cards.map((c) => ({
      ...c,
      id: c.id || randomUUID(),
    }));

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { highlight: { ...parsed.data, cards: cardsWithIds } } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Highlight section updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update highlight section.',
    };
  }
}

/**
 * Super Admin Action: Update Screenshots Section.
 */
export async function updateScreenshotsSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = ScreenshotsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid screenshots parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const itemsWithIds = parsed.data.items.map((i) => ({
      ...i,
      id: i.id || randomUUID(),
    }));

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { screenshots: { ...parsed.data, items: itemsWithIds } } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Screenshots section updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update screenshots.',
    };
  }
}

/**
 * Super Admin Action: Update BuiltTech Section.
 */
export async function updateBuiltTechSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = BuiltTechSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid BuiltTech parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const cardsWithIds = parsed.data.cards.map((c) => ({
      ...c,
      id: c.id || randomUUID(),
    }));

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { builtTech: { ...parsed.data, cards: cardsWithIds } } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'BuiltTech section updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update BuiltTech.',
    };
  }
}

/**
 * Super Admin Action: Update Package Details Section.
 */
export async function updatePackageDetailsSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = PackageDetailsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid Package Details parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { packageDetails: parsed.data } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Package details section updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update package details.',
    };
  }
}

/**
 * Super Admin Action: Update Reviews / Testimonials Section.
 */
export async function updateReviewsSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = ReviewsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid reviews parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const itemsWithIds = parsed.data.items.map((r) => ({
      ...r,
      id: r.id || randomUUID(),
    }));

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { reviews: { ...parsed.data, items: itemsWithIds } } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Reviews section updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update reviews.',
    };
  }
}

/**
 * Super Admin Action: Update FAQ Section.
 */
export async function updateFaqSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = FaqSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid FAQ parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const itemsWithIds = parsed.data.items.map((i) => ({
      ...i,
      id: i.id || randomUUID(),
    }));

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { faq: { ...parsed.data, items: itemsWithIds } } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'FAQ section updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update FAQ section.',
    };
  }
}

/**
 * Super Admin Action: Update JoinUs / CTA Section.
 */
export async function updateJoinUsSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = JoinUsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid Join Us parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { joinUs: parsed.data } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Join Us CTA section updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update Join Us section.',
    };
  }
}

/**
 * Super Admin Action: Update Footer Section.
 */
export async function updateFooterSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = FooterSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid footer parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { footer: parsed.data } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Footer section updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update footer section.',
    };
  }
}

/**
 * Super Admin Action: Update SEO & Meta Tags.
 */
export async function updateSeoSectionAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = SeoSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid SEO parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { seo: parsed.data } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'SEO settings updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update SEO settings.',
    };
  }
}

/**
 * Super Admin Action: Update Custom CSS & JavaScript Code.
 */
export async function updateCustomCodeAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = CustomCodeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid custom script parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { customCode: parsed.data } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Custom CSS and JS saved successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update custom code.',
    };
  }
}

/**
 * Super Admin Action: Toggle visibility for any landing page section.
 */
export async function toggleLandingPageSectionAction(
  sectionKey:
    | 'topbar'
    | 'hero'
    | 'features'
    | 'highlight'
    | 'screenshots'
    | 'builtTech'
    | 'packageDetails'
    | 'reviews'
    | 'faq'
    | 'joinUs'
    | 'footer',
  status: boolean
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const validSections = [
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
    ];

    if (!validSections.includes(sectionKey)) {
      return { success: false, message: `Invalid section key: ${sectionKey}` };
    }

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { [`${sectionKey}.status`]: status } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return {
      success: true,
      message: `${sectionKey} section ${status ? 'enabled' : 'disabled'} successfully.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to toggle section status.',
    };
  }
}

/**
 * Super Admin Action: Reorder landing page section sequence.
 */
export async function updateSectionSequenceAction(
  rawInput: unknown
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    const parsed = SectionSequenceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid section sequence parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    await ensureLandingPageSettingsSeeded();
    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { sectionSequence: parsed.data.sequence } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Section sequence updated successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update section sequence.',
    };
  }
}

/**
 * Super Admin Action: Create or Update a Custom Page.
 */
export async function saveCustomPageAction(
  rawInput: unknown
): Promise<LandingPageActionResult<ICustomPageItem>> {
  try {
    await resolveSuperAdminSession();
    const parsed = CustomPageSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid custom page parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    await ensureLandingPageSettingsSeeded();
    const doc = await LandingPageSetting.findOne({ slug: 'default' });
    if (!doc) throw new Error('Landing page settings not found.');

    const pages = doc.customPages || [];
    const targetId = parsed.data.id || randomUUID();
    const cleanSlug = parsed.data.slug.toLowerCase().trim().replace(/\s+/g, '_');

    // Prevent duplicate slug on other pages
    const slugCollision = pages.find((p) => p.slug === cleanSlug && p.id !== targetId);
    if (slugCollision) {
      return {
        success: false,
        message: `A custom page with slug '${cleanSlug}' already exists.`,
      };
    }

    const newPage: ICustomPageItem = {
      id: targetId,
      name: parsed.data.name,
      slug: cleanSlug,
      shortDescription: parsed.data.shortDescription || '',
      content: parsed.data.content || '',
      pageUrl: parsed.data.pageUrl || '',
      templateType: parsed.data.templateType,
      header: parsed.data.header,
      footer: parsed.data.footer,
      loginRequired: parsed.data.loginRequired,
    };

    const existingIndex = pages.findIndex((p) => p.id === targetId);
    if (existingIndex >= 0) {
      pages[existingIndex] = newPage;
    } else {
      pages.push(newPage);
    }

    doc.customPages = pages;
    await doc.save();

    safeRevalidatePath('/');
    safeRevalidatePath(`/pages/${cleanSlug}`);

    return {
      success: true,
      message: 'Custom page saved successfully.',
      data: newPage,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save custom page.',
    };
  }
}

/**
 * Super Admin Action: Delete a Custom Page.
 */
export async function deleteCustomPageAction(pageIdOrSlug: string): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    await ensureLandingPageSettingsSeeded();

    const doc = await LandingPageSetting.findOne({ slug: 'default' });
    if (!doc) throw new Error('Landing page settings not found.');

    const initialLength = doc.customPages.length;
    doc.customPages = doc.customPages.filter(
      (p) => p.id !== pageIdOrSlug && p.slug !== pageIdOrSlug.toLowerCase()
    );

    if (doc.customPages.length === initialLength) {
      return { success: false, message: 'Page not found.' };
    }

    await doc.save();
    safeRevalidatePath('/');
    return { success: true, message: 'Custom page deleted successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete custom page.',
    };
  }
}

/**
 * Super Admin Action: Add a Tracking Pixel.
 */
export async function addPixelAction(rawInput: unknown): Promise<LandingPageActionResult<IPixelItem>> {
  try {
    await resolveSuperAdminSession();
    const parsed = PixelItemSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid pixel parameters.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    await ensureLandingPageSettingsSeeded();
    const newPixel: IPixelItem = {
      id: parsed.data.id || randomUUID(),
      platform: parsed.data.platform,
      pixelId: parsed.data.pixelId.trim(),
    };

    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $push: { pixels: newPixel } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Tracking pixel added successfully.', data: newPixel };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add pixel.',
    };
  }
}

/**
 * Super Admin Action: Delete a Tracking Pixel.
 */
export async function deletePixelAction(pixelId: string): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    await ensureLandingPageSettingsSeeded();

    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $pull: { pixels: { id: pixelId } } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return { success: true, message: 'Tracking pixel deleted successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete pixel.',
    };
  }
}

/**
 * Super Admin Action: Reset any landing page section to its original WorkDo default.
 */
export async function resetLandingPageSectionAction(
  sectionKey: keyof ILandingPageData
): Promise<LandingPageActionResult> {
  try {
    await resolveSuperAdminSession();
    if (!(sectionKey in DEFAULT_LANDING_PAGE_DATA)) {
      return { success: false, message: `Invalid section key: ${String(sectionKey)}` };
    }

    const defaultVal = DEFAULT_LANDING_PAGE_DATA[sectionKey];
    await ensureLandingPageSettingsSeeded();

    await LandingPageSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: { [sectionKey]: defaultVal } },
      { returnDocument: 'after' }
    );

    safeRevalidatePath('/');
    return {
      success: true,
      message: `${String(sectionKey)} section reset to default successfully.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset section.',
    };
  }
}
