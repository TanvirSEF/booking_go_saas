'use client';

import * as React from 'react';
import Link from 'next/link';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  IconArrowLeft,
  IconSearch,
  IconX,
  IconDeviceFloppy,
  IconDownload,
  IconUpload,
  IconCheck,
  IconLoader2,
  IconInfoCircle,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  updateTranslationsAction,
  exportTranslationsAction,
  importTranslationsAction,
} from '@/actions/language';
import { TRANSLATION_GROUPS, getLanguageFlag } from '@/lib/language-utils';
import type { LanguageDTO } from '@/types/language';
import { cn } from '@/lib/utils';

export interface TranslationEntry {
  group: string;
  key: string;
  baseline: string;
  current: string;
}

interface TranslationEditorProps {
  language: LanguageDTO;
  initialEntries: TranslationEntry[];
}

export function TranslationEditor({
  language,
  initialEntries,
}: TranslationEditorProps) {
  const router = useRouter();

  // Active group tab and search
  const [selectedGroup, setSelectedGroup] = React.useState('all');
  const [search, setSearch] = React.useState('');

  // Translations edit state: maps `group:key` -> current string
  const [translationsMap, setTranslationsMap] = React.useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of initialEntries) {
      map[`${item.group}:${item.key}`] = item.current;
    }
    return map;
  });

  // Keep track of modified keys for highlighting and batch saving
  const [initialMap] = React.useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of initialEntries) {
      map[`${item.group}:${item.key}`] = item.current;
    }
    return map;
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [importJsonText, setImportJsonText] = React.useState('');
  const [importGroup, setImportGroup] = React.useState('general');
  const [isImporting, setIsImporting] = React.useState(false);

  // Compute dirty count
  const dirtyCount = React.useMemo(() => {
    let count = 0;
    for (const [compositeKey, val] of Object.entries(translationsMap)) {
      if (val !== initialMap[compositeKey]) {
        count++;
      }
    }
    return count;
  }, [translationsMap, initialMap]);

  // Filter entries based on active group tab and search query
  const displayedEntries = React.useMemo(() => {
    let items = initialEntries;

    if (selectedGroup !== 'all') {
      items = items.filter((i) => i.group === selectedGroup);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.key.toLowerCase().includes(q) ||
          i.baseline.toLowerCase().includes(q) ||
          (translationsMap[`${i.group}:${i.key}`] || '').toLowerCase().includes(q)
      );
    }

    return items;
  }, [initialEntries, selectedGroup, search, translationsMap]);

  const handleInputChange = (group: string, key: string, value: string) => {
    setTranslationsMap((prev) => ({
      ...prev,
      [`${group}:${key}`]: value,
    }));
  };

  const handleSaveChanges = async () => {
    // Collect all updated translations
    // Group updates by group key for structured updates
    const updatesByGroup: Record<string, Record<string, string>> = {};

    for (const item of initialEntries) {
      const compositeKey = `${item.group}:${item.key}`;
      const currentVal = translationsMap[compositeKey] ?? item.current;
      if (currentVal !== initialMap[compositeKey]) {
        if (!updatesByGroup[item.group]) {
          updatesByGroup[item.group] = {};
        }
        updatesByGroup[item.group][item.key] = currentVal;
      }
    }

    const groupKeys = Object.keys(updatesByGroup);
    if (groupKeys.length === 0) {
      toast.info('No changes to save.');
      return;
    }

    setIsSaving(true);
    try {
      let totalUpdated = 0;
      for (const grp of groupKeys) {
        const res = await updateTranslationsAction({
          languageCode: language.code,
          group: grp,
          translations: updatesByGroup[grp],
        });
        if (res.success && res.data) {
          totalUpdated += res.data.updatedCount;
        }
      }

      toast.success(`Successfully saved ${totalUpdated} translation string(s).`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save translations';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportTranslationsAction(
        language.code,
        selectedGroup === 'all' ? undefined : selectedGroup
      );
      if (res.success && res.data) {
        const jsonStr = JSON.stringify(res.data.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translations_${language.code}_${selectedGroup}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${language.code.toUpperCase()} dictionary (${selectedGroup})`);
      } else {
        toast.error(res.error || 'Export failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      toast.error(msg);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonText.trim()) {
      toast.error('Please paste valid JSON or select a file.');
      return;
    }

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(importJsonText);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Payload must be a JSON object mapping keys to values');
      }
    } catch {
      toast.error('Invalid JSON format. Please verify your syntax.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await importTranslationsAction({
        languageCode: language.code,
        group: importGroup,
        data: parsed,
        overwrite: true,
      });

      if (res.success) {
        toast.success(res.message || 'Translations imported successfully');
        setImportModalOpen(false);
        setImportJsonText('');
        router.refresh();
      } else {
        toast.error(res.error || 'Import failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setImportJsonText(content);
      }
    };
    reader.readAsText(file);
  };

  const flag = getLanguageFlag(language.code);

  return (
    <div className="space-y-6">
      {/* Header with Navigation & Action Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="size-9 shrink-0">
            <Link href="/super-admin/languages">
              <IconArrowLeft size={16} />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{flag}</span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {language.name}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  'font-mono uppercase text-[10px]',
                  language.direction === 'rtl' ? 'text-amber-600 border-amber-500/30' : 'text-blue-600 border-blue-500/30'
                )}
              >
                {language.direction.toUpperCase()}
              </Badge>
              {language.isDefault && (
                <Badge className="bg-emerald-600/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                  Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Locale Code: <code className="font-mono">{language.code}</code> • Baseline translation editor
            </p>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 gap-1.5 text-xs cursor-pointer"
          >
            <IconDownload size={15} />
            <span>Export JSON</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="h-9 gap-1.5 text-xs cursor-pointer"
          >
            <IconUpload size={15} />
            <span>Import JSON</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSaveChanges}
            disabled={isSaving || dirtyCount === 0}
            className="h-9 gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          >
            {isSaving ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDeviceFloppy size={15} />
            )}
            <span>Save Changes {dirtyCount > 0 ? `(${dirtyCount})` : ''}</span>
          </Button>
        </div>
      </div>

      {/* Group Navigation Tabs */}
      <div className="overflow-x-auto pb-1">
        <Tabs value={selectedGroup} onValueChange={setSelectedGroup} className="w-full">
          <TabsList className="h-auto p-1 bg-muted/50 inline-flex flex-wrap gap-1">
            {TRANSLATION_GROUPS.map((grp) => {
              const countInGroup =
                grp.id === 'all'
                  ? initialEntries.length
                  : initialEntries.filter((i) => i.group === grp.id).length;
              return (
                <TabsTrigger
                  key={grp.id}
                  value={grp.id}
                  className="gap-1.5 text-xs py-1.5 px-3 data-[state=active]:bg-background cursor-pointer"
                >
                  <span>{grp.label}</span>
                  <span className="text-[10px] opacity-70 font-mono">({countInGroup})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Search key or English label..."
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
            Showing <strong className="text-foreground">{displayedEntries.length}</strong> strings
            {dirtyCount > 0 && (
              <>
                {' '}
                • <span className="text-primary font-semibold">{dirtyCount} modified</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Two-Column Translation Grid */}
      <Card className="rounded-xl border-border bg-card shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/40 p-3 sm:px-6 sm:py-3 border-b border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
              English Baseline (Default Reference)
            </div>
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
              <span>
                {language.name} Translation ({language.direction.toUpperCase()})
              </span>
              {language.direction === 'rtl' && (
                <Badge variant="outline" className="text-[9px] uppercase font-mono">
                  RTL Layout Active
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-border/60">
          {displayedEntries.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No translation strings match your criteria.
            </div>
          ) : (
            displayedEntries.map((item) => {
              const compositeKey = `${item.group}:${item.key}`;
              const val = translationsMap[compositeKey] ?? item.current;
              const isModified = val !== initialMap[compositeKey];

              return (
                <div
                  key={compositeKey}
                  className={cn(
                    'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 transition-colors',
                    isModified && 'bg-primary/5'
                  )}
                >
                  {/* Left Column: Baseline String & Key */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground leading-relaxed">
                      {item.baseline || <span className="italic text-muted-foreground">Empty</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {item.group}.{item.key}
                      </code>
                    </div>
                  </div>

                  {/* Right Column: Editable Target Input */}
                  <div className="space-y-1">
                    <Input
                      value={val}
                      dir={language.direction}
                      onChange={(e) => handleInputChange(item.group, item.key, e.target.value)}
                      placeholder={`Translate into ${language.name}...`}
                      className={cn(
                        'h-9 text-xs bg-background transition-all',
                        language.direction === 'rtl' && 'text-right',
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

      {/* Floating Save Banner if changes exist */}
      {dirtyCount > 0 && (
        <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-xl border border-primary/30 bg-background/95 backdrop-blur-md p-3 sm:px-6 shadow-xl">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex size-2 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-foreground">
              You have {dirtyCount} unsaved translation {dirtyCount === 1 ? 'change' : 'changes'}.
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="h-8 gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          >
            {isSaving ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconCheck size={14} />
            )}
            <span>Save Now</span>
          </Button>
        </div>
      )}

      {/* Import JSON Dialog */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <form onSubmit={handleImportSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <IconUpload size={16} className="text-primary" />
                <span>Import JSON Translations</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Upload or paste a JSON dictionary to update translations for {language.name} ({language.code.toUpperCase()}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Target Namespace Group</Label>
                <select
                  value={importGroup}
                  onChange={(e) => setImportGroup(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs"
                >
                  {TRANSLATION_GROUPS.filter((g) => g.id !== 'all').map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label} ({g.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Upload .json File</Label>
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="h-9 text-xs cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Or Paste JSON Content</Label>
                <Textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{ "save": "Guardar cambios", "cancel": "Cancelar" }'
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(false)}
                disabled={isImporting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isImporting || !importJsonText.trim()}
                className="text-xs font-semibold"
              >
                {isImporting ? (
                  <>
                    <IconLoader2 size={14} className="animate-spin mr-1.5" />
                    <span>Importing...</span>
                  </>
                ) : (
                  'Import Translations'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
