'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import nodemailer from 'nodemailer';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { SystemSetting, type SystemSettingGroup } from '@/models/SystemSetting';
import {
  ensureDefaultSystemSettingsSeeded,
  getPublicSystemSettings,
  getAllSystemSettingsForAdmin,
  DEFAULT_SYSTEM_SETTINGS,
  MASKED_SECRET,
} from '@/lib/system-settings';
import {
  updateBrandSettingsSchema,
  updateRegionalSettingsSchema,
  updateStripeSettingsSchema,
  updatePaypalSettingsSchema,
  updateBankTransferSettingsSchema,
  updateEmailSettingsSchema,
  updateStorageSettingsSchema,
  updateRecaptchaSettingsSchema,
  updateAuthSettingsSchema,
  sendTestEmailSchema,
  type PublicSystemSettingsDTO,
  type AdminSystemSettingsDTO,
  type SystemSettingActionResult,
  type SendTestEmailInput,
} from '@/types/system-setting';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in background tasks or test CLI
  }
}

async function resolveSuperAdminSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please log in to perform this action.');
  }

  if (session.user.role !== 'super admin') {
    throw new Error('Permission denied: Only Super Admin can access or modify system settings.');
  }

  await connectToDatabase();
  return {
    userId: session.user.id,
    userObjectId: new Types.ObjectId(session.user.id),
  };
}

/**
 * 1. Seeds baseline system settings into MongoDB Atlas
 */
export async function seedDefaultSystemSettingsAction(): Promise<
  SystemSettingActionResult<{ count: number }>
