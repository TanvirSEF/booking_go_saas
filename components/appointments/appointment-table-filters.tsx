'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconSearch,
  IconX,
  IconCalendar,
  IconUser,
  IconFilter,
  IconRotateClockwise,
} from '@tabler/icons-react';

export interface StaffFilterOption {
  id: string;
  name: string;
  colorCode?: string;
}

interface AppointmentTableFiltersProps {
  staffList: StaffFilterOption[];
  currentSearch?: string;
  currentStatus?: string;
  currentStaffId?: string;
  currentStartDate?: string;
  currentEndDate?: string;
}

export function AppointmentTableFilters({
  staffList,
  currentSearch = '',
  currentStatus = 'all',
  currentStaffId = 'all',
  currentStartDate = '',
  currentEndDate = '',
}: AppointmentTableFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(currentSearch);

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

  // Debounce search query update
  useEffect(() => {
    if (searchTerm === currentSearch) return;

    const timeout = setTimeout(() => {
      updateFilters({ search: searchTerm.trim() || null });
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchTerm, currentSearch, updateFilters]);

  const handleStatusChange = (val: string) => {
    updateFilters({ status: val === 'all' ? null : val });
  };

  const handleStaffChange = (val: string) => {
    updateFilters({ staffId: val === 'all' ? null : val });
  };

  const handleStartDateChange = (val: string) => {
    updateFilters({ startDate: val || null });
  };

  const handleEndDateChange = (val: string) => {
    updateFilters({ endDate: val || null });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters =
    Boolean(currentSearch) ||
    Boolean(searchTerm) ||
    (currentStatus && currentStatus !== 'all') ||
    (currentStaffId && currentStaffId !== 'all') ||
    Boolean(currentStartDate) ||
    Boolean(currentEndDate);

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Real-time search bar */}
        <div className="relative flex-1 min-w-[240px]">
          <IconSearch
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            id="appointment-search-input"
            type="text"
            placeholder="Search by #APP, customer, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 h-10 w-full bg-background border-input transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                updateFilters({ search: null });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <IconX size={16} />
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Select */}
          <div className="w-[150px] sm:w-[160px]">
            <Select value={currentStatus || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-10 bg-background border-input cursor-pointer">
                <div className="flex items-center gap-2 truncate">
                  <IconFilter size={15} className="text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Specialist Select */}
          <div className="w-[160px] sm:w-[180px]">
            <Select value={currentStaffId || 'all'} onValueChange={handleStaffChange}>
              <SelectTrigger className="h-10 bg-background border-input cursor-pointer">
                <div className="flex items-center gap-2 truncate">
                  <IconUser size={15} className="text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Specialist" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialists</SelectItem>
                {staffList.map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: st.colorCode || '#CEEDC1' }}
                      />
                      <span className="truncate">{st.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-background border border-input rounded-md px-2 h-10 shadow-xs">
            <IconCalendar size={15} className="text-muted-foreground shrink-0" />
            <input
              type="date"
              aria-label="Start Date"
              value={currentStartDate || ''}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="text-xs bg-transparent border-0 text-foreground focus:outline-hidden w-[110px] cursor-pointer"
              title="Start Date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              aria-label="End Date"
              value={currentEndDate || ''}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="text-xs bg-transparent border-0 text-foreground focus:outline-hidden w-[110px] cursor-pointer"
              title="End Date"
            />
            {(currentStartDate || currentEndDate) && (
              <button
                type="button"
                onClick={() => {
                  updateFilters({ startDate: null, endDate: null });
                }}
                className="text-muted-foreground hover:text-foreground transition-colors ml-0.5 cursor-pointer"
                title="Clear dates"
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              disabled={isPending}
              className="h-10 text-xs gap-1.5 border-dashed hover:border-solid cursor-pointer"
            >
              <IconRotateClockwise size={14} className={isPending ? 'animate-spin' : ''} />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
