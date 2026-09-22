'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import {
  businessSeoInputSchema,
  type BusinessSeoInput,
  type IBusinessSeo,
} from '@/types/seo';

function safeRevalidate(paths: string[]) {
  try {
    for (const p of paths) {
      revalidatePath(p);
    }
  } catch {
    // Ignored in test/CLI environments
  }
}

export interface SeoActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Retrieves the current SEO settings for a business.
 */
export async function getBusinessSeoSettings(
  businessId: string
): Promise<SeoActionResult<IBusinessSeo>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized: Please log in to continue.' };
    }

    await connectToDatabase();
    const business = await Business.findById(businessId).lean();

    if (!business) {
      return { success: false, error: 'Business not found.' };
    }

    // Role verification
    const userRole = (session.user as { role?: string }).role;
    const isOwner =
      business.companyId.toString() === session.user.id ||
      userRole === 'super admin';

    if (!isOwner) {
      return { success: false, error: 'Forbidden: You do not have permission to manage this business.' };
    }

    const seoData: IBusinessSeo = business.seo || {
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      metaImage: '',
      canonicalUrl: '',
      ogType: 'website',
      twitterCard: 'summary_large_image',
      noIndex: false,
    };

    return { success: true, data: seoData };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get SEO settings.';
    return { success: false, error: message };
  }
}

/**
 * Updates the SEO and OpenGraph metadata configuration for a tenant's business.
 */
export async function updateBusinessSeoSettings(
  businessId: string,
  input: BusinessSeoInput
): Promise<SeoActionResult<IBusinessSeo>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized: Please log in to continue.' };
    }

    const validation = businessSeoInputSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map((i) => i.message).join(', ');
      return { success: false, error: errorMsg };
    }

    await connectToDatabase();
    const business = await Business.findById(businessId);

    if (!business) {
      return { success: false, error: 'Business not found.' };
    }

    // Permission check
    const userRole = (session.user as { role?: string }).role;
    const isOwner =
      business.companyId.toString() === session.user.id ||
      userRole === 'super admin';

    if (!isOwner) {
      return { success: false, error: 'Forbidden: You do not have permission to update this business.' };
    }

    const validated = validation.data;

    business.seo = {
      metaTitle: validated.metaTitle || '',
      metaDescription: validated.metaDescription || '',
      metaKeywords: validated.metaKeywords || '',
      metaImage: validated.metaImage || '',
      canonicalUrl: validated.canonicalUrl || '',
      ogType: validated.ogType || 'website',
      twitterCard: validated.twitterCard || 'summary_large_image',
      noIndex: Boolean(validated.noIndex),
    };

    await business.save();

    safeRevalidate([
      '/dashboard/settings',
      `/appointments/${business.slug}`,
      `/embed/${business.slug}`,
    ]);

    return { success: true, data: business.seo };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update SEO settings.';
    return { success: false, error: message };
  }
}
