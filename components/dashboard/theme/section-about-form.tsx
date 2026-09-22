'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  IconPhoto,
  IconPlus,
  IconTrash,
  IconLoader2,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconStar,
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { updateThemeSettingsAction } from '@/actions/theme-setting';
import type { ThemeAboutDTO, ThemeFeatureDTO } from '@/types/theme-setting';

interface SectionAboutFormProps {
  initialData: ThemeAboutDTO;
  onSaved: (about: ThemeAboutDTO) => void;
}

const emptyFeature = (): ThemeFeatureDTO => ({ title: '', description: '', icon: '' });

export function SectionAboutForm({ initialData, onSaved }: SectionAboutFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ThemeAboutDTO>({
    ...initialData,
    features: initialData.features.length > 0 ? initialData.features : [],
  });

  const set = (key: keyof Omit<ThemeAboutDTO, 'features'>, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addFeature = () =>
    setForm((prev) => ({ ...prev, features: [...prev.features, emptyFeature()] }));

  const removeFeature = (index: number) =>
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));

  const updateFeature = (index: number, key: keyof ThemeFeatureDTO, value: string) =>
    setForm((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === index ? { ...f, [key]: value } : f)),
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const invalidFeature = form.features.find((f) => !f.title.trim());
    if (invalidFeature) {
      toast.error('Each feature must have a title.');
      return;
    }

    startTransition(async () => {
      const payload = {
        ...form,
        features: form.features.map((f) => ({
          title: f.title,
          description: f.description,
          icon: f.icon ?? '',
        })),
      };
      const res = await updateThemeSettingsAction({ about: payload });
      if (res.success && res.data) {
        onSaved(res.data.about);
        toast.success(res.message ?? 'About section saved.');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to save about section.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="about-title" className="text-xs font-semibold">
            Section Title
          </Label>
          <Input
            id="about-title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="About Our Business"
            className="h-9 text-xs"
            maxLength={200}
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="about-desc" className="text-xs font-semibold">
            Description
          </Label>
          <Textarea
            id="about-desc"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Tell visitors about your business, values, and team…"
            className="text-xs resize-none min-h-20"
            maxLength={2000}
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="about-image" className="text-xs font-semibold">
            Section Image URL
          </Label>
          <div className="relative">
            <IconPhoto size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              id="about-image"
              value={form.image}
              onChange={(e) => set('image', e.target.value)}
              placeholder="https://example.com/about-photo.jpg"
              className="pl-9 h-9 text-xs"
              disabled={pending}
            />
          </div>
        </div>
      </div>

      {/* Feature Repeater */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <IconStar size={13} className="text-primary" />
            Feature Highlights ({form.features.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFeature}
            disabled={pending || form.features.length >= 6}
            className="h-7 text-[11px] gap-1"
          >
            <IconPlus size={12} />
            Add Feature
          </Button>
        </div>

        {form.features.length === 0 && (
          <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border/60 rounded-lg">
            No features added yet. Add highlights to showcase your strengths.
          </p>
        )}

        <div className="space-y-2">
          {form.features.map((feature, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_32px] gap-2 p-3 rounded-lg border border-border/60 bg-muted/20"
            >
              <Input
                value={feature.title}
                onChange={(e) => updateFeature(index, 'title', e.target.value)}
                placeholder="Feature title *"
                className="h-8 text-xs"
                maxLength={100}
                disabled={pending}
              />
              <Input
                value={feature.description}
                onChange={(e) => updateFeature(index, 'description', e.target.value)}
                placeholder="Short description"
                className="h-8 text-xs"
                maxLength={300}
                disabled={pending}
              />
              <Input
                value={feature.icon ?? ''}
                onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                placeholder="Icon (e.g. award)"
                className="h-8 text-xs"
                maxLength={40}
                disabled={pending}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => removeFeature(index)}
                disabled={pending}
              >
                <IconTrash size={14} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <div className="flex items-center gap-3">
          <Switch
            id="about-visible"
            checked={form.isVisible}
            onCheckedChange={(v) => set('isVisible', v)}
            disabled={pending}
          />
          <Label htmlFor="about-visible" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer">
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
          {pending ? 'Saving…' : 'Save About'}
        </Button>
      </div>
    </form>
  );
}
