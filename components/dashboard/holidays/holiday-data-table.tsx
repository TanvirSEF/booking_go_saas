'use client';

import React, { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DeleteConfirmDialog } from '@/components/dashboard/services/delete-confirm-dialog';
import { TablePaginationBar } from '@/components/shared/table-pagination-bar';
import {
  IconCalendarEvent,
  IconTrash,
  IconSearch,
  IconX,
  IconClock,
  IconCalendarTime,
  IconCalendarRepeat,
  IconCalendar,
  IconRotateClockwise,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  deleteBusinessHolidayAction,
  deleteBusinessHolidayRangeAction,
} from '@/actions/business-holidays';
import type { BusinessHolidayDTO } from '@/types/business-hours';

interface HolidayDataTableProps {
  holidays: BusinessHolidayDTO[];
  onHolidaysChange: (updated: BusinessHolidayDTO[]) => void;
}

export interface GroupedHolidayItem {
  id: string;
  isRange: boolean;
  startDate: string;
  endDate: string;
  dates: string[];
  daysCount: number;
  description: string;
}

/**
 * Checks if dateB is immediately the next calendar day after dateA.
 */
function isConsecutiveDay(dateAStr: string, dateBStr: string): boolean {
  try {
    const a = new Date(dateAStr + 'T00:00:00Z');
    const b = new Date(dateBStr + 'T00:00:00Z');
    const diffMs = b.getTime() - a.getTime();
    return diffMs === 1000 * 60 * 60 * 24;
  } catch {
    return false;
  }
}

/**
 * Group consecutive holiday dates with the exact same description into clean visual ranges.
 */
