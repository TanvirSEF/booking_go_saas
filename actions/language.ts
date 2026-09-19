'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Language, type ILanguageDocument } from '@/models/Language';
import { Translation } from '@/models/Translation';
import { User } from '@/models/User';
import {
  ensureDefaultLanguagesSeeded,
  resolveTranslationsCascade,
} from '@/lib/translation-engine';
import {
  createLanguageSchema,
  updateLanguageSchema,
  updateTranslationsSchema,
  changeUserLanguageSchema,
  importTranslationsSchema,
  type CreateLanguageInput,
  type UpdateLanguageInput,
  type UpdateTranslationsInput,
  type ChangeUserLanguageInput,
  type ImportTranslationsInput,
  type LanguageDTO,
  type TranslationDictionaryDTO,
  type LanguageActionResult,
} from '@/types/language';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in test/cli environments
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
    role: session.user.role || 'customer',
    companyId: session.user.companyId ? new Types.ObjectId(session.user.companyId) : undefined,
    activeBusinessId: session.user.activeBusinessId,
  };
}

/**
 * Maps Mongoose Language document to DTO
 */
function toLanguageDTO(doc: ILanguageDocument, translationCount?: number): LanguageDTO {
  return {
    _id: (doc._id as Types.ObjectId).toString(),
    code: doc.code,
    name: doc.name,
    direction: doc.direction,
    status: doc.status,
    isDefault: doc.isDefault,
    createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
    translationCount,
  };
}

/**
 * 1. Seeds default 13 system languages & base dictionary
 */
