'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { switchActiveThemeAction } from '@/actions/theme-setting';
import { cn } from '@/lib/utils';
import type { ThemePreset } from '@/types/theme-setting';

interface ThemePresetSelectorProps {
  activeTheme: ThemePreset;
  onThemeChange: (theme: ThemePreset) => void;
}

interface ThemeCard {
  id: ThemePreset;
  name: string;
  description: string;
  accentClass: string;
  stripColors: string[];
}

const THEME_CARDS: ThemeCard[] = [
  {
    id: 'theme1',
    name: 'Classic Pro',
    description: 'Clean, minimal full-width layout with a centered hero',
    accentClass: 'bg-slate-800',
    stripColors: ['bg-slate-800', 'bg-slate-100', 'bg-slate-200'],
  },
  {
    id: 'theme2',
    name: 'Indigo Bold',
    description: 'Split-screen hero with vibrant indigo brand panel',
    accentClass: 'bg-indigo-600',
    stripColors: ['bg-indigo-600', 'bg-indigo-100', 'bg-slate-50'],
  },
  {
    id: 'theme3',
    name: 'Emerald Fresh',
    description: 'Nature-inspired with soft emerald tones and card grid',
    accentClass: 'bg-emerald-600',
    stripColors: ['bg-emerald-600', 'bg-emerald-50', 'bg-white'],
  },
  {
    id: 'theme4',
    name: 'Rose Luxe',
    description: 'Elegant rose-tinted layout with full-bleed hero image',
    accentClass: 'bg-rose-500',
    stripColors: ['bg-rose-500', 'bg-rose-50', 'bg-slate-50'],
  },
  {
    id: 'theme5',
    name: 'Midnight Dark',
    description: 'Premium dark-mode public page with amber accents',
    accentClass: 'bg-zinc-900',
    stripColors: ['bg-zinc-900', 'bg-zinc-800', 'bg-amber-400'],
  },
];

export function ThemePresetSelector({ activeTheme, onThemeChange }: ThemePresetSelectorProps) {
  const [pending, startTransition] = useTransition();
  const [pendingTheme, setPendingTheme] = useState<ThemePreset | null>(null);

  const applyTheme = (theme: ThemePreset) => {
    if (theme === activeTheme) return;
    setPendingTheme(theme);
    startTransition(async () => {
      const res = await switchActiveThemeAction({ theme });
      if (res.success) {
        onThemeChange(theme);
        toast.success(res.message ?? `Theme switched to ${theme.toUpperCase()}.`);
      } else {
        toast.error(res.error ?? 'Failed to switch theme.');
      }
      setPendingTheme(null);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">Theme Preset</h2>
        <Badge variant="secondary" className="text-[10px] h-5 px-2">
          5 Layouts
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {THEME_CARDS.map((card) => {
          const isActive = card.id === activeTheme;
          const isThisPending = pendingTheme === card.id;

          return (
            <div
              key={card.id}
              className={cn(
                'relative rounded-xl border p-3 flex flex-col gap-2 transition-all duration-200',
                isActive
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm'
                  : 'border-border/60 bg-card hover:border-primary/40 hover:shadow-xs'
              )}
            >
              {isActive && (
                <span className="absolute -top-2 -right-2 size-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
                  <IconCheck size={11} className="text-primary-foreground" />
                </span>
              )}

              {/* Mini preview */}
              <div className="rounded-md overflow-hidden border border-border/40 aspect-video w-full flex flex-col gap-0.5 p-1 bg-muted/20">
                {card.stripColors.map((cls, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-sm flex-1',
                      cls,
                      i === 0 ? 'flex-[2]' : 'flex-1'
                    )}
                  />
                ))}
              </div>

              <div className="space-y-0.5 flex-1">
                <p className="text-xs font-semibold text-foreground leading-tight">{card.name}</p>
                <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                  {card.description}
                </p>
              </div>

              {isActive ? (
                <span className="text-[10px] font-semibold text-primary text-center py-1 rounded-md bg-primary/10">
                  Active Theme
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] w-full"
                  disabled={pending}
                  onClick={() => applyTheme(card.id)}
                >
                  {isThisPending ? (
                    <IconLoader2 size={12} className="animate-spin" />
                  ) : (
                    'Apply Theme'
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
