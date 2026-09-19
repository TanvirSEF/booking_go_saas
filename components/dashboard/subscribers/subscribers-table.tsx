'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  IconRotateClockwise,
  IconDotsVertical,
  IconTrash,
  IconMail,
  IconMailOff,
  IconLoader2,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { TablePaginationBar } from '@/components/shared/table-pagination-bar';
import { toast } from 'sonner';
import {
  deleteSubscriberAction,
  bulkDeleteSubscribersAction,
} from '@/actions/subscribe';
import type {
  SubscriberDTO,
  SubscriberCounts,
  SubscriberStatus,
} from '@/types/subscribe';

interface SubscribersTableProps {
  subscribers: SubscriberDTO[];
  counts: SubscriberCounts;
  totalFiltered: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    search?: string;
    status?: SubscriberStatus | 'all';
  };
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

export function SubscribersTable({
  subscribers,
  counts,
  totalFiltered,
  page,
  limit,
  totalPages,
  filters,
}: SubscribersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [deleteTarget, setDeleteTarget] = useState<SubscriberDTO | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const currentStatus = filters.status || 'all';

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      params.set('page', '1');

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  // Debounced search
  useEffect(() => {
    if (searchTerm === (filters.search || '')) return;

    const timeout = setTimeout(() => {
      updateFilters({ search: searchTerm.trim() || null });
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchTerm, filters.search, updateFilters]);

  const handleStatusTabChange = (status: 'all' | 'active' | 'unsubscribed') => {
    updateFilters({ status: status === 'all' ? null : status });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  // Selection handlers
  const allOnPageSelected =
    subscribers.length > 0 &&
    subscribers.every((sub) => selectedIds.has(sub.id));

  const someOnPageSelected =
    subscribers.some((sub) => selectedIds.has(sub.id)) && !allOnPageSelected;

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      subscribers.forEach((sub) => next.delete(sub.id));
    } else {
      subscribers.forEach((sub) => next.add(sub.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Single delete
  const confirmSingleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeletingSingle(true);
    try {
      const res = await deleteSubscriberAction(deleteTarget.id);
      if (res.success) {
        toast.success(res.message || 'Subscriber deleted successfully.');
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.id);
          return next;
        });
        setDeleteTarget(null);
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || 'Failed to delete subscriber.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Bulk delete
  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeletingBulk(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      const res = await bulkDeleteSubscribersAction(idsToDelete);

      if (res.success) {
        toast.success(
          res.message || `Deleted ${idsToDelete.length} subscribers.`
        );
        setSelectedIds(new Set());
        setIsBulkDialogOpen(false);
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || 'Failed to delete subscribers.');
      }
    } catch {
      toast.error('An unexpected error occurred during bulk deletion.');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const hasActiveFilters = Boolean(searchTerm) || currentStatus !== 'all';

  return (
    <div className="space-y-4">
      {/* Top Controls: Status Tabs, Search Bar & Bulk Actions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
            <button
              type="button"
              onClick={() => handleStatusTabChange('all')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                currentStatus === 'all'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'hover:text-foreground'
              }`}
            >
              <span>All</span>
              <span className="rounded-full bg-muted-foreground/15 px-1.5 py-0.2 text-[10px] font-semibold">
                {counts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusTabChange('active')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                currentStatus === 'active'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'hover:text-foreground'
              }`}
            >
              <span>Active</span>
              <span className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 text-[10px] font-semibold">
                {counts.active}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusTabChange('unsubscribed')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                currentStatus === 'unsubscribed'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'hover:text-foreground'
              }`}
            >
              <span>Unsubscribed</span>
              <span className="rounded-full bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.2 text-[10px] font-semibold">
                {counts.unsubscribed}
              </span>
            </button>
          </div>

          {/* Real-time search bar */}
          <div className="relative flex-1 sm:max-w-xs">
            <IconSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              id="subscribers-search-input"
              type="text"
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-8 h-9 text-xs bg-background border-input transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  updateFilters({ search: null });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <IconX size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Multi-Row Selection Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-foreground animate-in fade-in-50">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {selectedIds.size} subscriber{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Clear selection
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDialogOpen(true)}
              className="h-7 text-xs gap-1.5 cursor-pointer font-medium"
            >
              <IconTrash size={14} />
              <span>Delete Selected</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Table Shell */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[44px] pl-4">
                  <Checkbox
                    checked={
                      allOnPageSelected
                        ? true
                        : someOnPageSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={handleToggleSelectAll}
                    aria-label="Select all subscribers on page"
                  />
                </TableHead>
                <TableHead className="min-w-[220px] font-semibold text-xs text-foreground">
                  Subscriber Email
                </TableHead>
                <TableHead className="min-w-[120px] font-semibold text-xs text-foreground">
                  Source
                </TableHead>
                <TableHead className="min-w-[110px] font-semibold text-xs text-foreground">
                  Theme
                </TableHead>
                <TableHead className="w-[120px] font-semibold text-xs text-foreground text-center">
                  Status
                </TableHead>
                <TableHead className="min-w-[130px] font-semibold text-xs text-foreground">
                  Subscribed Date
                </TableHead>
                <TableHead className="min-w-[130px] font-semibold text-xs text-foreground">
                  Unsubscribed Date
                </TableHead>
                <TableHead className="w-[60px] text-right font-semibold text-xs text-foreground pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2.5">
                      <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                        <IconMailOff size={24} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-foreground">
                          No subscribers found
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {hasActiveFilters
                            ? "We couldn't find any subscribers matching your search and filter criteria."
                            : 'You have not gathered any newsletter subscribers yet.'}
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          disabled={isPending}
                          className="text-xs h-8 cursor-pointer mt-1 gap-1.5"
                        >
                          <IconRotateClockwise
                            size={13}
                            className={isPending ? 'animate-spin' : ''}
                          />
                          <span>Reset Filters</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((sub) => {
                  const isSelected = selectedIds.has(sub.id);
                  const isActive = sub.status === 'active';

                  return (
                    <TableRow
                      key={sub.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        isSelected ? 'bg-muted/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelectRow(sub.id)}
                          aria-label={`Select ${sub.email}`}
                        />
                      </TableCell>

                      {/* Subscriber Email */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <IconMail size={15} />
                          </div>
                          <span className="font-medium text-xs sm:text-sm text-foreground truncate max-w-[220px] sm:max-w-[320px]">
                            {sub.email}
                          </span>
                        </div>
                      </TableCell>

                      {/* Opt-in Source */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[11px] font-normal capitalize px-2 py-0.5"
                        >
                          {sub.source || 'footer'}
                        </Badge>
                      </TableCell>

                      {/* Theme */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground capitalize">
                          {sub.theme || 'default'}
                        </span>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium px-2.5 py-0.5 border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {isActive ? 'Active' : 'Unsubscribed'}
                        </Badge>
                      </TableCell>

                      {/* Subscribed Date */}
                      <TableCell className="text-xs text-foreground">
                        {formatDate(sub.createdAt)}
                      </TableCell>

                      {/* Unsubscribed Date */}
                      <TableCell className="text-xs text-muted-foreground">
                        {sub.unsubscribedAt ? formatDate(sub.unsubscribedAt) : '-'}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 cursor-pointer hover:bg-muted"
                              aria-label={`Actions for ${sub.email}`}
                            >
                              <IconDotsVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground truncate">
                              {sub.email}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(sub)}
                              className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                            >
                              <IconTrash size={15} />
                              <span>Delete</span>
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
        </div>

        {/* Unified Pagination Footer */}
        <TablePaginationBar
          total={totalFiltered}
          page={page}
          limit={limit}
          totalPages={totalPages}
          noun="subscribers"
          pageSizeOptions={[10, 25, 50]}
        />
      </div>

      {/* Single Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeletingSingle) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <IconAlertTriangle size={20} />
              <DialogTitle>Delete Subscriber</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Are you sure you want to delete{' '}
              <strong className="text-foreground">{deleteTarget?.email}</strong>?
              This record will be permanently removed from your newsletter
              audience.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeletingSingle}
              className="cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmSingleDelete}
              disabled={isDeletingSingle}
              className="cursor-pointer text-xs gap-1.5"
            >
              {isDeletingSingle ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <IconTrash size={14} />
                  <span>Delete Subscriber</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={isBulkDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeletingBulk) setIsBulkDialogOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <IconAlertTriangle size={20} />
              <DialogTitle>Delete Subscribers</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Are you sure you want to permanently delete{' '}
              <strong className="text-foreground">
                {selectedIds.size} subscriber{selectedIds.size > 1 ? 's' : ''}
              </strong>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDialogOpen(false)}
              disabled={isDeletingBulk}
              className="cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmBulkDelete}
              disabled={isDeletingBulk}
              className="cursor-pointer text-xs gap-1.5"
            >
              {isDeletingBulk ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <IconTrash size={14} />
                  <span>Delete {selectedIds.size} Records</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
