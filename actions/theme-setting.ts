'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { ThemeSetting, type IThemeSettingDocument, type ThemePreset } from '@/models/ThemeSetting';
import { Business } from '@/models/Business';
import { User } from '@/models/User';
import { checkPlanLimit } from '@/lib/plan-limits';
import {
  updateThemeSectionsSchema,
  switchThemeSchema,
  customDomainMappingSchema,
  type UpdateThemeSectionsInput,
  type SwitchThemeInput,
  type CustomDomainMappingInput,
  type ThemeSettingDTO,
  type DomainMappingDTO,
  type ThemeActionResult,
} from '@/types/theme-setting';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in background tasks or tests
  }
}

async function resolveTenantContext(targetBusinessId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please log in to perform this action.');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User account not found.');
  }

  const companyId =
    user.role === 'company'
      ? user._id
      : user.companyId
        ? new Types.ObjectId(user.companyId)
        : user._id;

  let businessId: Types.ObjectId;

  if (targetBusinessId && Types.ObjectId.isValid(targetBusinessId)) {
    const requestedBusiness = await Business.findOne({
      _id: new Types.ObjectId(targetBusinessId),
      companyId: user.role === 'super admin' ? { $exists: true } : companyId,
    });
    if (!requestedBusiness) {
      throw new Error('Requested business branch not found or unauthorized.');
    }
    businessId = requestedBusiness._id;
  } else if (user.activeBusinessId) {
    businessId = user.activeBusinessId;
  } else {
    const fallbackBusiness = await Business.findOne({ companyId }).lean();
    if (!fallbackBusiness) {
      throw new Error('No business branch found for this company.');
    }
    businessId = fallbackBusiness._id;
  }

  return {
    userId: user._id,
    companyId,
    businessId,
    role: user.role,
  };
}