function groupHolidays(holidays: BusinessHolidayDTO[]): GroupedHolidayItem[] {
  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const groups: GroupedHolidayItem[] = [];

  let currentGroup: GroupedHolidayItem | null = null;

  for (const h of sorted) {
    if (!currentGroup) {
      currentGroup = {
        id: h.date,
        isRange: false,
        startDate: h.date,
        endDate: h.date,
        dates: [h.date],
        daysCount: 1,
        description: (h.description || '').trim(),
      };
    } else {
      const isConsecutive = isConsecutiveDay(currentGroup.endDate, h.date);
      const isSameReason = currentGroup.description === (h.description || '').trim();

      if (isConsecutive && isSameReason) {
        currentGroup.endDate = h.date;
        currentGroup.dates.push(h.date);
        currentGroup.daysCount += 1;
        currentGroup.isRange = true;
      } else {
        groups.push(currentGroup);
        currentGroup = {
          id: h.date,
          isRange: false,
          startDate: h.date,
          endDate: h.date,
          dates: [h.date],
          daysCount: 1,
          description: (h.description || '').trim(),
        };
      }
    }
  }

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

function calculateDaysRemaining(startDateStr: string, endDateStr: string): {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  isPast: boolean;
} {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const start = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');

  // Ongoing if today is between start and end
  if (today >= start && today <= end) {
    return {
      label: 'Happening Now',
      variant: 'default',
      isPast: false,
    };
  }

  const diffMs = start.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const pastDays = Math.round((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: `${Math.max(1, pastDays)}d ago`,
      variant: 'outline',
      isPast: true,
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Today',
      variant: 'default',
      isPast: false,
    };
  }
  if (diffDays === 1) {
    return {
      label: 'Tomorrow',
      variant: 'secondary',
      isPast: false,
    };
  }
  if (diffDays <= 7) {
    return {
      label: `In ${diffDays} days`,
      variant: 'secondary',
      isPast: false,
    };
  }
  return {
    label: `In ${diffDays} days`,
    variant: 'outline',
    isPast: false,
  };
}

function formatDateDisplay(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function HolidayDataTable({
  holidays,
  onHolidaysChange,
}: HolidayDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlSearch = searchParams?.get('search') || '';
  const urlType = (searchParams?.get('type') as 'all' | 'upcoming' | 'past') || 'all';
  const page = Math.max(1, parseInt(searchParams?.get('page') || '1', 10) || 1);
  const limit = Math.max(1, parseInt(searchParams?.get('limit') || '10', 10) || 10);

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [selectedGroup, setSelectedGroup] = useState<GroupedHolidayItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : '');

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value.trim());
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

  // Debounce search input
  useEffect(() => {
    if (searchTerm === urlSearch) return;

    const timeout = setTimeout(() => {
      updateFilters({ search: searchTerm.trim() || null });
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchTerm, urlSearch, updateFilters]);

  // Group consecutive holiday dates into clean range items
  const groupedItems = useMemo(() => groupHolidays(holidays), [holidays]);

  // Filter & Search over grouped items
  const filtered = useMemo(() => {
    return groupedItems.filter((item) => {
      const remaining = calculateDaysRemaining(item.startDate, item.endDate);

      if (urlType === 'upcoming' && remaining.isPast) return false;
      if (urlType === 'past' && !remaining.isPast) return false;

      if (!urlSearch.trim()) return true;

      const q = urlSearch.toLowerCase();
      const startFmt = formatDateDisplay(item.startDate).toLowerCase();
      const endFmt = formatDateDisplay(item.endDate).toLowerCase();
      return (
        item.startDate.includes(q) ||
        item.endDate.includes(q) ||
        item.description.toLowerCase().includes(q) ||
        startFmt.includes(q) ||
        endFmt.includes(q)
      );
    });
  }, [groupedItems, urlSearch, urlType]);

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safeCurrentPage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safeCurrentPage - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, safeCurrentPage, limit]);

  const handleDeleteConfirm = async () => {
    if (!selectedGroup) return;
    setIsDeleting(true);

    try {
      let res;
      if (selectedGroup.isRange && selectedGroup.dates.length > 1) {
        res = await deleteBusinessHolidayRangeAction(selectedGroup.dates);
      } else {
        res = await deleteBusinessHolidayAction(selectedGroup.startDate);
      }

      if (res.success && res.data) {
        toast.success(
          selectedGroup.isRange
            ? `Holiday range (${selectedGroup.startDate} to ${selectedGroup.endDate}) removed.`
            : `Holiday (${selectedGroup.startDate}) removed.`
        );
        onHolidaysChange(res.data);
        setSelectedGroup(null);
      } else {
        toast.error(res.error || 'Failed to delete holiday.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error deleting holiday.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            type="text"
            placeholder="Search by holiday name, date or month..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 pl-9 pr-8 text-xs rounded-xl bg-card border-border shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                updateFilters({ search: null });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <IconX size={15} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border shrink-0 self-start sm:self-auto">
          {(['all', 'upcoming', 'past'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => updateFilters({ type: type === 'all' ? null : type })}
              className={`py-1 px-3 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                urlType === type
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="py-3 px-4 sm:px-6">Date Schedule</th>
                <th className="py-3 px-4">Reason / Name</th>
                <th className="py-3 px-4">Duration & Status</th>
                <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-3 py-6">
                      <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground border border-border/60">
                        <IconCalendarEvent size={24} />
                      </div>
                      <div className="space-y-1 text-center">
                        <p className="font-semibold text-sm text-foreground">No holidays found</p>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          {urlSearch || urlType !== 'all'
                            ? 'No holidays match your search or filter. Try clearing your filters.'
                            : 'Click "Add Holiday" to register your first off-day.'}
                        </p>
                      </div>
                      {(urlSearch || urlType !== 'all') && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm('');
                            startTransition(() => {
                              router.push(pathname);
                            });
                          }}
                          className="rounded-xl text-xs gap-1.5 mt-1 cursor-pointer"
                        >
                          <IconRotateClockwise size={14} />
                          <span>Reset Filters</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => {
                  const remaining = calculateDaysRemaining(item.startDate, item.endDate);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* Date / Range */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              item.isRange
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-primary/10 text-primary border-primary/20'
                            }`}
                          >
                            {item.isRange ? (
                              <IconCalendarRepeat size={18} />
                            ) : (
                              <IconCalendarTime size={18} />
                            )}
                          </div>

                          <div className="min-w-0">
                            {item.isRange ? (
                              <>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-foreground">
                                    {formatDateDisplay(item.startDate)}
                                  </span>
                                  <span className="text-muted-foreground font-semibold">
                                    →
                                  </span>
                                  <span className="font-bold text-foreground">
                                    {formatDateDisplay(item.endDate)}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {item.startDate} to {item.endDate}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-foreground block">
                                  {formatDateDisplay(item.startDate)}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {item.startDate}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-foreground">
                          {item.description || (
                            <span className="text-muted-foreground italic font-normal">
                              Official Holiday
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Duration badge & Countdown badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.isRange && (
                            <Badge
                              variant="outline"
                              className="rounded-lg text-[11px] font-semibold py-0.5 px-2 bg-muted/60 border-border text-foreground gap-1"
                            >
                              <IconCalendar size={12} className="text-muted-foreground" />
                              <span>{item.daysCount} days off</span>
                            </Badge>
                          )}

                          <Badge
                            variant={remaining.variant}
                            className="rounded-lg text-[11px] font-semibold py-0.5 px-2 gap-1"
                          >
                            <IconClock size={12} />
                            <span>{remaining.label}</span>
                          </Badge>
                        </div>
                      </td>

                      {/* Delete Action */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setSelectedGroup(item)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                          title={item.isRange ? 'Delete Holiday Range' : 'Delete Holiday'}
                        >
                          <IconTrash size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Unified Table Pagination Bar */}
        <TablePaginationBar
          total={totalItems}
          page={safeCurrentPage}
          limit={limit}
          noun="holidays"
          syncToUrl={true}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmDialog
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => !open && setSelectedGroup(null)}
        title={selectedGroup?.isRange ? 'Delete Holiday Range' : 'Delete Holiday'}
        description={
          selectedGroup?.isRange
            ? `Are you sure you want to remove this holiday range (${selectedGroup.startDate} to ${selectedGroup.endDate}, ${selectedGroup.daysCount} days)? The booking calendar will re-open for standard appointment bookings during these dates.`
            : 'Are you sure you want to remove this holiday? On this date, the public booking calendar will re-open for standard appointment bookings according to weekly operating hours.'
        }
        itemName={
          selectedGroup
            ? `${selectedGroup.description ? selectedGroup.description + ' · ' : ''}${
                selectedGroup.isRange
                  ? `${selectedGroup.startDate} → ${selectedGroup.endDate} (${selectedGroup.daysCount} days)`
                  : selectedGroup.startDate
              }`
            : undefined
        }
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
