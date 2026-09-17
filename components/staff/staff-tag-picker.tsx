'use client';

import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { IconSearch, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export interface TagOption {
  id: string;
  name: string;
  subtitle?: string;
}

export interface StaffTagPickerProps {
  options: TagOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StaffTagPicker({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  emptyText = 'No options found.',
  icon,
  className,
}: StaffTagPickerProps) {
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const optionMap = useMemo(() => {
    const map = new Map<string, TagOption>();
    options.forEach((opt) => map.set(opt.id, opt));
    return map;
  }, [options]);

  const selectedOptions = useMemo(() => {
    return selectedIds
      .map((id) => optionMap.get(id))
      .filter((opt): opt is TagOption => Boolean(opt));
  }, [selectedIds, optionMap]);

  const filteredOptions = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
    );
  }, [options, search]);

  const toggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeOption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  const selectAll = () => {
    onChange(options.map((opt) => opt.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected tags bar & dropdown trigger */}
      <div className="rounded-xl border border-input bg-card p-2">
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {icon && <span className="text-primary">{icon}</span>}
            <span className="font-medium">
              {selectedOptions.length} of {options.length} selected
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 text-xs px-2 rounded-lg font-medium text-primary hover:text-primary hover:bg-primary/10"
            >
              {isExpanded ? 'Hide List' : 'Select / Edit'}
            </Button>
          </div>
        </div>

        {/* Selected tag pills */}
        <div className="flex flex-wrap gap-1.5 pt-2 min-h-8">
          {selectedOptions.length === 0 ? (
            <span className="text-xs text-muted-foreground/70 italic py-1">
              {placeholder}
            </span>
          ) : (
            selectedOptions.map((opt) => (
              <Badge
                key={opt.id}
                variant="secondary"
                className="gap-1 pl-2 pr-1 py-0.5 text-[11px] rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 font-medium"
              >
                <span className="max-w-[150px] truncate">{opt.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${opt.name}`}
                  onClick={(e) => removeOption(opt.id, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(selectedIds.filter((item) => item !== opt.id));
                    }
                  }}
                  className="rounded-full p-0.5 hover:bg-primary/20 text-primary/80 hover:text-primary transition-colors cursor-pointer"
                >
                  <IconX size={12} />
                </span>
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Expandable options selector box */}
      {isExpanded && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2.5 shadow-sm animate-in fade-in-50 duration-150">
          {/* Search bar & quick actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <IconSearch
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs rounded-lg bg-muted/30 border-input"
              />
            </div>
            <div className="flex items-center gap-2 justify-end text-[11px]">
              <button
                type="button"
                onClick={selectAll}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                Select All
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-muted-foreground hover:text-foreground font-medium cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    className={cn(
                      'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer border border-transparent',
                      isSelected
                        ? 'bg-primary/10 text-primary border-primary/20 font-medium'
                        : 'hover:bg-muted/50 text-foreground'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{opt.name}</p>
                      {opt.subtitle && (
                        <p className="truncate text-[10px] text-muted-foreground font-normal">
                          {opt.subtitle}
                        </p>
                      )}
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOption(opt.id)}
                      className="rounded-md shrink-0"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
