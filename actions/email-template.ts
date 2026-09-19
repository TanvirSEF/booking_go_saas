'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { EmailTemplate, type IEmailTemplateDocument } from '@/models/EmailTemplate';
import {
  ensureSystemTemplatesSeeded,
  parseEmailShortcodes,
  wrapInEmailTemplateLayout,
} from '@/lib/email-engine';
import { sendEmail } from '@/lib/mailer';
import {
  updateEmailTemplateSchema,
  sendTestEmailSchema,
  type UpdateEmailTemplateInput,
  type SendTestEmailInput,
  type EmailTemplateDTO,
  type EmailTemplateListItemDTO,
  type EmailTemplateActionResult,
} from '@/types/email-template';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in background tasks or testing environments
  }
}

async function resolveSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please log in to perform this action.');
  }

  await connectToDatabase();
  return {
    userId: session.user.id,
    userObjectId: new Types.ObjectId(session.user.id),
    role: session.user.role || 'company',
    activeBusinessId: session.user.activeBusinessId,
  };
}

/**
 * 1. Seeds default system email templates into MongoDB if missing.
 */
export async function seedDefaultEmailTemplatesAction(): Promise<EmailTemplateActionResult<{ count: number }>> {
  try {
    await connectToDatabase();
    await ensureSystemTemplatesSeeded();
    const total = await EmailTemplate.countDocuments({ isSystem: true });
    return {
      success: true,
      message: `System email templates successfully initialized (${total} templates).`,
      data: { count: total },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to seed email templates';
    return { success: false, error: errorMsg };
  }
}

/**
 * 2. Retrieves list of all email templates for current session user.
 * - Super Admin: views global system templates.
 * - Company Admin: views available templates with flag indicating if customized for their tenant.
 */
export async function getEmailTemplatesAction(): Promise<EmailTemplateActionResult<EmailTemplateListItemDTO[]>> {
  try {
    const user = await resolveSessionUser();
    await ensureSystemTemplatesSeeded();

    const systemTemplates = await EmailTemplate.find({ isSystem: true })
      .sort({ name: 1 })
      .lean();

    let companyCustomizedSlugs = new Set<string>();
    if (user.role === 'company') {
      const companyOverrides = await EmailTemplate.find({
        companyId: user.userObjectId,
      }).select('slug').lean();
      companyCustomizedSlugs = new Set(companyOverrides.map((o) => o.slug));
    }

    const items: EmailTemplateListItemDTO[] = systemTemplates.map((tpl) => {
      const isCustomized = companyCustomizedSlugs.has(tpl.slug);
      const enTranslation = tpl.translations?.find((t) => t.lang === 'en') || tpl.translations?.[0];
      const availableLanguages = Array.from(new Set(tpl.translations?.map((t) => t.lang) || ['en']));

      return {
        id: String(tpl._id),
        name: tpl.name,
        slug: tpl.slug,
        from: tpl.from,
        moduleName: tpl.moduleName,
        variablesCount: tpl.variables?.length || 0,
        availableLanguages,
        isCustomized,
        isSystem: tpl.isSystem,
        defaultSubject: enTranslation?.subject || tpl.name,
      };
    });

    return {
      success: true,
      data: items,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve email templates';
    return { success: false, error: errorMsg };
  }
}

/**
 * 3. Retrieves detailed template definition with translation for the requested language.
 */
export async function getEmailTemplateDetailsAction(
  templateIdOrSlug: string,
  lang: string = 'en'
): Promise<EmailTemplateActionResult<EmailTemplateDTO>> {
  try {
    const user = await resolveSessionUser();
    await ensureSystemTemplatesSeeded();

    const requestedLang = lang.toLowerCase();
    const isObjectId = Types.ObjectId.isValid(templateIdOrSlug);

    // First find base system template
    const baseQuery = isObjectId
      ? { _id: new Types.ObjectId(templateIdOrSlug) }
      : { slug: templateIdOrSlug.toLowerCase() };

    const systemTemplate = await EmailTemplate.findOne(baseQuery);
    if (!systemTemplate) {
      return { success: false, error: 'Email template not found.' };
    }

    let activeDoc: IEmailTemplateDocument = systemTemplate;
    let isCustomized = false;

    // If company user, check for tenant override
    if (user.role === 'company') {
      const override = await EmailTemplate.findOne({
        slug: systemTemplate.slug,
        companyId: user.userObjectId,
      });

      if (override) {
        activeDoc = override;
        isCustomized = true;
      }
    }

    // Resolve translation
    const translation =
      activeDoc.translations.find((t) => t.lang === requestedLang) ||
      activeDoc.translations.find((t) => t.lang === 'en') ||
      activeDoc.translations[0] || {
        lang: requestedLang,
        subject: activeDoc.name,
        content: '',
      };

    const dto: EmailTemplateDTO = {
      id: String(activeDoc._id),
      name: systemTemplate.name,
      slug: systemTemplate.slug,
      from: activeDoc.from,
      moduleName: systemTemplate.moduleName,
      companyId: activeDoc.companyId ? String(activeDoc.companyId) : null,
      businessId: activeDoc.businessId ? String(activeDoc.businessId) : null,
      variables: systemTemplate.variables || [],
      translations: activeDoc.translations.map((t) => ({
        lang: t.lang,
        subject: t.subject,
        content: t.content,
      })),
      currentTranslation: {
        lang: requestedLang,
        subject: translation.subject,
        content: translation.content,
      },
      isSystem: activeDoc.isSystem,
      isCustomized,
      createdAt: activeDoc.createdAt?.toISOString(),
      updatedAt: activeDoc.updatedAt?.toISOString(),
    };

    return {
      success: true,
      data: dto,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve email template details';
    return { success: false, error: errorMsg };
  }
}

/**
 * 4. Updates or creates an email template translation.
 * - Super Admin: Updates the system default template directly.
 * - Company: Creates or updates a tenant override for their company.
 */
export async function updateEmailTemplateAction(
  rawInput: UpdateEmailTemplateInput
): Promise<EmailTemplateActionResult<EmailTemplateDTO>> {
  try {
    const user = await resolveSessionUser();
    const parsed = updateEmailTemplateSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid email template data provided.',
      };
    }

    const { templateId, lang, subject, content, from, businessId } = parsed.data;
    const targetLang = lang.toLowerCase();

    // Find the referenced template
    if (!Types.ObjectId.isValid(templateId)) {
      return { success: false, error: 'Invalid template ID.' };
    }

    const targetTemplate = await EmailTemplate.findById(templateId);
    if (!targetTemplate) {
      return { success: false, error: 'Email template not found.' };
    }

    let savedDoc: IEmailTemplateDocument;
    let isCustomized = false;

    if (user.role === 'super admin') {
      // Super Admin updates system template
      targetTemplate.from = from.trim();
      const existingTransIndex = targetTemplate.translations.findIndex((t) => t.lang === targetLang);

      if (existingTransIndex >= 0) {
        targetTemplate.translations[existingTransIndex].subject = subject.trim();
        targetTemplate.translations[existingTransIndex].content = content;
      } else {
        targetTemplate.translations.push({
          lang: targetLang,
          subject: subject.trim(),
          content,
        });
      }

      savedDoc = await targetTemplate.save();
    } else {
      // Company tenant override
      isCustomized = true;
      let overrideDoc = await EmailTemplate.findOne({
        slug: targetTemplate.slug,
        companyId: user.userObjectId,
      });

      if (!overrideDoc) {
        overrideDoc = new EmailTemplate({
          name: targetTemplate.name,
          slug: targetTemplate.slug,
          from: from.trim(),
          moduleName: targetTemplate.moduleName,
          companyId: user.userObjectId,
          businessId: businessId && Types.ObjectId.isValid(businessId) ? new Types.ObjectId(businessId) : null,
          variables: targetTemplate.variables,
          isSystem: false,
          translations: [],
        });
      } else {
        overrideDoc.from = from.trim();
        if (businessId && Types.ObjectId.isValid(businessId)) {
          overrideDoc.businessId = new Types.ObjectId(businessId);
        }
      }

      const existingIndex = overrideDoc.translations.findIndex((t) => t.lang === targetLang);
      if (existingIndex >= 0) {
        overrideDoc.translations[existingIndex].subject = subject.trim();
        overrideDoc.translations[existingIndex].content = content;
      } else {
        overrideDoc.translations.push({
          lang: targetLang,
          subject: subject.trim(),
          content,
        });
      }

      savedDoc = await overrideDoc.save();
    }

    safeRevalidatePath('/dashboard/settings/email-templates');
    safeRevalidatePath('/super-admin/email-templates');

    return {
      success: true,
      message: `Email template for language "${targetLang.toUpperCase()}" saved successfully.`,
      data: {
        id: String(savedDoc._id),
        name: savedDoc.name,
        slug: savedDoc.slug,
        from: savedDoc.from,
        moduleName: savedDoc.moduleName,
        companyId: savedDoc.companyId ? String(savedDoc.companyId) : null,
        variables: savedDoc.variables,
        translations: savedDoc.translations,
        currentTranslation: {
          lang: targetLang,
          subject: subject.trim(),
          content,
        },
        isSystem: savedDoc.isSystem,
        isCustomized,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update email template';
    return { success: false, error: errorMsg };
  }
}

/**
 * 5. Resets a company custom email template override back to system defaults.
 */
export async function resetEmailTemplateToDefaultAction(
  templateIdOrSlug: string,
  lang?: string
): Promise<EmailTemplateActionResult> {
  try {
    const user = await resolveSessionUser();
    if (user.role !== 'company') {
      return { success: false, error: 'Reset to default is only available for company tenant overrides.' };
    }

    let slug = templateIdOrSlug.toLowerCase();
    if (Types.ObjectId.isValid(templateIdOrSlug)) {
      const found = await EmailTemplate.findById(templateIdOrSlug);
      if (found) slug = found.slug;
    }

    const override = await EmailTemplate.findOne({
      slug,
      companyId: user.userObjectId,
    });

    if (!override) {
      return { success: true, message: 'Template is already using system defaults.' };
    }

    if (lang) {
      const targetLang = lang.toLowerCase();
      override.translations = override.translations.filter((t) => t.lang !== targetLang);
      if (override.translations.length === 0) {
        await EmailTemplate.deleteOne({ _id: override._id });
      } else {
        await override.save();
      }
    } else {
      await EmailTemplate.deleteOne({ _id: override._id });
    }

    safeRevalidatePath('/dashboard/settings/email-templates');

    return {
      success: true,
      message: 'Customized email template reset to system defaults successfully.',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to reset email template';
    return { success: false, error: errorMsg };
  }
}

/**
 * 6. Sends a test preview email with realistic mock variables to verify SMTP dispatch.
 */
export async function sendTestEmailAction(
  rawInput: SendTestEmailInput
): Promise<EmailTemplateActionResult<{ recipient: string; subject: string; mocked?: boolean }>> {
  try {
    const user = await resolveSessionUser();
    const parsed = sendTestEmailSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid test email parameters.',
      };
    }

    const { templateId, recipientEmail, lang = 'en', customVariables } = parsed.data;

    let targetTemplate: IEmailTemplateDocument | null = null;
    if (Types.ObjectId.isValid(templateId)) {
      targetTemplate = await EmailTemplate.findById(templateId);
    }
    if (!targetTemplate) {
      targetTemplate = await EmailTemplate.findOne({ slug: templateId.toLowerCase() });
    }
    if (!targetTemplate) {
      return { success: false, error: 'Email template not found for test dispatch.' };
    }

    // Check for company override if company user
    let activeDoc = targetTemplate;
    if (user.role === 'company') {
      const override = await EmailTemplate.findOne({
        slug: targetTemplate.slug,
        companyId: user.userObjectId,
      });
      if (override) activeDoc = override;
    }

    const translation =
      activeDoc.translations.find((t) => t.lang === lang.toLowerCase()) ||
      activeDoc.translations.find((t) => t.lang === 'en') ||
      activeDoc.translations[0];

    const subjectTemplate = translation?.subject || targetTemplate.name;
    const contentTemplate = translation?.content || '<p>Test Email Body</p>';

    // Sample mock variables
    const sampleVariables: Record<string, string> = {
      app_name: 'BookingGo SaaS',
      company_name: 'Acme Wellness & Spa',
      business_name: 'Acme Central Branch',
      app_url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      email: recipientEmail,
      password: 'DemoPassword#2026',
      customer: 'Sarah Connor',
      customer_name: 'Sarah Connor',
      service: 'Premium Physiotherapy Session',
      service_name: 'Premium Physiotherapy Session',
      location: 'Central Plaza, Suite 400',
      staff: 'Dr. John Doe',
      staff_name: 'Dr. John Doe',
      appointment_date: new Date().toLocaleDateString('en-US', { dateStyle: 'medium' }),
      appointment_time: '14:30 PM',
      appointment_number: 'BGO-TEST-9988',
      status: 'Confirmed',
      tracking_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/appointments/track/BGO-TEST-9988`,
      ...customVariables,
    };

    const renderedSubject = `[TEST] ${parseEmailShortcodes(subjectTemplate, sampleVariables)}`;
    const renderedBody = parseEmailShortcodes(contentTemplate, sampleVariables);
    const html = wrapInEmailTemplateLayout(renderedBody, sampleVariables.business_name);

    const mailerResult = await sendEmail({
      to: recipientEmail,
      subject: renderedSubject,
      html,
      fromName: activeDoc.from || 'BookingGo Notifications',
    });

    if (!mailerResult.success) {
      return {
        success: false,
        error: mailerResult.error || 'Failed to dispatch test email via mailer.',
      };
    }

    return {
      success: true,
      message: mailerResult.mocked
        ? 'Test email simulated successfully (Check server logs for SMTP output).'
        : `Test email successfully dispatched to ${recipientEmail}.`,
      data: {
        recipient: recipientEmail,
        subject: renderedSubject,
        mocked: mailerResult.mocked,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to send test email';
    return { success: false, error: errorMsg };
  }
}
