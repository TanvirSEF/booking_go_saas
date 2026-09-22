'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandX,
  IconBrandLinkedin,
  IconBrandYoutube,
  IconCopyright,
  IconLoader2,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateThemeSettingsAction } from '@/actions/theme-setting';
import type { ThemeFooterDTO } from '@/types/theme-setting';

interface SectionFooterFormProps {
  initialData: ThemeFooterDTO;
  onSaved: (footer: ThemeFooterDTO) => void;
}

interface SocialField {
  key: keyof ThemeFooterDTO['socialLinks'];
  label: string;
  placeholder: string;
  icon: React.ReactNode;
}

const SOCIAL_FIELDS: SocialField[] = [
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/yourpage',
    icon: <IconBrandFacebook size={15} />,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/yourhandle',
    icon: <IconBrandInstagram size={15} />,
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    placeholder: 'https://x.com/yourhandle',
    icon: <IconBrandX size={15} />,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/company/yourco',
    icon: <IconBrandLinkedin size={15} />,
  },
  {
    key: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@yourchannel',
    icon: <IconBrandYoutube size={15} />,
  },
];

export function SectionFooterForm({ initialData, onSaved }: SectionFooterFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ThemeFooterDTO>({
    copyright: initialData.copyright,
    socialLinks: { ...initialData.socialLinks },
  });

  const setSocial = (key: keyof ThemeFooterDTO['socialLinks'], value: string) =>
    setForm((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateThemeSettingsAction({ footer: form });
      if (res.success && res.data) {
        onSaved(res.data.footer);
        toast.success(res.message ?? 'Footer settings saved.');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to save footer settings.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="footer-copyright" className="text-xs font-semibold flex items-center gap-1.5">
          <IconCopyright size={13} className="text-primary" />
          Copyright Notice
        </Label>
        <Input
          id="footer-copyright"
          value={form.copyright}
          onChange={(e) => setForm((prev) => ({ ...prev, copyright: e.target.value }))}
          placeholder="© 2026 Acme Corp. All Rights Reserved."
          className="h-9 text-xs"
          maxLength={200}
          disabled={pending}
        />
      </div>

      <div className="space-y-3 pt-2 border-t border-border/60">
        <Label className="text-xs font-semibold">Social Media Links</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOCIAL_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label
                htmlFor={`social-${field.key}`}
                className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5"
              >
                <span className="text-primary">{field.icon}</span>
                {field.label}
              </Label>
              <Input
                id={`social-${field.key}`}
                value={form.socialLinks[field.key] ?? ''}
                onChange={(e) => setSocial(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="h-8 text-xs"
                disabled={pending}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-border/60">
        <Button type="submit" size="sm" disabled={pending} className="h-8 text-xs gap-1.5">
          {pending ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconDeviceFloppy size={13} />
          )}
          {pending ? 'Saving…' : 'Save Footer'}
        </Button>
      </div>
    </form>
  );
}