> {
  try {
    await connectToDatabase();
    await ensureDefaultSystemSettingsSeeded();
    const count = await SystemSetting.countDocuments();
    return {
      success: true,
      message: `System settings initialized successfully (${count} configuration keys).`,
      data: { count },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to seed system settings';
    return { success: false, error: errorMsg };
  }
}

/**
 * 2. Retrieves safe public system settings for landing page, brand, and currency display
 */
export async function getPublicSystemSettingsAction(): Promise<
  SystemSettingActionResult<PublicSystemSettingsDTO>
> {
  try {
    const settings = await getPublicSystemSettings();
    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve public settings';
    return { success: false, error: errorMsg };
  }
}

/**
 * 3. Retrieves all system settings grouped by category for Super Admin with secrets masked
 */
export async function getAllSystemSettingsAction(): Promise<
  SystemSettingActionResult<AdminSystemSettingsDTO>
> {
  try {
    await resolveSuperAdminSession();
    const settings = await getAllSystemSettingsForAdmin();
    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve system settings';
    return { success: false, error: errorMsg };
  }
}

/**
 * 4. Updates a specific group of system settings.
 * Automatically preserves existing secrets if the client passes the masked placeholder (••••••••).
 */
export async function updateSystemSettingsGroupAction(
  group: SystemSettingGroup,
  rawData: Record<string, unknown>
): Promise<SystemSettingActionResult<{ updatedKeys: string[] }>> {
  try {
    const admin = await resolveSuperAdminSession();

    // 1. Validate payload based on target group
    let validatedData: Record<string, unknown> = {};
    switch (group) {
      case 'brand':
        validatedData = updateBrandSettingsSchema.parse(rawData);
        break;
      case 'system':
        validatedData = updateRegionalSettingsSchema.parse(rawData);
        break;
      case 'stripe':
        validatedData = updateStripeSettingsSchema.parse(rawData);
        break;
      case 'paypal':
        validatedData = updatePaypalSettingsSchema.parse(rawData);
        break;
      case 'bank_transfer':
        validatedData = updateBankTransferSettingsSchema.parse(rawData);
        break;
      case 'email':
        validatedData = updateEmailSettingsSchema.parse(rawData);
        break;
      case 'storage':
        validatedData = updateStorageSettingsSchema.parse(rawData);
        break;
      case 'recaptcha':
        validatedData = updateRecaptchaSettingsSchema.parse(rawData);
        break;
      case 'auth':
        validatedData = updateAuthSettingsSchema.parse(rawData);
        break;
      default:
        return { success: false, error: `Unsupported settings group: "${group}"` };
    }

    const updatedKeys: string[] = [];

    // 2. Iterate and upsert
    for (const [key, rawVal] of Object.entries(validatedData)) {
      if (rawVal === undefined) continue;

      const strVal = String(rawVal).trim();

      // Check if setting is sensitive and value was submitted as masked placeholder
      const existing = await SystemSetting.findOne({ key, group });
      if (existing?.isSensitive && strVal === MASKED_SECRET) {
        // Keep existing secret untouched
        continue;
      }

      await SystemSetting.findOneAndUpdate(
        { key, group },
        {
          $set: {
            value: strVal,
            updatedBy: admin.userObjectId,
          },
        },
        { upsert: true, new: true }
      );

      updatedKeys.push(key);
    }

    safeRevalidatePath('/super-admin/settings');
    safeRevalidatePath('/');

    return {
      success: true,
      message: `Successfully updated ${group} settings (${updatedKeys.length} keys saved).`,
      data: { updatedKeys },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update system settings';
    return { success: false, error: errorMsg };
  }
}

/**
 * 5. Sends a test email using currently configured SMTP credentials to verify connectivity
 */
export async function sendTestSmtpEmailAction(
  rawInput: SendTestEmailInput
): Promise<SystemSettingActionResult<{ messageId: string }>> {
  try {
    await resolveSuperAdminSession();
    const validated = sendTestEmailSchema.parse(rawInput);

    // Fetch active email configuration from DB with env fallback
    const emailSettings = await SystemSetting.find({ group: 'email' }).lean();
    const map = new Map<string, string>();
    for (const s of emailSettings) {
      map.set(s.key, s.value);
    }

    const host = map.get('mail_host') || process.env.SMTP_HOST;
    const port = Number(map.get('mail_port')) || Number(process.env.SMTP_PORT) || 587;
    const user = map.get('mail_username') || process.env.SMTP_USER;
    const pass = map.get('mail_password') || process.env.SMTP_PASSWORD;
    const encryption = map.get('mail_encryption') || 'tls';
    const fromAddress = map.get('mail_from_address') || process.env.SMTP_FROM_EMAIL || 'no-reply@bookinggo.saas';
    const fromName = map.get('mail_from_name') || process.env.SMTP_FROM_NAME || 'BookingGo Test Mailer';

    if (!host) {
      return { success: false, error: 'SMTP Server Host is not configured.' };
    }

    // Create transport
    const secure = port === 465 || encryption === 'ssl';
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: validated.testEmail,
      subject: 'BookingGo SaaS - SMTP Configuration Test',
      text: `Hello,\n\nThis is a verification email from your BookingGo SaaS platform. If you received this, your SMTP settings are configured correctly!\n\nHost: ${host}\nPort: ${port}\nTime: ${new Date().toISOString()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #6366f1;">✅ SMTP Test Successful</h2>
          <p>Your mail server settings are working properly on <strong>BookingGo SaaS</strong>.</p>
          <div style="background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 13px; color: #475569;">
            <p style="margin: 4px 0;"><strong>Host:</strong> ${host}</p>
            <p style="margin: 4px 0;"><strong>Port:</strong> ${port}</p>
            <p style="margin: 4px 0;"><strong>Sender:</strong> &lt;${fromAddress}&gt;</p>
            <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${new Date().toUTCString()}</p>
          </div>
          <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">Sent from Super Admin Settings Panel.</p>
        </div>
      `,
    });

    return {
      success: true,
      message: `Test email sent successfully to ${validated.testEmail}.`,
      data: { messageId: info.messageId },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to send test email';
    return { success: false, error: `SMTP Connection Failed: ${errorMsg}` };
  }
}

/**
 * 6. Resets a specific group back to system factory defaults
 */
export async function resetSystemSettingsGroupAction(
  group: SystemSettingGroup
): Promise<SystemSettingActionResult<{ resetCount: number }>> {
  try {
    const admin = await resolveSuperAdminSession();

    const targetDefaults = DEFAULT_SYSTEM_SETTINGS.filter((s) => s.group === group);
    if (targetDefaults.length === 0) {
      return { success: false, error: `No defaults defined for group "${group}".` };
    }

    const bulkOps = targetDefaults.map((d) => ({
      updateOne: {
        filter: { key: d.key, group: d.group },
        update: {
          $set: {
            value: d.value,
            updatedBy: admin.userObjectId,
          },
        },
      },
    }));

    await SystemSetting.bulkWrite(bulkOps);

    safeRevalidatePath('/super-admin/settings');
    safeRevalidatePath('/');

    return {
      success: true,
      message: `Successfully reset "${group}" settings to factory defaults.`,
      data: { resetCount: targetDefaults.length },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to reset settings';
    return { success: false, error: errorMsg };
  }
}
