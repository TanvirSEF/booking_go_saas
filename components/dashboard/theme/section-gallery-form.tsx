'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  IconPhoto,
  IconPlus,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
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
import type { ThemeGalleryDTO, ThemeGalleryImageDTO } from '@/types/theme-setting';

interface SectionGalleryFormProps {
  initialData: ThemeGalleryDTO;
  onSaved: (gallery: ThemeGalleryDTO) => void;
}

const emptyImage = (): ThemeGalleryImageDTO => ({ url: '', caption: '' });

export function SectionGalleryForm({ initialData, onSaved }: SectionGalleryFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ThemeGalleryDTO>(initialData);

  const setTitle = (value: string) => setForm((prev) => ({ ...prev, title: value }));
  const setVisible = (value: boolean) => setForm((prev) => ({ ...prev, isVisible: value }));

  const addImage = () =>
    setForm((prev) => ({ ...prev, images: [...prev.images, emptyImage()] }));

  const removeImage = (index: number) =>
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));

  const updateImage = (index: number, key: keyof ThemeGalleryImageDTO, value: string) =>
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => (i === index ? { ...img, [key]: value } : img)),
    }));

  const moveImage = (index: number, direction: 'up' | 'down') => {
    setForm((prev) => {
      const updated = [...prev.images];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= updated.length) return prev;
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return { ...prev, images: updated };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const invalidImage = form.images.find((img) => !img.url.trim());
    if (invalidImage) {
      toast.error('Each gallery image must have a URL.');
      return;
    }

    startTransition(async () => {
      const payload = {
        ...form,
        images: form.images.map((img) => ({
          url: img.url,
          caption: img.caption ?? '',
        })),
      };
      const res = await updateThemeSettingsAction({ gallery: payload });
      if (res.success && res.data) {
        onSaved(res.data.gallery);
        toast.success(res.message ?? 'Gallery saved.');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to save gallery.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="gallery-title" className="text-xs font-semibold">
          Gallery Section Title
        </Label>
        <Input
          id="gallery-title"
          value={form.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Our Atmosphere & Work"
          className="h-9 text-xs"
          maxLength={200}
          disabled={pending}
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <IconPhoto size={13} className="text-primary" />
            Gallery Images ({form.images.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addImage}
            disabled={pending || form.images.length >= 20}
            className="h-7 text-[11px] gap-1"
          >
            <IconPlus size={12} />
            Add Image
          </Button>
        </div>

        {form.images.length === 0 && (
          <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border/60 rounded-lg">
            No images added. Add image URLs to build the gallery carousel.
          </p>
        )}

        <div className="space-y-2">
          {form.images.map((img, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 rounded-lg border border-border/60 bg-muted/20"
            >
              <div className="flex flex-col gap-1 shrink-0 mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => moveImage(index, 'up')}
                  disabled={pending || index === 0}
                >
                  <IconArrowUp size={12} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => moveImage(index, 'down')}
                  disabled={pending || index === form.images.length - 1}
                >
                  <IconArrowDown size={12} />
                </Button>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                <div className="relative">
                  <IconPhoto size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    value={img.url}
                    onChange={(e) => updateImage(index, 'url', e.target.value)}
                    placeholder="Image URL *"
                    className="pl-8 h-8 text-xs"
                    disabled={pending}
                  />
                </div>
                <Input
                  value={img.caption ?? ''}
                  onChange={(e) => updateImage(index, 'caption', e.target.value)}
                  placeholder="Caption (optional)"
                  className="h-8 text-xs"
                  maxLength={150}
                  disabled={pending}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => removeImage(index)}
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
            id="gallery-visible"
            checked={form.isVisible}
            onCheckedChange={setVisible}
            disabled={pending}
          />
          <Label htmlFor="gallery-visible" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer">
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
          {pending ? 'Saving…' : 'Save Gallery'}
        </Button>
      </div>
    </form>
  );
}
