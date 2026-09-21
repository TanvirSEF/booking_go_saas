'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  IconSearch,
  IconX,
  IconDeviceFloppy,
  IconRotateClockwise,
  IconLoader2,
  IconInfoCircle,
  IconSparkles,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  getTranslationsAction,
  updateTranslationsAction,
  resetTenantTranslationsAction,
} from '@/actions/language';
import { getLanguageFlag } from '@/lib/language-utils';
import type { LanguageDTO } from '@/types/language';
import { cn } from '@/lib/utils';

const TENANT_GROUPS = [
  { id: 'all', label: 'All Customer Overrides' },
  { id: 'appointments', label: 'Booking & Appointments' },
  { id: 'customer', label: 'Customer Portal' },
  { id: 'services', label: 'Services' },
  { id: 'emails', label: 'Email Notifications' },
  { id: 'general', label: 'General & Statuses' },
] as const;

interface TenantLanguageSettingsProps {
  availableLanguages: LanguageDTO[];
}

export function TenantLanguageSettings({
  availableLanguages,
}: TenantLanguageSettingsProps) {
  const router = useRouter();

  // Selected target language
  const [selectedLang, setSelectedLang] = React.useState<string>(() => {
    return availableLanguages[0]?.code || 'en';
  });

  // Selected group tab and search
  const [selectedGroup, setSelectedGroup] = React.useState('all');
  const [search, setSearch] = React.useState('');

  // Translations state
  const [systemBaseline, setSystemBaseline] = React.useState<Record<string, string>>({});
  const [tenantOverrides, setTenantOverrides] = React.useState<Record<string, string>>({});
  const [initialOverrides, setInitialOverrides] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  const activeLangObj = availableLanguages.find((l) => l.code === selectedLang) || {
    code: selectedLang,
    name: selectedLang.toUpperCase(),
    direction: 'ltr' as const,
  };

  // Load translations cascade whenever selected language changes
  React.useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      setIsLoading(true);
      try {
        const [baseRes, tenantRes] = await Promise.all([
          getTranslationsAction({
            languageCode: selectedLang,
            group: undefined,
            tenantScope: false,
          }),
          getTranslationsAction({
            languageCode: selectedLang,
            group: undefined,
            tenantScope: true,
          }),
        ]);

        if (isCancelled) return;

        if (baseRes.success && baseRes.data) {
          setSystemBaseline(baseRes.data.translations);
        }

        if (tenantRes.success && tenantRes.data) {
          const resolved = tenantRes.data.translations;
          const overrides: Record<string, string> = {};
          for (const [key, val] of Object.entries(resolved)) {
            overrides[key] = val;
          }
          setTenantOverrides(overrides);
          setInitialOverrides(overrides);
        }
      } catch {
        if (!isCancelled) {
          toast.error('Failed to load translations.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [selectedLang]);

  // Keys list derived from system baseline
  const translationKeys = React.useMemo(() => {
    return Object.keys(systemBaseline);
  }, [systemBaseline]);

  // Dirty count
  const dirtyCount = React.useMemo(() => {
    let count = 0;
    for (const key of translationKeys) {
      if (tenantOverrides[key] !== initialOverrides[key]) {
        count++;
      }
    }
    return count;
  }, [translationKeys, tenantOverrides, initialOverrides]);

  // Filtered keys
  const filteredKeys = React.useMemo(() => {
    return translationKeys.filter((key) => {
      // Group filter (heuristic: check prefix or include all)
      if (selectedGroup !== 'all') {
        // Only show if relevant to group
      }

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const baseVal = (systemBaseline[key] || '').toLowerCase();
        const curVal = (tenantOverrides[key] || '').toLowerCase();
        return key.toLowerCase().includes(q) || baseVal.includes(q) || curVal.includes(q);
      }

      return true;
    });
  }, [translationKeys, selectedGroup, search, systemBaseline, tenantOverrides]);

  const handleInputChange = (key: string, value: string) => {
    setTenantOverrides((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveOverrides = async () => {
    // Only send modified keys
    const changedTranslations: Record<string, string> = {};
    for (const key of translationKeys) {
      if (tenantOverrides[key] !== initialOverrides[key]) {
        changedTranslations[key] = tenantOverrides[key];
      }
    }

    if (Object.keys(changedTranslations).length === 0) {
      toast.info('No changes to save.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateTranslationsAction({
        languageCode: selectedLang,
        group: 'general',
        translations: changedTranslations,
      });

      if (res.success) {
        toast.success(res.message || 'Custom overrides saved successfully.');
        setInitialOverrides({ ...tenantOverrides });
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to save overrides');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save overrides';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetOverrides = async () => {
    setIsResetting(true);
    try {
      const res = await resetTenantTranslationsAction({
        languageCode: selectedLang,
        group: selectedGroup === 'all' ? undefined : selectedGroup,
      });

      if (res.success) {
        toast.success(res.message || 'Overrides reset to system default');
        // Reset overrides in local state back to baseline
        setTenantOverrides({ ...systemBaseline });
        setInitialOverrides({ ...systemBaseline });
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to reset overrides');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error resetting overrides';
      toast.error(msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Selector and Action Controls */}
      <Card className="rounded-xl border-border bg-card p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconSparkles size={16} />
              </span>
              <h2 className="text-base font-bold text-foreground">
                Customer-Facing Language Overrides
              </h2>
            </div>
            <p className="text-xs text-muted-foreground max-w-xl">
              Customize text labels displayed on your booking widget, customer portal, and email notices. Any string you leave blank automatically falls back to system defaults.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Language Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Locale:</span>
              <Select value={selectedLang} onValueChange={setSelectedLang}>
                <SelectTrigger className="h-9 w-44 text-xs font-medium cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="text-xs">
                      <span className="mr-1.5">{getLanguageFlag(lang.code)}</span>
                      <span>{lang.name}</span>{' '}
                      <span className="text-muted-foreground font-mono uppercase">
                        ({lang.code})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset to Default Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading || isResetting}
                  className="h-9 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                >
                  <IconRotateClockwise size={14} />
                  <span>Reset Overrides</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Reset {activeLangObj.name} Overrides?
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    This will delete your company-specific custom labels for{' '}
                    <strong className="text-foreground">{activeLangObj.name}</strong>. Your public booking pages will immediately display standard system defaults.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2.5">
                  <Button variant="outline" size="sm" className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleResetOverrides}
                    disabled={isResetting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
                  >
                    {isResetting ? (
                      <>
                        <IconLoader2 size={14} className="animate-spin mr-1.5" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      'Confirm Reset'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Save Button */}
            <Button
              size="sm"
              onClick={handleSaveOverrides}
              disabled={isSaving || dirtyCount === 0}
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
            >
              {isSaving ? (
                <IconLoader2 size={15} className="animate-spin" />
              ) : (
                <IconDeviceFloppy size={15} />
              )}
              <span>Save Overrides {dirtyCount > 0 ? `(${dirtyCount})` : ''}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Group Navigation Tabs */}
      <div className="overflow-x-auto pb-1">
        <Tabs value={selectedGroup} onValueChange={setSelectedGroup} className="w-full">
          <TabsList className="h-auto p-1 bg-muted/50 inline-flex flex-wrap gap-1">
            {TENANT_GROUPS.map((grp) => (
              <TabsTrigger
                key={grp.id}
                value={grp.id}
                className="gap-1.5 text-xs py-1.5 px-3 data-[state=active]:bg-background cursor-pointer"
              >
                <span>{grp.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Search key or text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-8 text-xs bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <IconX size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <IconInfoCircle size={14} />
          <span>
            Showing <strong className="text-foreground">{filteredKeys.length}</strong> configurable labels
            {dirtyCount > 0 && (
              <span className="text-primary font-semibold"> • {dirtyCount} modified</span>
            )}
          </span>
        </div>
      </div>

      {/* Editor Grid */}
      <Card className="rounded-xl border-border bg-card shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/40 p-3 sm:px-6 sm:py-3 border-b border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
              System Default Baseline
            </div>
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Your Custom Brand Override</span>
              {activeLangObj.direction === 'rtl' && (
                <Badge variant="outline" className="text-[9px] uppercase font-mono">
                  RTL
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-border/60">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <IconLoader2 size={18} className="animate-spin text-primary" />
              <span>Loading dictionary labels...</span>
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No labels found matching your filter.
            </div>
          ) : (
            filteredKeys.map((key) => {
              const baseVal = systemBaseline[key] || '';
              const curVal = tenantOverrides[key] ?? '';
              const isModified = curVal !== initialOverrides[key];
              const hasCustomOverride = curVal && curVal !== baseVal;

              return (
                <div
                  key={key}
                  className={cn(
                    'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 transition-colors',
                    isModified && 'bg-primary/5'
                  )}
                >
                  {/* Left Column: System Baseline */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground leading-relaxed">
                      {baseVal || <span className="italic text-muted-foreground">Empty</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {key}
                      </code>
                      {hasCustomOverride && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] bg-primary/10 text-primary border-transparent"
                        >
                          Customized
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Custom Override Input */}
                  <div className="space-y-1">
                    <Input
                      value={curVal}
                      dir={activeLangObj.direction}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      placeholder={baseVal || 'Enter custom label...'}
                      className={cn(
                        'h-9 text-xs bg-background transition-all',
                        activeLangObj.direction === 'rtl' && 'text-right',
                        isModified && 'border-primary ring-1 ring-primary/30'
                      )}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
