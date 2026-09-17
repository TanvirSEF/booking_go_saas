'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import { User } from '@/models/User';
import type {
  BusinessSettingsDTO,
  UpdateGeneralSettingsInput,
  UpdateBrandingSettingsInput,
  UpdateAppointmentPolicyInput,
  UpdateTaxInvoiceSettingsInput,
  SettingsActionResponse,
} from '@/types/settings';

const generalSettingsSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').trim().optional(),
  currency: z.string().min(1, 'Currency code is required').trim().optional(),
  currencySymbol: z.string().min(1, 'Currency symbol is required').trim().optional(),
  domain: z.string().trim().optional(),
});

const brandingSettingsSchema = z.object({
  themeColor: z.string().min(1, 'Theme color is required').optional(),
  layout: z.string().min(1, 'Layout name is required').optional(),
  formType: z.enum(['form-layout', 'theme']).optional(),
  logoDark: z.string().optional(),
  logoLight: z.string().optional(),
});

const appointmentPolicySchema = z.object({
  appointmentPrefix: z.string().min(1, 'Appointment prefix is required').trim().optional(),
  maximumSlot: z.number().int().min(1, 'Maximum slot capacity must be at least 1').max(100).optional(),
  appointmentReminderHours: z
    .number()
    .int()
    .min(1, 'Reminder interval must be at least 1 hour')
    .max(168, 'Reminder interval cannot exceed 168 hours (7 days)')
    .optional(),
});

const taxInvoiceSchema = z.object({
  taxType: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  taxPercentage: z.number().min(0).max(100).optional(),
  invoiceFooterNotes: z.string().optional(),
  customCss: z.string().optional(),
  customJs: z.string().optional(),
});

async function resolveTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
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
        : null;

  if (!companyId) {
    throw new Error('Company context could not be determined.');
  }

  let activeBusinessId = user.activeBusinessId;
  if (!activeBusinessId) {
    const defaultBusiness = await Business.findOne({ companyId }).lean();
    if (defaultBusiness) {
      activeBusinessId = defaultBusiness._id;
      await User.findByIdAndUpdate(user._id, { activeBusinessId: defaultBusiness._id });
    }
  }

  if (!activeBusinessId) {
    throw new Error('No active business found for this organization.');
  }

  return {
    userId: user._id,
    companyId,
    businessId: activeBusinessId,
  };
}

/**
 * Retrieves the comprehensive settings for the active business.
 */
export async function getBusinessSettingsAction(): Promise<
  SettingsActionResponse<BusinessSettingsDTO>
> {
  try {
    const { businessId } = await resolveTenantContext();

    const business = await Business.findById(businessId).lean();
    if (!business) {
      return { success: false, error: 'Business settings not found.' };
    }

    const settingsMap = business.settings || {};

    const data: BusinessSettingsDTO = {
      id: String(business._id),
      name: business.name,
      slug: business.slug,
      formType: business.formType || 'form-layout',
      layout: business.layout || 'Formlayout1',
      themeColor: business.themeColor || 'color1-Formlayout1',
      logoDark: business.logoDark || '',
      logoLight: business.logoLight || '',
      currency: business.currency || 'USD',
      currencySymbol: business.currencySymbol || '$',
      appointmentPrefix: business.appointmentPrefix || '#APP000',
      maximumSlot: business.maximumSlot ?? 1,
      appointmentReminderHours: business.appointmentReminderHours ?? 24,
      domain: business.domain || '',
      taxType: settingsMap.tax_type || 'VAT',
      taxNumber: settingsMap.vat_number || '',
      taxPercentage: Number(settingsMap.tax_percentage) || 0,
      invoiceFooterNotes: settingsMap.invoice_footer_notes || '',
      customCss: settingsMap.custom_css || '',
      customJs: settingsMap.custom_js || '',
      settings: settingsMap,
    };

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve business settings.';
    return { success: false, error: message };
  }
}

/**
 * Updates core general settings (name, currency, custom domain).
 */
export async function updateBusinessGeneralSettingsAction(
  rawInput: UpdateGeneralSettingsInput
): Promise<SettingsActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();
    const input = generalSettingsSchema.parse(rawInput);

    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business not found.' };
    }

    if (input.name !== undefined) business.name = input.name;
    if (input.currency !== undefined) business.currency = input.currency.toUpperCase();
    if (input.currencySymbol !== undefined) business.currencySymbol = input.currencySymbol;
    if (input.domain !== undefined) business.domain = input.domain;

    await business.save();

    revalidatePath('/settings');
    revalidatePath(`/appointments/${business.slug}`);

    return {
      success: true,
      message: 'General settings updated successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update general settings.';
    return { success: false, error: message };
  }
}

/**
 * Updates visual branding, logos, theme colors, and layout templates.
 */
export async function updateBusinessBrandingAction(
  rawInput: UpdateBrandingSettingsInput
): Promise<SettingsActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();
    const input = brandingSettingsSchema.parse(rawInput);

    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business not found.' };
    }

    if (input.themeColor !== undefined) business.themeColor = input.themeColor;
    if (input.layout !== undefined) business.layout = input.layout;
    if (input.formType !== undefined) business.formType = input.formType;
    if (input.logoDark !== undefined) business.logoDark = input.logoDark;
    if (input.logoLight !== undefined) business.logoLight = input.logoLight;

    await business.save();

    revalidatePath('/settings');
    revalidatePath(`/appointments/${business.slug}`);

    return {
      success: true,
      message: 'Branding and theme settings updated successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update branding settings.';
    return { success: false, error: message };
  }
}

/**
 * Updates scheduling policy (slot capacity, appointment prefix, automated reminder window).
 */
export async function updateAppointmentPolicyAction(
  rawInput: UpdateAppointmentPolicyInput
): Promise<SettingsActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();
    const input = appointmentPolicySchema.parse(rawInput);

    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business not found.' };
    }

    if (input.appointmentPrefix !== undefined) business.appointmentPrefix = input.appointmentPrefix;
    if (input.maximumSlot !== undefined) business.maximumSlot = input.maximumSlot;
    if (input.appointmentReminderHours !== undefined) {
      business.appointmentReminderHours = input.appointmentReminderHours;
    }

    await business.save();

    revalidatePath('/settings');
    revalidatePath(`/appointments/${business.slug}`);

    return {
      success: true,
      message: 'Appointment policy updated successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update appointment policy.';
    return { success: false, error: message };
  }
}

/**
 * Updates tax identification, invoice notes, custom css, and custom script integrations.
 */
export async function updateTaxInvoiceSettingsAction(
  rawInput: UpdateTaxInvoiceSettingsInput
): Promise<SettingsActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();
    const input = taxInvoiceSchema.parse(rawInput);

    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business not found.' };
    }

    const currentSettings = business.settings || {};

    if (input.taxType !== undefined) currentSettings.tax_type = input.taxType;
    if (input.taxNumber !== undefined) currentSettings.vat_number = input.taxNumber;
    if (input.taxPercentage !== undefined) {
      currentSettings.tax_percentage = String(input.taxPercentage);
    }
    if (input.invoiceFooterNotes !== undefined) {
      currentSettings.invoice_footer_notes = input.invoiceFooterNotes;
    }
    if (input.customCss !== undefined) currentSettings.custom_css = input.customCss;
    if (input.customJs !== undefined) currentSettings.custom_js = input.customJs;

    business.settings = currentSettings;
    business.markModified('settings');
    await business.save();

    revalidatePath('/settings');

    return {
      success: true,
      message: 'Tax and invoice settings updated successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update tax and invoice settings.';
    return { success: false, error: message };
  }
}
