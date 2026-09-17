'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  IconUsers,
  IconMapPin,
  IconRotate,
  IconFilter,
} from '@tabler/icons-react';

export interface StaffOption {
  id: string;
  name: string;
  colorCode: string;
}

export interface LocationOption {
  id: string;
  name: string;
}

interface CalendarFilterBarProps {
  staffList: StaffOption[];
  locationList: LocationOption[];
  selectedStaffId: string;
  selectedLocationId: string;
  onStaffChange: (staffId: string) => void;
  onLocationChange: (locationId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function CalendarFilterBar({
  staffList,
  locationList,
  selectedStaffId,
  selectedLocationId,
  onStaffChange,
  onLocationChange,
  onRefresh,
  isLoading = false,
}: CalendarFilterBarProps) {
  const hasActiveFilters = selectedStaffId !== 'all' || selectedLocationId !== 'all';

  const handleResetFilters = () => {
    onStaffChange('all');
    onLocationChange('all');
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-border bg-card shadow-xs">
      {/* Filter Selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <IconFilter size={16} className="text-muted-foreground shrink-0 hidden sm:block" />
          <span className="text-xs font-semibold text-foreground hidden sm:inline">
            Filters:
          </span>
        </div>

        {/* Staff Filter */}
        <div className="flex items-center gap-1.5 min-w-[170px]">
          <Select value={selectedStaffId} onValueChange={onStaffChange}>
            <SelectTrigger className="h-9 rounded-xl text-xs bg-background border-border shadow-2xs font-medium w-full">
              <div className="flex items-center gap-2 truncate">
                <IconUsers size={15} className="text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Specialists" />
              </div>
            </SelectTrigger>
            <SelectContent data-theme="company">
              <SelectItem value="all">All Specialists</SelectItem>
              {staffList.map((st) => (
                <SelectItem key={st.id} value={st.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full shrink-0 border border-black/10"
                      style={{ backgroundColor: st.colorCode }}
                    />
                    <span>{st.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location Filter */}
        <div className="flex items-center gap-1.5 min-w-[170px]">
          <Select value={selectedLocationId} onValueChange={onLocationChange}>
            <SelectTrigger className="h-9 rounded-xl text-xs bg-background border-border shadow-2xs font-medium w-full">
              <div className="flex items-center gap-2 truncate">
                <IconMapPin size={15} className="text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Locations" />
              </div>
            </SelectTrigger>
            <SelectContent data-theme="company">
              <SelectItem value="all">All Locations</SelectItem>
              {locationList.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground font-medium px-2.5"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Action / Refresh */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-border shadow-2xs"
          title="Refresh calendar appointments"
        >
          <IconRotate size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </Button>
      </div>
    </div>
  );
}
