import { Metadata } from 'next';
import { getThemeSettingsAction } from '@/actions/theme-setting';
import { ThemeCustomizerShell } from '@/components/dashboard/theme/theme-customizer-shell';
import { PageHeader } from '@/components/dashboard/page-header';
import { IconPalette } from '@tabler/icons-react';
import type { ThemeSettingDTO } from '@/types/theme-setting';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Theme & Branding | Dashboard',
  description:
    'Customize your public booking website appearance — theme presets, hero banner, about section, gallery, brand palette, and custom domain configuration.',
};

const defaultThemeData: ThemeSettingDTO = {
  id: '',
  businessId: '',
  businessName: '',
  businessSlug: '',
  companyId: '',
  activeTheme: 'theme1',
  banner: {
    title: 'Book Your Service Online with Ease',
    subTitle: 'Fast, flexible, and effortless appointment scheduling.',
    image: '',
    buttonText: 'Book Appointment Now',
    buttonUrl: '#booking-section',
    isVisible: true,
  },
  about: {
    title: 'About Our Business',
    description: 'We are dedicated to providing world-class services.',
    image: '',
    features: [],
    isVisible: true,
  },
  gallery: {
    title: 'Our Atmosphere & Work',
    images: [],
    isVisible: true,
  },
  footer: {
    copyright: '© 2026 All Rights Reserved.',
    socialLinks: {},
  },
  styling: {
    primaryColor: '#0f172a',
    secondaryColor: '#3b82f6',
    fontFamily: 'Inter',
    customCss: '',
    customJs: '',
  },
  domainMapping: {
    customDomain: '',
    subdomain: '',
    isVerified: false,
    verifiedAt: null,
    dnsCnameTarget: 'cname.bookinggo.app',
  },
  updatedAt: new Date().toISOString(),
};

export default async function ThemePage() {
  const res = await getThemeSettingsAction();
  const themeData: ThemeSettingDTO = res.data ?? defaultThemeData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Theme & Branding"
        description="Customize your public booking website — choose a theme preset, configure sections, set brand colors, and connect a custom domain."
        icon={<IconPalette size={22} />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Theme & Branding' },
        ]}
      />
      <ThemeCustomizerShell initialData={themeData} />
    </div>
  );
}
