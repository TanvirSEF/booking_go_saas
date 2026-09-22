'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  IconPhoto,
  IconLink,
  IconTextSize,
  IconLoader2,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { updateThemeSettingsAction } from '@/actions/theme-setting';
import type { ThemeBannerDTO } from '@/types/theme-setting';

interface SectionBannerFormProps {
  initialData: ThemeBannerDTO;
  onSaved: (banner: ThemeBannerDTO) => void;
}

export function SectionBannerForm({ initialData, onSaved }: SectionBannerFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ThemeBannerDTO>(initialData);

  const set = (key: keyof ThemeBannerDTO, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateThemeSettingsAction({ banner: form });
      if (res.success && res.data) {
        onSaved(res.data.banner);
        toast.success(res.message ?? 'Hero banner saved.');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to save hero banner.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="banner-title" className="text-xs font-semibold">
            Headline Title
          </Label>
          <div className="relative">
            <IconTextSize size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              id="banner-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Book Your Service Online with Ease"
              className="pl-9 h-9 text-xs"
              maxLength={200}
              disabled={pending}
            />
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="banner-subtitle" className="text-xs font-semibold">
            Subtitle
          </Label>
          <Input
            id="banner-subtitle"
            value={form.subTitle}
            onChange={(e) => set('subTitle', e.target.value)}
            placeholder="e.g. Fast, flexible appointment scheduling for busy professionals."
            className="h-9 text-xs"
            maxLength={500}
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="banner-image" className="text-xs font-semibold">
            Background Image URL
          </Label>
          <div className="relative">
            <IconPhoto size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              id="banner-image"
              value={form.image}
              onChange={(e) => set('image', e.target.value)}
              placeholder="https://example.com/hero-banner.jpg"
              className="pl-9 h-9 text-xs"
              disabled={pending}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="banner-btn-text" className="text-xs font-semibold">
            CTA Button Text
          </Label>
          <Input
            id="banner-btn-text"
            value={form.buttonText}
            onChange={(e) => set('buttonText', e.target.value)}
            placeholder="Book Appointment Now"
            className="h-9 text-xs"
            maxLength={100}
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="banner-btn-url" className="text-xs font-semibold">
            CTA Button Link
          </Label>
          <div className="relative">
            <IconLink size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              id="banner-btn-url"
              value={form.buttonUrl}
              onChange={(e) => set('buttonUrl', e.target.value)}
              placeholder="#booking-section"
              className="pl-9 h-9 text-xs"
              maxLength={300}
              disabled={pending}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <div className="flex items-center gap-3">
          <Switch
            id="banner-visible"
            checked={form.isVisible}
            onCheckedChange={(v) => set('isVisible', v)}
            disabled={pending}
          />
          <Label htmlFor="banner-visible" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer">
            {form.isVisible ? (
              <IconEye size={14} className="text-primary" />
            ) : (
              <IconEyeOff size={14} className="text-muted-foreground" />
            )}
            {form.isVisible ? 'Section visible' : 'Section hidden'}
          </Label>
        </div>

        <Button type="submit" size="sm" disabled={pending} className="h-8 text-xs gap-1.5">
          {pending ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconDeviceFloppy size={13} />
          )}
          {pending ? 'Saving…' : 'Save Banner'}
        </Button>
      </div>
    </form>
  );
}
