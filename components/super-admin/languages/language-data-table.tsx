'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  IconSearch,
  IconX,
  IconPlus,
  IconDotsVertical,
  IconEdit,
  IconLanguage,
  IconDownload,
  IconTrash,
  IconWorld,
  IconAlertTriangle,
  IconLoader2,
} from '@tabler/icons-react';
import { TablePaginationBar } from '@/components/shared/table-pagination-bar';
import { CreateLanguageDialog } from './create-language-dialog';
import { EditLanguageDialog } from './edit-language-dialog';
import {
  toggleLanguageStatusAction,
  deleteLanguageAction,
  exportTranslationsAction,
} from '@/actions/language';
import { getLanguageFlag } from '@/lib/language-utils';
import type { LanguageDTO } from '@/types/language';
import { toast } from 'sonner';

interface LanguageDataTableProps {
  initialLanguages: LanguageDTO[];
}

export function LanguageDataTable({ initialLanguages }: LanguageDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Search & Pagination URL State
  const searchQuery = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limitParam = parseInt(searchParams.get('limit') || '10', 10);

  const [search, setSearch] = React.useState(searchQuery);
  const [isPending, startTransition] = React.useTransition();

  // Dialog States
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingLang, setEditingLang] = React.useState<LanguageDTO | null>(null);
  const [deletingLang, setDeletingLang] = React.useState<LanguageDTO | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Sync debounced search to URL
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (search !== searchQuery) {
        const params = new URLSearchParams(searchParams.toString());
        if (search) {
          params.set('search', search);
        } else {
          params.delete('search');
        }
        params.set('page', '1');
        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`);
        });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [search, searchQuery, pathname, router, searchParams]);

  // Filtered languages
  const filteredLanguages = React.useMemo(() => {
    if (!searchQuery.trim()) return initialLanguages;
    const q = searchQuery.toLowerCase().trim();
    return initialLanguages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.direction.toLowerCase().includes(q)
    );
  }, [initialLanguages, searchQuery]);

  // Paginated slice
  const total = filteredLanguages.length;
  const totalPages = Math.max(1, Math.ceil(total / limitParam));
  const currentPage = Math.min(Math.max(1, pageParam), totalPages);
  const startIdx = (currentPage - 1) * limitParam;
  const paginatedLanguages = filteredLanguages.slice(startIdx, startIdx + limitParam);

  const handleClearSearch = () => {
    setSearch('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.set('page', '1');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleToggleStatus = (lang: LanguageDTO) => {
    if (lang.isDefault) {
      toast.error('The default system language cannot be disabled.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await toggleLanguageStatusAction(lang.code, !lang.status);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to update status');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error updating status';
        toast.error(msg);
      }
    });
  };

  const handleDelete = async () => {
    if (!deletingLang) return;
    if (deletingLang.isDefault) {
      toast.error('The default system language cannot be deleted.');
      setDeletingLang(null);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteLanguageAction(deletingLang.code);
      if (res.success) {
        toast.success(res.message);
        setDeletingLang(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to delete language');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportJson = async (code: string) => {
    try {
      const res = await exportTranslationsAction(code, 'all');
      if (res.success && res.data) {
        const jsonStr = JSON.stringify(res.data.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translations_${code}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${code.toUpperCase()} dictionary`);
      } else {
        toast.error(res.error || 'Failed to export translations');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Debounced Search with clear button */}
        <div className="relative w-full sm:w-80">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Search language or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-8 text-xs bg-background"
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Clear search"
            >
              <IconX size={14} />
            </button>
          )}
        </div>

        {/* Add Language Button */}
        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold shadow-xs cursor-pointer shrink-0"
        >
          <IconPlus size={16} />
          <span>Add Language</span>
        </Button>
      </div>

      {/* Standard Table Shell */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[90px] font-semibold text-xs text-foreground">Code</TableHead>
              <TableHead className="font-semibold text-xs text-foreground">Language Name</TableHead>
              <TableHead className="font-semibold text-xs text-foreground">Direction</TableHead>
              <TableHead className="font-semibold text-xs text-foreground">Translations</TableHead>
              <TableHead className="font-semibold text-xs text-foreground">Default</TableHead>
              <TableHead className="font-semibold text-xs text-foreground">Active Status</TableHead>
              <TableHead className="w-[80px] text-right font-semibold text-xs text-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLanguages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                      <IconWorld size={24} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">No languages found</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {searchQuery
                        ? `No results matching "${searchQuery}". Try clearing your search filters.`
                        : 'No system languages registered yet.'}
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearSearch}
                        className="mt-2 text-xs"
                      >
                        Reset Search
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLanguages.map((lang) => {
                const flag = getLanguageFlag(lang.code);
                return (
                  <TableRow key={lang._id} className="hover:bg-muted/30 transition-colors">
                    {/* Code + Flag */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-base leading-none">{flag}</span>
                        <span className="font-bold text-foreground uppercase">{lang.code}</span>
                      </div>
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground">{lang.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {lang.isDefault ? 'Primary platform language' : 'Secondary locale'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Direction */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          lang.direction === 'rtl'
                            ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono text-[10px]'
                            : 'border-blue-500/30 text-blue-600 dark:text-blue-400 font-mono text-[10px]'
                        }
                      >
                        {lang.direction.toUpperCase()}
                      </Badge>
                    </TableCell>

                    {/* Translation Count */}
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {lang.translationCount ?? 0} keys
                      </Badge>
                    </TableCell>

                    {/* Default badge */}
                    <TableCell>
                      {lang.isDefault ? (
                        <Badge className="bg-emerald-600/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-semibold">
                          Default
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Active toggle */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={lang.status}
                          onCheckedChange={() => handleToggleStatus(lang)}
                          disabled={isPending || lang.isDefault}
                          aria-label={`Toggle active status for ${lang.name}`}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {lang.status ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 cursor-pointer"
                            aria-label={`Actions for ${lang.name}`}
                          >
                            <IconDotsVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-lg">
                          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground">
                            {lang.name} ({lang.code.toUpperCase()})
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem asChild className="cursor-pointer rounded-lg text-xs font-medium">
                            <Link
                              href={`/super-admin/languages/${lang.code}`}
                              className="flex items-center gap-2"
                            >
                              <IconLanguage size={14} className="text-primary" />
                              <span>Translate Strings</span>
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => setEditingLang(lang)}
                            className="cursor-pointer rounded-lg text-xs font-medium"
                          >
                            <IconEdit size={14} className="text-muted-foreground" />
                            <span>Edit Metadata</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleExportJson(lang.code)}
                            className="cursor-pointer rounded-lg text-xs font-medium"
                          >
                            <IconDownload size={14} className="text-muted-foreground" />
                            <span>Export JSON</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setDeletingLang(lang)}
                            disabled={lang.isDefault}
                            className="cursor-pointer rounded-lg text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive disabled:opacity-50"
                          >
                            <IconTrash size={14} />
                            <span>{lang.isDefault ? 'Cannot Delete Default' : 'Delete Language'}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Unified Table Pagination Bar */}
        <TablePaginationBar
          total={total}
          page={currentPage}
          limit={limitParam}
          totalPages={totalPages}
          noun="languages"
          pageSizeOptions={[10, 25, 50]}
          syncToUrl={true}
        />
      </div>

      {/* Create Modal */}
      <CreateLanguageDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Edit Modal */}
      <EditLanguageDialog
        language={editingLang}
        open={!!editingLang}
        onOpenChange={(open) => {
          if (!open) setEditingLang(null);
        }}
        onSuccess={() => router.refresh()}
      />

      {/* Delete Confirmation Alert */}
      <Dialog
        open={!!deletingLang}
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingLang(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
              <IconAlertTriangle size={18} />
              <span>Delete Language &quot;{deletingLang?.name}&quot;?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground space-y-2">
              <span>
                Are you sure you want to permanently delete{' '}
                <strong className="text-foreground">
                  {deletingLang?.name} ({deletingLang?.code.toUpperCase()})
                </strong>
                ? All translated strings for this locale will be removed, and users assigned to this language will automatically revert to default locale.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2.5">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeletingLang(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || deletingLang?.isDefault}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
            >
              {isDeleting ? (
                <>
                  <IconLoader2 size={14} className="animate-spin mr-1.5" />
                  <span>Deleting...</span>
                </>
              ) : (
                'Confirm Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
