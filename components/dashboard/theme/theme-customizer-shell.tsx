'use client';

import { useState } from 'react';
import {
  IconPhoto,
  IconInfoCircle,
  IconLayoutGrid,
  IconPalette,
  IconShare,
  IconWorld,
  IconChevronDown,
} from '@tabler/icons-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ThemePresetSelector } from '@/components/dashboard/theme/theme-preset-selector';
import { SectionBannerForm } from '@/components/dashboard/theme/section-banner-form';
import { SectionAboutForm } from '@/components/dashboard/theme/section-about-form';
import { SectionGalleryForm } from '@/components/dashboard/theme/section-gallery-form';
import { SectionStylingForm } from '@/components/dashboard/theme/section-styling-form';
import { SectionFooterForm } from '@/components/dashboard/theme/section-footer-form';
import { CustomDomainCard } from '@/components/dashboard/theme/custom-domain-card';
import type { ThemeSettingDTO, ThemePreset } from '@/types/theme-setting';

interface ThemeCustomizerShellProps {
  initialData: ThemeSettingDTO;
}

interface SectionConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'banner',
    label: 'Hero Banner',
    description: 'Title, subtitle, background image, and call-to-action button',
    icon: <IconPhoto size={16} />,
  },
  {
    id: 'about',
    label: 'About Us',
    description: 'Business description, image, and feature highlights',
    icon: <IconInfoCircle size={16} />,
  },
  {
    id: 'gallery',
    label: 'Gallery Carousel',
    description: 'Image slides with captions for showcasing your work',
    icon: <IconLayoutGrid size={16} />,
  },
  {
    id: 'styling',
    label: 'Brand Styling & Palette',
    description: 'Colors, typography, and custom CSS overrides',
    icon: <IconPalette size={16} />,
  },
  {
    id: 'footer',
    label: 'Footer & Social Links',
    description: 'Copyright text and social media profile URLs',
    icon: <IconShare size={16} />,
  },
];

export function ThemeCustomizerShell({ initialData }: ThemeCustomizerShellProps) {
  const [themeData, setThemeData] = useState<ThemeSettingDTO>(initialData);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    banner: true,
  });

  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleThemeSwitch = (theme: ThemePreset) =>
    setThemeData((prev) => ({ ...prev, activeTheme: theme }));

  return (
    <div className="space-y-6">
      <ThemePresetSelector
        activeTheme={themeData.activeTheme}
        onThemeChange={handleThemeSwitch}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Section Content</h2>

        {SECTIONS.map((section) => (
          <Collapsible
            key={section.id}
            open={!!openSections[section.id]}
            onOpenChange={() => toggleSection(section.id)}
          >
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-primary shrink-0">{section.icon}</span>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold text-foreground">{section.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{section.description}</p>
                  </div>
                </div>
                <IconChevronDown
                  size={16}
                  className={cn(
                    'text-muted-foreground shrink-0 transition-transform duration-200',
                    openSections[section.id] && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-border/60 px-4 py-4">
                  {section.id === 'banner' && (
                    <SectionBannerForm
                      initialData={themeData.banner}
                      onSaved={(banner) =>
                        setThemeData((prev) => ({ ...prev, banner }))
                      }
                    />
                  )}
                  {section.id === 'about' && (
                    <SectionAboutForm
                      initialData={themeData.about}
                      onSaved={(about) =>
                        setThemeData((prev) => ({ ...prev, about }))
                      }
                    />
                  )}
                  {section.id === 'gallery' && (
                    <SectionGalleryForm
                      initialData={themeData.gallery}
                      onSaved={(gallery) =>
                        setThemeData((prev) => ({ ...prev, gallery }))
                      }
                    />
                  )}
                  {section.id === 'styling' && (
                    <SectionStylingForm
                      initialData={themeData.styling}
                      onSaved={(styling) =>
                        setThemeData((prev) => ({ ...prev, styling }))
                      }
                    />
                  )}
                  {section.id === 'footer' && (
                    <SectionFooterForm
                      initialData={themeData.footer}
                      onSaved={(footer) =>
                        setThemeData((prev) => ({ ...prev, footer }))
                      }
                    />
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <IconWorld size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Custom Domain</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Connect a branded domain (e.g. <code className="bg-muted px-1 rounded text-xs">booking.mycompany.com</code>) to your public booking page.
        </p>
        <CustomDomainCard initialData={themeData.domainMapping} />
      </div>
    </div>
  );
}