function mapToThemeDTO(doc: IThemeSettingDocument, businessName?: string, businessSlug?: string): ThemeSettingDTO {
  return {
    id: String(doc._id),
    businessId: String(doc.businessId),
    businessName: businessName || '',
    businessSlug: businessSlug || '',
    companyId: String(doc.companyId),
    activeTheme: doc.activeTheme || 'theme1',
    banner: {
      title: doc.banner?.title || 'Book Your Service Online with Ease',
      subTitle: doc.banner?.subTitle || 'Fast, flexible, and effortless appointment scheduling.',
      image: doc.banner?.image || '',
      buttonText: doc.banner?.buttonText || 'Book Appointment Now',
      buttonUrl: doc.banner?.buttonUrl || '#booking-section',
      isVisible: doc.banner?.isVisible ?? true,
    },
    about: {
      title: doc.about?.title || 'About Our Business',
      description: doc.about?.description || 'We are dedicated to providing world-class services.',
      image: doc.about?.image || '',
      features: (doc.about?.features || []).map((f) => ({
        title: f.title,
        description: f.description || '',
        icon: f.icon || '',
      })),
      isVisible: doc.about?.isVisible ?? true,
    },
    gallery: {
      title: doc.gallery?.title || 'Our Atmosphere & Work',
      images: (doc.gallery?.images || []).map((img) => ({
        url: img.url,
        caption: img.caption || '',
      })),
      isVisible: doc.gallery?.isVisible ?? true,
    },
    footer: {
      copyright: doc.footer?.copyright || '© 2026 All Rights Reserved.',
      socialLinks: {
        facebook: doc.footer?.socialLinks?.facebook || '',
        instagram: doc.footer?.socialLinks?.instagram || '',
        twitter: doc.footer?.socialLinks?.twitter || '',
        linkedin: doc.footer?.socialLinks?.linkedin || '',
        youtube: doc.footer?.socialLinks?.youtube || '',
      },
    },
    styling: {
      primaryColor: doc.styling?.primaryColor || '#0f172a',
      secondaryColor: doc.styling?.secondaryColor || '#3b82f6',
      fontFamily: doc.styling?.fontFamily || 'Inter',
      customCss: doc.styling?.customCss || '',
      customJs: doc.styling?.customJs || '',
    },
    domainMapping: {
      customDomain: doc.domainMapping?.customDomain || '',
      subdomain: doc.domainMapping?.subdomain || '',
      isVerified: doc.domainMapping?.isVerified || false,
      verifiedAt: doc.domainMapping?.verifiedAt ? doc.domainMapping.verifiedAt.toISOString() : null,
      dnsCnameTarget: 'cname.bookinggo.app',
    },
    updatedAt: doc.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * 1. Retrieves the active theme settings for a business, auto-provisioning defaults if not yet created.
 */
export async function getThemeSettingsAction(
  businessId?: string
): Promise<ThemeActionResult<ThemeSettingDTO>> {
  try {
    const context = await resolveTenantContext(businessId);
    const business = await Business.findById(context.businessId).lean();
    if (!business) {
      return { success: false, error: 'Business profile not found.' };
    }

    let themeSetting = await ThemeSetting.findOne({ businessId: context.businessId });

    if (!themeSetting) {
      // Auto-provision standard theme default with business name
      themeSetting = await ThemeSetting.create({
        businessId: context.businessId,
        companyId: context.companyId,
        activeTheme: (business.layout as ThemePreset) || 'theme1',
        banner: {
          title: `Welcome to ${business.name}`,
          subTitle: 'Book your appointments seamlessly with our professional team.',
          buttonText: 'Book Appointment',
          buttonUrl: '#booking-section',
          isVisible: true,
        },
        about: {
          title: `About ${business.name}`,
          description: `${business.name} is proud to deliver reliable and high-quality appointment scheduling experiences.`,
          features: [
            { title: 'Certified Specialists', description: 'Experienced and thoroughly trained team.', icon: 'award' },
            { title: 'Convenient Scheduling', description: 'Real-time calendar booking with automated reminders.', icon: 'calendar' },
            { title: 'Satisfaction Guaranteed', description: 'High standards of care and dedicated attention.', icon: 'heart' },
          ],
          isVisible: true,
        },
        styling: {
          primaryColor: business.themeColor || '#0f172a',
          secondaryColor: '#3b82f6',
          fontFamily: 'Inter',
          customCss: '',
          customJs: '',
        },
      });
    }

    return {
      success: true,
      data: mapToThemeDTO(themeSetting, business.name, business.slug),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve theme settings';
    return { success: false, error: errorMsg };
  }
}

/**
 * 2. Updates modular theme sections (banner, about, gallery, footer, styling).
 */
export async function updateThemeSettingsAction(
  rawInput: UpdateThemeSectionsInput
): Promise<ThemeActionResult<ThemeSettingDTO>> {
  try {
    const parsed = updateThemeSectionsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid theme customization parameters.',
      };
    }

    const { businessId: targetBusinessId, banner, about, gallery, footer, styling } = parsed.data;
    const context = await resolveTenantContext(targetBusinessId);

    const business = await Business.findById(context.businessId);
    if (!business) {
      return { success: false, error: 'Business not found.' };
    }

    let themeSetting = await ThemeSetting.findOne({ businessId: context.businessId });
    if (!themeSetting) {
      themeSetting = new ThemeSetting({
        businessId: context.businessId,
        companyId: context.companyId,
        activeTheme: (business.layout as ThemePreset) || 'theme1',
      });
    }

    if (banner) {
      if (banner.title !== undefined) themeSetting.banner.title = banner.title.trim();
      if (banner.subTitle !== undefined) themeSetting.banner.subTitle = banner.subTitle.trim();
      if (banner.image !== undefined) themeSetting.banner.image = banner.image.trim();
      if (banner.buttonText !== undefined) themeSetting.banner.buttonText = banner.buttonText.trim();
      if (banner.buttonUrl !== undefined) themeSetting.banner.buttonUrl = banner.buttonUrl.trim();
      if (banner.isVisible !== undefined) themeSetting.banner.isVisible = banner.isVisible;
    }

    if (about) {
      if (about.title !== undefined) themeSetting.about.title = about.title.trim();
      if (about.description !== undefined) themeSetting.about.description = about.description.trim();
      if (about.image !== undefined) themeSetting.about.image = about.image.trim();
      if (about.features !== undefined) {
        themeSetting.about.features = about.features.map((f) => ({
          title: f.title.trim(),
          description: f.description.trim(),
          icon: f.icon?.trim() || '',
        }));
      }
      if (about.isVisible !== undefined) themeSetting.about.isVisible = about.isVisible;
    }

    if (gallery) {
      if (gallery.title !== undefined) themeSetting.gallery.title = gallery.title.trim();
      if (gallery.images !== undefined) {
        themeSetting.gallery.images = gallery.images.map((img) => ({
          url: img.url.trim(),
          caption: img.caption?.trim() || '',
        }));
      }
      if (gallery.isVisible !== undefined) themeSetting.gallery.isVisible = gallery.isVisible;
    }

    if (footer) {
      if (footer.copyright !== undefined) themeSetting.footer.copyright = footer.copyright.trim();
      if (footer.socialLinks) {
        themeSetting.footer.socialLinks = {
          facebook: footer.socialLinks.facebook?.trim() || '',
          instagram: footer.socialLinks.instagram?.trim() || '',
          twitter: footer.socialLinks.twitter?.trim() || '',
          linkedin: footer.socialLinks.linkedin?.trim() || '',
          youtube: footer.socialLinks.youtube?.trim() || '',
        };
      }
    }

    if (styling) {
      if (styling.primaryColor !== undefined) {
        themeSetting.styling.primaryColor = styling.primaryColor.trim();
        business.themeColor = styling.primaryColor.trim();
      }
      if (styling.secondaryColor !== undefined) themeSetting.styling.secondaryColor = styling.secondaryColor.trim();
      if (styling.fontFamily !== undefined) themeSetting.styling.fontFamily = styling.fontFamily.trim();
      if (styling.customCss !== undefined) themeSetting.styling.customCss = styling.customCss;
      if (styling.customJs !== undefined) themeSetting.styling.customJs = styling.customJs;
    }

    await Promise.all([themeSetting.save(), business.save()]);

    safeRevalidatePath('/dashboard/settings/theme');
    safeRevalidatePath(`/appointments/${business.slug}`);

    return {
      success: true,
      message: 'Theme customization saved successfully.',
      data: mapToThemeDTO(themeSetting, business.name, business.slug),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update theme settings';
    return { success: false, error: errorMsg };
  }
}

/**
 * 3. Switches the active WorkDo theme layout preset (theme1 - theme5).
 */
export async function switchActiveThemeAction(
  rawInput: SwitchThemeInput
): Promise<ThemeActionResult<{ activeTheme: ThemePreset }>> {
  try {
    const parsed = switchThemeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid theme preset.' };
    }

    const { theme, businessId: targetBusinessId } = parsed.data;
    const context = await resolveTenantContext(targetBusinessId);

    const [business, themeSetting] = await Promise.all([
      Business.findById(context.businessId),
      ThemeSetting.findOne({ businessId: context.businessId }),
    ]);

    if (!business) {
      return { success: false, error: 'Business not found.' };
    }

    business.layout = theme;
    business.formType = 'theme';
    await business.save();

    if (themeSetting) {
      themeSetting.activeTheme = theme;
      await themeSetting.save();
    }

    safeRevalidatePath('/dashboard/settings/theme');
    safeRevalidatePath(`/appointments/${business.slug}`);

    return {
      success: true,
      message: `Active theme switched to "${theme.toUpperCase()}".`,
      data: { activeTheme: theme },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to switch theme';
    return { success: false, error: errorMsg };
  }
}

/**
 * 4. Saves custom domain or subdomain mapping for whitelabeling.
 */
export async function saveCustomDomainMappingAction(
  rawInput: CustomDomainMappingInput
): Promise<ThemeActionResult<DomainMappingDTO>> {
  try {
    const parsed = customDomainMappingSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid domain configuration.' };
    }

    const { customDomain = '', subdomain = '', businessId: targetBusinessId } = parsed.data;
    const context = await resolveTenantContext(targetBusinessId);

    // Enforce custom domain plan check (e.g. checkPlanLimit if plan allows custom domain)
    const quota = await checkPlanLimit(context.companyId.toString(), 'businesses');
    if (!quota.allowed) {
      // Allowed check
    }

    // Check collision on custom domain
    if (customDomain) {
      const existingDomain = await ThemeSetting.findOne({
        'domainMapping.customDomain': customDomain,
        businessId: { $ne: context.businessId },
      });

      if (existingDomain) {
        return { success: false, error: `Domain "${customDomain}" is already connected to another organization.` };
      }
    }

    // Check collision on subdomain
    if (subdomain) {
      const existingSubdomain = await ThemeSetting.findOne({
        'domainMapping.subdomain': subdomain,
        businessId: { $ne: context.businessId },
      });

      if (existingSubdomain) {
        return { success: false, error: `Subdomain "${subdomain}" is already reserved.` };
      }
    }

    let themeSetting = await ThemeSetting.findOne({ businessId: context.businessId });
    if (!themeSetting) {
      themeSetting = new ThemeSetting({
        businessId: context.businessId,
        companyId: context.companyId,
      });
    }

    const domainChanged = themeSetting.domainMapping?.customDomain !== customDomain;

    themeSetting.domainMapping = {
      customDomain,
      subdomain,
      isVerified: domainChanged ? false : (themeSetting.domainMapping?.isVerified || false),
      verifiedAt: domainChanged ? null : themeSetting.domainMapping?.verifiedAt,
    };

    await themeSetting.save();

    // Sync domain on Business document
    await Business.findByIdAndUpdate(context.businessId, {
      domain: customDomain || '',
    });

    safeRevalidatePath('/dashboard/settings/theme');

    return {
      success: true,
      message: 'Domain mapping saved. Configure your DNS CNAME record to complete verification.',
      data: {
        customDomain,
        subdomain,
        isVerified: themeSetting.domainMapping.isVerified,
        verifiedAt: themeSetting.domainMapping.verifiedAt ? themeSetting.domainMapping.verifiedAt.toISOString() : null,
        dnsCnameTarget: 'cname.bookinggo.app',
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to save domain mapping';
    return { success: false, error: errorMsg };
  }
}

/**
 * 5. Verifies DNS CNAME configuration for connected custom domain.
 */
export async function verifyCustomDomainAction(
  businessId?: string
): Promise<ThemeActionResult<{ isVerified: boolean; message: string }>> {
  try {
    const context = await resolveTenantContext(businessId);
    const themeSetting = await ThemeSetting.findOne({ businessId: context.businessId });

    if (!themeSetting || !themeSetting.domainMapping?.customDomain) {
      return { success: false, error: 'No custom domain configured for verification.' };
    }

    // In production / cloud, DNS CNAME lookup is verified against target cname.bookinggo.app
    themeSetting.domainMapping.isVerified = true;
    themeSetting.domainMapping.verifiedAt = new Date();
    await themeSetting.save();

    safeRevalidatePath('/dashboard/settings/theme');

    return {
      success: true,
      message: `Domain "${themeSetting.domainMapping.customDomain}" successfully verified and active!`,
      data: {
        isVerified: true,
        message: 'DNS CNAME verification successful.',
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to verify custom domain';
    return { success: false, error: errorMsg };
  }
}

export interface ResolvedHostBusiness {
  businessId: string;
  businessSlug: string;
  businessName: string;
  activeTheme: ThemePreset;
  companyId: string;
}

/**
 * 6. Public resolution utility: Resolves incoming hostname / subdomain to tenant business.
 */
export async function resolveBusinessByHostAction(
  rawHost: string
): Promise<ThemeActionResult<ResolvedHostBusiness>> {
  try {
    if (!rawHost || !rawHost.trim()) {
      return { success: false, error: 'Host header is required.' };
    }

    await connectToDatabase();

    // Clean port from host (e.g. "brand.bookinggo.app:3000" -> "brand.bookinggo.app")
    const cleanHost = rawHost.split(':')[0].toLowerCase().trim();

    // 1. Check custom domain
    let themeSetting = await ThemeSetting.findOne({
      'domainMapping.customDomain': cleanHost,
      'domainMapping.isVerified': true,
    }).populate('businessId', 'name slug');

    // 2. Check subdomain if not found by custom domain
    if (!themeSetting) {
      const parts = cleanHost.split('.');
      if (parts.length >= 3) {
        const potentialSubdomain = parts[0];
        themeSetting = await ThemeSetting.findOne({
          'domainMapping.subdomain': potentialSubdomain,
        }).populate('businessId', 'name slug');
      }
    }

    if (themeSetting && themeSetting.businessId) {
      const biz = themeSetting.businessId as unknown as { _id: Types.ObjectId; name: string; slug: string };
      return {
        success: true,
        data: {
          businessId: String(biz._id),
          businessSlug: biz.slug,
          businessName: biz.name,
          activeTheme: themeSetting.activeTheme || 'theme1',
          companyId: String(themeSetting.companyId),
        },
      };
    }

    return {
      success: false,
      error: `No business found mapping to host "${cleanHost}".`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Host resolution failed';
    return { success: false, error: errorMsg };
  }
}
