import { Metadata } from 'next';
import { requireRole } from '@/lib/guards';
import { ACCESS } from '@/lib/roles';
import { getLanguagesAction } from '@/actions/language';
import { LanguageDataTable } from '@/components/super-admin/languages/language-data-table';
import { Card, CardContent } from '@/components/ui/card';
import {
  IconWorld,
  IconCheck,
  IconArrowsExchange,
  IconVocabulary,
} from '@tabler/icons-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Language Management | Super Admin',
  description: 'Manage platform supported languages, RTL directions, and default localization fallback settings.',
};

export default async function LanguagesPage() {
  // Server Component guard
  await requireRole(ACCESS.superAdmin, '/super-admin/languages');

  // Fetch all languages including inactive for administrative management
  const res = await getLanguagesAction({ includeInactive: true });
  const languages = res.data || [];

  const totalLanguages = languages.length;
  const activeLanguages = languages.filter((l) => l.status).length;
  const rtlLanguages = languages.filter((l) => l.direction === 'rtl').length;
  const defaultLang = languages.find((l) => l.isDefault) || languages.find((l) => l.code === 'en');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Language Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure available locales, manage translation direction, and customize internationalization settings.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-xl border-border bg-card p-4 shadow-xs">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Languages</p>
              <h3 className="text-xl font-bold tracking-tight text-foreground mt-1">
                {totalLanguages}
              </h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconWorld size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border bg-card p-4 shadow-xs">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active in App</p>
              <h3 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                {activeLanguages}
              </h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IconCheck size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border bg-card p-4 shadow-xs">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">RTL Locales</p>
              <h3 className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-1">
                {rtlLanguages}
              </h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IconArrowsExchange size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border bg-card p-4 shadow-xs">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Default Fallback</p>
              <h3 className="text-xl font-bold tracking-tight text-foreground uppercase mt-1">
                {defaultLang?.code || 'EN'}
              </h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <IconVocabulary size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Languages Table */}
      <LanguageDataTable initialLanguages={languages} />
    </div>
  );
}
