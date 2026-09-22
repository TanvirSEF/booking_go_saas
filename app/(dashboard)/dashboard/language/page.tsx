import { Metadata } from 'next';
import { IconWorld } from '@tabler/icons-react';
import { requireRole } from '@/lib/guards';
import { ACCESS } from '@/lib/roles';
import { getLanguagesAction } from '@/actions/language';
import { TenantLanguageSettings } from '@/components/dashboard/settings/tenant-language-settings';
import { PageHeader } from '@/components/dashboard/page-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Language Customization | Settings',
  description: 'Customize multilingual labels and customer booking overrides for your business.',
};

export default async function TenantLanguagePage() {
  await requireRole(ACCESS.company, '/dashboard/language');

  const languagesRes = await getLanguagesAction({ includeInactive: false });
  const availableLanguages = languagesRes.data || [];

  return (
    <div className="min-h-screen pb-16">
      <PageHeader
        title="Language & Localization Settings"
        description="Customize customer-facing terminology on booking forms, email notifications, and self-service portals."
        icon={<IconWorld size={22} />}
        breadcrumbs={[{ label: 'Language Settings' }]}
      />

      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <TenantLanguageSettings availableLanguages={availableLanguages} />
      </main>
    </div>
  );
}
