'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  IconPalette,
  IconCode,
  IconLoader2,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateThemeSettingsAction } from '@/actions/theme-setting';
import { cn } from '@/lib/utils';
import type { ThemeStylingDTO } from '@/types/theme-setting';

interface SectionStylingFormProps {
  initialData: ThemeStylingDTO;
  onSaved: (styling: ThemeStylingDTO) => void;
}

const FONT_FAMILIES = ['Inter', 'Roboto', 'Outfit', 'Poppins', 'Lato', 'Open Sans'];

const COLOR_PRESETS = [
  { name: 'Slate', hex: '#0f172a' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Blue', hex: '#0284c7' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Teal', hex: '#0d9488' },
];

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function ColorPickerField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
  disabled: boolean;
}) {
  const [hexInput, setHexInput] = useState(value);

  const handleHexChange = (raw: string) => {
    setHexInput(raw);
    if (HEX_REGEX.test(raw)) onChange(raw);
  };

  const handleColorPicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setHexInput(hex);
    onChange(hex);
  };

  const handlePreset = (hex: string) => {
    setHexInput(hex);
    onChange(hex);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-semibold">
        {label}
      </Label>
      <div className="flex gap-2">
        <div className="relative shrink-0">
          <input
            type="color"
            value={HEX_REGEX.test(value) ? value : '#000000'}
            onChange={handleColorPicker}
            disabled={disabled}
            className="w-9 h-9 rounded-md border border-border/60 cursor-pointer p-0.5 bg-card"
            title="Pick a color"
          />
        </div>
        <Input
          id={id}
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#000000"
          className={cn(
            'h-9 text-xs font-mono flex-1',
            hexInput && !HEX_REGEX.test(hexInput) && 'border-destructive focus-visible:ring-destructive'
          )}
          maxLength={7}
          disabled={disabled}
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.hex}
            type="button"
            title={preset.name}
            onClick={() => handlePreset(preset.hex)}
            disabled={disabled}
            className={cn(
              'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
              value === preset.hex
                ? 'border-foreground shadow-sm scale-110'
                : 'border-transparent hover:border-muted-foreground/50'
            )}
            style={{ backgroundColor: preset.hex }}
          />
        ))}
      </div>
    </div>
  );
}

export function SectionStylingForm({ initialData, onSaved }: SectionStylingFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ThemeStylingDTO>(initialData);

  const set = <K extends keyof ThemeStylingDTO>(key: K, value: ThemeStylingDTO[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!HEX_REGEX.test(form.primaryColor)) {
      toast.error('Primary color must be a valid hex value (e.g. #4f46e5).');
      return;
    }
    if (!HEX_REGEX.test(form.secondaryColor)) {
      toast.error('Secondary color must be a valid hex value (e.g. #3b82f6).');
      return;
    }

    startTransition(async () => {
      const res = await updateThemeSettingsAction({ styling: form });
      if (res.success && res.data) {
        onSaved(res.data.styling);
        toast.success(res.message ?? 'Brand styling saved.');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to save styling.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <ColorPickerField
          id="primary-color"
          label="Primary Brand Color"
          value={form.primaryColor}
          onChange={(hex) => set('primaryColor', hex)}
          disabled={pending}
        />
        <ColorPickerField
          id="secondary-color"
          label="Secondary Accent Color"
          value={form.secondaryColor}
          onChange={(hex) => set('secondaryColor', hex)}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5 pt-2 border-t border-border/60">
        <Label htmlFor="font-family" className="text-xs font-semibold flex items-center gap-1.5">
          <IconPalette size={13} className="text-primary" />
          Font Family
        </Label>
        <Select
          value={form.fontFamily}
          onValueChange={(v) => set('fontFamily', v)}
          disabled={pending}
        >
          <SelectTrigger id="font-family" className="h-9 text-xs">
            <SelectValue placeholder="Select font family" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font} value={font} className="text-xs" style={{ fontFamily: font }}>
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="custom-css" className="text-xs font-semibold flex items-center gap-1.5">
          <IconCode size={13} className="text-primary" />
          Custom CSS
          <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="custom-css"
          value={form.customCss}
          onChange={(e) => set('customCss', e.target.value)}
          placeholder={`.hero-title {\n  font-size: 3rem;\n  letter-spacing: -0.02em;\n}`}
          className="text-xs font-mono resize-none min-h-24 bg-muted/20"
          disabled={pending}
        />
        <p className="text-[11px] text-muted-foreground">
          Injected into the public booking page <code className="bg-muted px-1 rounded">&lt;head&gt;</code>. Use with caution.
        </p>
      </div>

      <div className="flex justify-end pt-2 border-t border-border/60">
        <Button type="submit" size="sm" disabled={pending} className="h-8 text-xs gap-1.5">
          {pending ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconDeviceFloppy size={13} />
          )}
          {pending ? 'Saving…' : 'Save Styling'}
        </Button>
      </div>
    </form>
  );
}
