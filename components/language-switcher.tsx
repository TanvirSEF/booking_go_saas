'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  IconWorld,
  IconChevronDown,
  IconCheck,
  IconLoader2,
} from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { changeUserLanguageAction, getLanguagesAction } from '@/actions/language';
import { getLanguageFlag } from '@/lib/language-utils';
import type { LanguageDTO } from '@/types/language';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  currentLang?: string;
  initialLanguages?: LanguageDTO[];
  className?: string;
}

export function LanguageSwitcher({
  currentLang,
  initialLanguages,
  className,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const [languages, setLanguages] = React.useState<LanguageDTO[]>(initialLanguages || []);
  const [activeCode, setActiveCode] = React.useState<string>(() => {
    if (currentLang) return currentLang.toLowerCase();
    if (typeof document !== 'undefined') {
      return document.documentElement.lang?.toLowerCase() || 'en';
    }
    return 'en';
  });
  const [isPending, startTransition] = React.useTransition();
  const [isLoadingList, setIsLoadingList] = React.useState(
    () => !initialLanguages || initialLanguages.length === 0
  );

  // Sync initial language to html element on mount
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const activeLangObj = languages.find((l) => l.code === activeCode);
      if (activeLangObj) {
        document.documentElement.lang = activeLangObj.code;
        document.documentElement.dir = activeLangObj.direction;
      }
    }
  }, [activeCode, languages]);

  // Fetch languages if not pre-provided
  React.useEffect(() => {
    if (initialLanguages && initialLanguages.length > 0) return;

    let isMounted = true;
    getLanguagesAction({ includeInactive: false })
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setLanguages(res.data);
        }
      })
      .catch(() => {
        // Quiet fallback
      })
      .finally(() => {
        if (isMounted) setIsLoadingList(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialLanguages]);

  const activeLang = languages.find((l) => l.code === activeCode) || {
    code: activeCode,
    name: activeCode.toUpperCase(),
    direction: 'ltr' as const,
  };

  const handleSelectLanguage = (lang: LanguageDTO) => {
    if (lang.code === activeCode || isPending) return;

    startTransition(async () => {
      // Optimistically update DOM direction and language attribute
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang.code;
        document.documentElement.dir = lang.direction;
      }
      setActiveCode(lang.code);

      try {
        const res = await changeUserLanguageAction({ lang: lang.code });
        if (res.success) {
          toast.success(res.message || `Language changed to ${lang.name}`);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to switch language');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Network error';
        toast.error(errorMsg);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className={cn(
            'flex h-9 shrink-0 items-center gap-1.5 rounded-lg border-border bg-card px-2 sm:px-2.5 text-xs font-medium shadow-2xs hover:bg-accent cursor-pointer transition-colors',
            className
          )}
          aria-label="Change language"
        >
          {isPending ? (
            <IconLoader2 size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <span className="text-sm leading-none">{getLanguageFlag(activeLang.code)}</span>
          )}
          <span className="font-semibold uppercase tracking-wider">{activeLang.code}</span>
          <IconChevronDown size={12} className="text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 rounded-xl p-1 shadow-lg max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span>Select Language</span>
          <IconWorld size={13} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoadingList && languages.length === 0 ? (
          <div className="p-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <IconLoader2 size={14} className="animate-spin" />
            <span>Loading locales...</span>
          </div>
        ) : languages.length === 0 ? (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            No languages available
          </DropdownMenuItem>
        ) : (
          languages.map((lang) => {
            const isSelected = lang.code === activeCode;
            return (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleSelectLanguage(lang)}
                className={cn(
                  'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors',
                  isSelected && 'bg-accent text-accent-foreground font-semibold'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{getLanguageFlag(lang.code)}</span>
                  <div className="flex flex-col text-left">
                    <span className="text-foreground">{lang.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                      {lang.code}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {lang.direction === 'rtl' && (
                    <Badge variant="outline" className="px-1 py-0 text-[9px] uppercase font-mono">
                      RTL
                    </Badge>
                  )}
                  {isSelected && <IconCheck size={14} className="text-primary shrink-0" />}
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