export async function seedDefaultLanguagesAction(): Promise<LanguageActionResult<{ count: number }>> {
  try {
    await connectToDatabase();
    await ensureDefaultLanguagesSeeded();
    const count = await Language.countDocuments();
    return {
      success: true,
      message: `System languages and baseline dictionary initialized (${count} languages available).`,
      data: { count },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to seed default languages';
    return { success: false, error: errorMsg };
  }
}

/**
 * 2. Retrieves list of available languages.
 * Super Admin sees all (or filtered). Tenants/customers see only active languages.
 */
export async function getLanguagesAction(options?: {
  includeInactive?: boolean;
}): Promise<LanguageActionResult<LanguageDTO[]>> {
  try {
    await connectToDatabase();
    await ensureDefaultLanguagesSeeded();

    const session = await auth();
    const isSuperAdmin = session?.user?.role === 'super admin';

    const filter: Record<string, unknown> = {};
    if (!isSuperAdmin || !options?.includeInactive) {
      filter.status = true;
    }

    const languages = await Language.find(filter).sort({ isDefault: -1, name: 1 });

    // Aggregate translation counts per language
    const counts = await Translation.aggregate<{ _id: string; total: number }>([
      { $match: { companyId: null } },
      { $group: { _id: '$languageCode', total: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const c of counts) {
      countMap.set(c._id, c.total);
    }

    const dtoList = languages.map((lang) => toLanguageDTO(lang, countMap.get(lang.code) || 0));

    return {
      success: true,
      data: dtoList,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve languages';
    return { success: false, error: errorMsg };
  }
}

/**
 * 3. Retrieves single language metadata by code
 */
export async function getLanguageByCodeAction(code: string): Promise<LanguageActionResult<LanguageDTO>> {
  try {
    await connectToDatabase();
    await ensureDefaultLanguagesSeeded();

    const normalizedCode = code.toLowerCase().trim();
    const language = await Language.findOne({ code: normalizedCode });
    if (!language) {
      return { success: false, error: `Language with code "${normalizedCode}" not found.` };
    }

    const translationCount = await Translation.countDocuments({
      languageCode: normalizedCode,
      companyId: null,
    });

    return {
      success: true,
      data: toLanguageDTO(language, translationCount),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve language';
    return { success: false, error: errorMsg };
  }
}

/**
 * 4. Creates a new system language (Super Admin only).
 * Automatically copies baseline English dictionary to initialize the new locale.
 */
export async function createLanguageAction(
  rawInput: CreateLanguageInput
): Promise<LanguageActionResult<LanguageDTO>> {
  try {
    const user = await resolveSessionUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Permission denied: Only Super Admin can create system languages.' };
    }

    const validated = createLanguageSchema.parse(rawInput);

    const existingCode = await Language.findOne({ code: validated.code });
    if (existingCode) {
      return { success: false, error: `Language with code "${validated.code}" already exists.` };
    }

    const existingName = await Language.findOne({
      name: { $regex: new RegExp(`^${validated.name}$`, 'i') },
    });
    if (existingName) {
      return { success: false, error: `Language named "${validated.name}" already exists.` };
    }

    // If marked default, unset default from all other languages
    if (validated.isDefault) {
      await Language.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    }

    const newLang = await Language.create({
      code: validated.code,
      name: validated.name,
      direction: validated.direction,
      status: validated.status ?? true,
      isDefault: Boolean(validated.isDefault),
    });

    // Auto-clone default English dictionary into this new language
    const englishTranslations = await Translation.find({
      languageCode: 'en',
      companyId: null,
    }).lean();

    if (englishTranslations.length > 0) {
      const cloneOps = englishTranslations.map((t) => ({
        updateOne: {
          filter: { languageCode: validated.code, group: t.group, key: t.key, companyId: null },
          update: {
            $setOnInsert: {
              languageCode: validated.code,
              group: t.group,
              key: t.key,
              value: t.value,
              companyId: null,
            },
          },
          upsert: true,
        },
      }));
      await Translation.bulkWrite(cloneOps);
    }

    safeRevalidatePath('/super-admin/languages');
    return {
      success: true,
      message: `Language "${newLang.name}" (${newLang.code}) created successfully with ${englishTranslations.length} base keys.`,
      data: toLanguageDTO(newLang, englishTranslations.length),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to create language';
    return { success: false, error: errorMsg };
  }
}

/**
 * 5. Updates language metadata (Super Admin only)
 */
export async function updateLanguageAction(
  code: string,
  rawInput: UpdateLanguageInput
): Promise<LanguageActionResult<LanguageDTO>> {
  try {
    const user = await resolveSessionUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Permission denied: Only Super Admin can update languages.' };
    }

    const validated = updateLanguageSchema.parse(rawInput);
    const normalizedCode = code.toLowerCase().trim();

    const lang = await Language.findOne({ code: normalizedCode });
    if (!lang) {
      return { success: false, error: `Language "${normalizedCode}" not found.` };
    }

    if (validated.isDefault) {
      // Cannot disable the default language
      validated.status = true;
      await Language.updateMany({ isDefault: true }, { $set: { isDefault: false } });
      lang.isDefault = true;
    } else if (validated.isDefault === false && lang.isDefault) {
      return {
        success: false,
        error: 'Cannot unset default status directly. Please set another language as default instead.',
      };
    }

    if (validated.name) lang.name = validated.name;
    if (validated.direction) lang.direction = validated.direction;
    if (validated.status !== undefined) {
      if (!validated.status && lang.isDefault) {
        return { success: false, error: 'The default system language cannot be disabled.' };
      }
      lang.status = validated.status;
    }

    await lang.save();
    safeRevalidatePath('/super-admin/languages');

    return {
      success: true,
      message: `Language "${lang.name}" updated successfully.`,
      data: toLanguageDTO(lang),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update language';
    return { success: false, error: errorMsg };
  }
}

/**
 * 6. Toggles language active status (Super Admin only)
 */
export async function toggleLanguageStatusAction(
  code: string,
  status?: boolean
): Promise<LanguageActionResult<{ code: string; status: boolean }>> {
  try {
    const user = await resolveSessionUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Permission denied: Only Super Admin can change language status.' };
    }

    const normalizedCode = code.toLowerCase().trim();
    const lang = await Language.findOne({ code: normalizedCode });
    if (!lang) {
      return { success: false, error: `Language "${normalizedCode}" not found.` };
    }

    const nextStatus = status !== undefined ? status : !lang.status;

    if (!nextStatus && lang.isDefault) {
      return { success: false, error: 'The default system language cannot be disabled.' };
    }

    lang.status = nextStatus;
    await lang.save();

    safeRevalidatePath('/super-admin/languages');
    return {
      success: true,
      message: `Language "${lang.name}" ${nextStatus ? 'enabled' : 'disabled'} successfully.`,
      data: { code: lang.code, status: lang.status },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to toggle language status';
    return { success: false, error: errorMsg };
  }
}

/**
 * 7. Deletes a custom language (Super Admin only).
 * Safeguard: Default language cannot be deleted.
 * Resets users with this language back to default ('en').
 */
export async function deleteLanguageAction(code: string): Promise<LanguageActionResult<{ deletedCode: string }>> {
  try {
    const user = await resolveSessionUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Permission denied: Only Super Admin can delete languages.' };
    }

    const normalizedCode = code.toLowerCase().trim();
    const lang = await Language.findOne({ code: normalizedCode });
    if (!lang) {
      return { success: false, error: `Language "${normalizedCode}" not found.` };
    }

    if (lang.isDefault) {
      return { success: false, error: 'The default system language cannot be deleted.' };
    }

    // Find default language code to reassign users
    const defaultLang = (await Language.findOne({ isDefault: true })) || { code: 'en' };

    // Reassign all users who had this language
    await User.updateMany({ lang: normalizedCode }, { $set: { lang: defaultLang.code } });

    // Remove all translations for this language (global & tenant custom overrides)
    await Translation.deleteMany({ languageCode: normalizedCode });

    // Delete the language document
    await Language.deleteOne({ code: normalizedCode });

    safeRevalidatePath('/super-admin/languages');
    return {
      success: true,
      message: `Language "${lang.name}" (${normalizedCode}) and its translations were deleted successfully.`,
      data: { deletedCode: normalizedCode },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to delete language';
    return { success: false, error: errorMsg };
  }
}

/**
 * 8. Retrieves translation dictionary with 3-tier cascade
 * (Tenant Override -> Active Language Translation -> English Default Fallback)
 */
export async function getTranslationsAction(params: {
  languageCode: string;
  group?: string;
  tenantScope?: boolean;
}): Promise<LanguageActionResult<TranslationDictionaryDTO>> {
  try {
    await connectToDatabase();
    await ensureDefaultLanguagesSeeded();

    let companyId: Types.ObjectId | null = null;
    if (params.tenantScope) {
      const session = await auth();
      if (session?.user?.id) {
        companyId = session.user.companyId
          ? new Types.ObjectId(session.user.companyId)
          : new Types.ObjectId(session.user.id);
      }
    }

    const { translations, language } = await resolveTranslationsCascade({
      languageCode: params.languageCode,
      group: params.group,
      companyId,
    });

    const direction = language?.direction || (params.languageCode === 'ar' || params.languageCode === 'he' ? 'rtl' : 'ltr');

    return {
      success: true,
      data: {
        languageCode: params.languageCode,
        languageName: language?.name || params.languageCode.toUpperCase(),
        direction,
        group: params.group || 'all',
        translations,
        isRTL: direction === 'rtl',
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve translations';
    return { success: false, error: errorMsg };
  }
}

/**
 * 9. Updates translation key-value dictionary.
 * - Super Admin: updates global system dictionary (companyId: null).
 * - Company Admin: saves custom tenant overrides (companyId: user.companyId).
 */
export async function updateTranslationsAction(
  rawInput: UpdateTranslationsInput
): Promise<LanguageActionResult<{ updatedCount: number }>> {
  try {
    const user = await resolveSessionUser();
    const validated = updateTranslationsSchema.parse(rawInput);

    const isSuperAdmin = user.role === 'super admin';
    const companyId = isSuperAdmin ? null : user.companyId || user.userObjectId;

    const entries = Object.entries(validated.translations);
    if (entries.length === 0) {
      return { success: true, message: 'No translations to update.', data: { updatedCount: 0 } };
    }

    const bulkOps = entries.map(([key, value]) => ({
      updateOne: {
        filter: {
          languageCode: validated.languageCode,
          group: validated.group,
          key,
          companyId,
        },
        update: {
          $set: {
            languageCode: validated.languageCode,
            group: validated.group,
            key,
            value,
            companyId,
          },
        },
        upsert: true,
      },
    }));

    await Translation.bulkWrite(bulkOps);

    safeRevalidatePath('/super-admin/languages');
    safeRevalidatePath('/dashboard/settings/language');

    return {
      success: true,
      message: `Successfully saved ${entries.length} translation strings for ${validated.languageCode.toUpperCase()} (${validated.group}).`,
      data: { updatedCount: entries.length },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update translations';
    return { success: false, error: errorMsg };
  }
}

/**
 * 10. Updates session user's preferred language (`User.lang`)
 */
export async function changeUserLanguageAction(
  rawInput: ChangeUserLanguageInput
): Promise<LanguageActionResult<{ lang: string; direction: 'ltr' | 'rtl' }>> {
  try {
    const user = await resolveSessionUser();
    const validated = changeUserLanguageSchema.parse(rawInput);

    const lang = await Language.findOne({ code: validated.lang, status: true });
    if (!lang) {
      return { success: false, error: `Language "${validated.lang}" is either not found or currently disabled.` };
    }

    await User.findByIdAndUpdate(user.userObjectId, {
      $set: { lang: lang.code },
    });

    safeRevalidatePath('/');
    safeRevalidatePath('/dashboard');
    safeRevalidatePath('/super-admin');

    return {
      success: true,
      message: `Language successfully changed to ${lang.name}.`,
      data: {
        lang: lang.code,
        direction: lang.direction,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to change language';
    return { success: false, error: errorMsg };
  }
}

/**
 * 11. Exports translations as JSON dictionary
 */
export async function exportTranslationsAction(
  languageCode: string,
  group?: string
): Promise<LanguageActionResult<{ languageCode: string; group?: string; data: Record<string, string> }>> {
  try {
    await connectToDatabase();
    await ensureDefaultLanguagesSeeded();

    const normalizedCode = languageCode.toLowerCase().trim();
    const filter: Record<string, unknown> = {
      languageCode: normalizedCode,
      companyId: null,
    };
    if (group && group !== 'all') {
      filter.group = group;
    }

    const items = await Translation.find(filter).lean();
    const data: Record<string, string> = {};
    for (const item of items) {
      data[item.key] = item.value;
    }

    return {
      success: true,
      data: {
        languageCode: normalizedCode,
        group,
        data,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to export translations';
    return { success: false, error: errorMsg };
  }
}

/**
 * 12. Imports JSON translations and merges/upserts into dictionary
 */
export async function importTranslationsAction(
  rawInput: ImportTranslationsInput
): Promise<LanguageActionResult<{ importedCount: number }>> {
  try {
    const user = await resolveSessionUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Permission denied: Only Super Admin can import translations.' };
    }

    const validated = importTranslationsSchema.parse(rawInput);
    const entries = Object.entries(validated.data);

    if (entries.length === 0) {
      return { success: false, error: 'No translation key-values found in payload.' };
    }

    const bulkOps = entries.map(([key, value]) => ({
      updateOne: {
        filter: {
          languageCode: validated.languageCode,
          group: validated.group,
          key,
          companyId: null,
        },
        update: {
          $set: {
            languageCode: validated.languageCode,
            group: validated.group,
            key,
            value,
            companyId: null,
          },
        },
        upsert: true,
      },
    }));

    await Translation.bulkWrite(bulkOps);

    safeRevalidatePath('/super-admin/languages');

    return {
      success: true,
      message: `Successfully imported ${entries.length} translations for ${validated.languageCode.toUpperCase()}.`,
      data: { importedCount: entries.length },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to import translations';
    return { success: false, error: errorMsg };
  }
}
