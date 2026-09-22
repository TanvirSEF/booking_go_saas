import { Metadata } from 'next';
import { requireRole } from '@/lib/guards';
import { ACCESS } from '@/lib/roles';
import { getLanguagesAction } from '@/actions/language';
import { TenantLanguageSettings } from '@/components/dashboard/settings/tenant-language-settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Language Customization | Settings',
  description: 'Customize multilingual labels and customer booking overrides for your business.',
};

export default async function TenantLanguagePage() {
  // Guard access to company/staff tenant roles
  await requireRole(ACCESS.company, '/dashboard/language');

  // Fetch only active languages for tenant configuration
  const languagesRes = await getLanguagesAction({ includeInactive: false });
  const availableLanguages = languagesRes.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Language & Localization Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize customer-facing terminology on booking forms, email notifications, and self-service portals.
        </p>
      </div>

      <TenantLanguageSettings availableLanguages={availableLanguages} />
    </div>
  );
}
