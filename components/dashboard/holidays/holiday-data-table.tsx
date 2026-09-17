'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/dashboard/services/delete-confirm-dialog';
import {
  IconCalendarEvent,
  IconTrash,
  IconSearch,
  IconClock,
  IconCalendarTime,
  IconCalendarRepeat,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCalendar,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedGroup, setSelectedGroup] = useState<GroupedHolidayItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group consecutive holiday dates into clean range items
  const groupedItems = useMemo(() => groupHolidays(holidays), [holidays]);

  // Filter & Search over grouped items
  const filtered = useMemo(() => {
    return groupedItems.filter((item) => {
      const remaining = calculateDaysRemaining(item.startDate, item.endDate);

      if (filterType === 'upcoming' && remaining.isPast) return false;
      if (filterType === 'past' && !remaining.isPast) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
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
  }, [groupedItems, searchQuery, filterType]);

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginated = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safeCurrentPage, pageSize]);

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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder="Search by holiday name, date or month..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 pl-9 pr-3 text-xs rounded-xl bg-card border-border shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border shrink-0 self-start sm:self-auto">
          {(['all', 'upcoming', 'past'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setFilterType(type);
                setCurrentPage(1);
              }}
              className={`py-1 px-3 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterType === type
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
                  <td colSpan={4} className="py-12 text-center text-muted-foreground">
                    <IconCalendarEvent className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">No holidays found</p>
                    <p className="text-[11px] mt-0.5">
                      {searchQuery
                        ? 'Try clearing your search query or filters.'
                        : 'Click "Add Holiday" to register your first off-day.'}
                    </p>
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

        {/* Full Interactive Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {/* Rows per page selector & counts */}
            <div className="flex items-center gap-3">
              <span className="text-xs">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-theme="company">
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>
                Showing{' '}
                <strong className="text-foreground">
                  {(safeCurrentPage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-foreground">
                  {Math.min(safeCurrentPage * pageSize, totalItems)}
                </strong>{' '}
                of <strong className="text-foreground">{totalItems}</strong> entries
                {holidays.length !== totalItems && (
                  <span className="text-muted-foreground/75 ml-1">
                    ({holidays.length} total holiday dates)
                  </span>
                )}
              </span>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage <= 1}
                className="size-8 p-0 rounded-lg"
                title="First Page"
              >
                <IconChevronsLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="size-8 p-0 rounded-lg"
                title="Previous Page"
              >
                <IconChevronLeft size={16} />
              </Button>

              <div className="px-2 text-xs text-muted-foreground font-medium">
                Page <span className="text-foreground font-semibold">{safeCurrentPage}</span> of{' '}
                <span className="text-foreground font-semibold">{totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="size-8 p-0 rounded-lg"
                title="Next Page"
              >
                <IconChevronRight size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage >= totalPages}
                className="size-8 p-0 rounded-lg"
                title="Last Page"
              >
                <IconChevronsRight size={16} />
              </Button>
            </div>
          </div>
        )}
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
