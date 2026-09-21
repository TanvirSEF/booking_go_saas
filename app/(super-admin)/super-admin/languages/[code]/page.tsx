import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/guards';
import { ACCESS } from '@/lib/roles';
import { getLanguageByCodeAction } from '@/actions/language';
import { BASE_TRANSLATION_DICTIONARY } from '@/lib/translation-engine';
import { connectToDatabase } from '@/lib/db';
import { Translation } from '@/models/Translation';
import {
  TranslationEditor,
  type TranslationEntry,
} from '@/components/super-admin/languages/translation-editor';

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Translate (${code.toUpperCase()}) | Super Admin`,
    description: `Edit translation strings and customize localized dictionary for ${code.toUpperCase()}.`,
  };
}

export default async function SuperAdminLanguageDetailPage({ params }: PageProps) {
  // Guard access
  await requireRole(ACCESS.superAdmin);

  const { code } = await params;
  const normalizedCode = code.toLowerCase().trim();

  // Validate language exists
  const langRes = await getLanguageByCodeAction(normalizedCode);
  if (!langRes.success || !langRes.data) {
    notFound();
  }

  const language = langRes.data;

  await connectToDatabase();

  // Load all current translations for this language (global companyId: null)
  const currentTranslations = await Translation.find({
    languageCode: normalizedCode,
    companyId: null,
  }).lean();

  const currentMap = new Map<string, string>();
  for (const t of currentTranslations) {
    currentMap.set(`${t.group}:${t.key}`, t.value);
  }

  // Build complete list combining BASE_TRANSLATION_DICTIONARY with existing records
  const entries: TranslationEntry[] = [];
  const processedKeys = new Set<string>();

  // 1. First add all baseline keys
  for (const [group, dict] of Object.entries(BASE_TRANSLATION_DICTIONARY)) {
    for (const [key, baselineValue] of Object.entries(dict)) {
      const composite = `${group}:${key}`;
      processedKeys.add(composite);
      entries.push({
        group,
        key,
        baseline: baselineValue,
        current: currentMap.get(composite) ?? (normalizedCode === 'en' ? baselineValue : ''),
      });
    }
  }

  // 2. Add any additional custom keys that may exist in Translation collection
  for (const t of currentTranslations) {
    const composite = `${t.group}:${t.key}`;
    if (!processedKeys.has(composite)) {
      entries.push({
        group: t.group,
        key: t.key,
        baseline: '',
        current: t.value,
      });
    }
  }

  return (
    <div className="space-y-6">
      <TranslationEditor language={language} initialEntries={entries} />
    </div>
  );
}
