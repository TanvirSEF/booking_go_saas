'use client';

import React, { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export interface TablePaginationBarProps {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  noun?: string;
  pageSizeOptions?: number[];
  onPageChange?: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  syncToUrl?: boolean;
}

export function TablePaginationBar({
  total,
  page,
  limit,
  totalPages: explicitTotalPages,
  noun = 'items',
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onLimitChange,
  syncToUrl = true,
}: TablePaginationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const totalPages =
    explicitTotalPages !== undefined
      ? explicitTotalPages
      : Math.max(1, Math.ceil(total / limit));

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (totalPages > 0 && newPage > totalPages) || newPage === page) return;

    if (onPageChange) {
      onPageChange(newPage);
    }

    if (syncToUrl) {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
      params.set('page', String(newPage));
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }
  };

  const handleLimitChange = (val: string) => {
    const newLimit = parseInt(val, 10) || 10;
    if (onLimitChange) {
      onLimitChange(newLimit);
    }

    if (syncToUrl) {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
      params.set('limit', String(newLimit));
      params.set('page', '1');
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>
          Showing <strong className="text-foreground">{startRecord}</strong> to{' '}
          <strong className="text-foreground">{endRecord}</strong> of{' '}
          <strong className="text-foreground">{total}</strong> {noun}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Rows per page selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Rows per page:</span>
          <Select value={String(limit)} onValueChange={handleLimitChange}>
            <SelectTrigger className="h-8 w-16 text-xs bg-background cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page Switcher */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer"
            disabled={page <= 1 || isPending}
            onClick={() => handlePageChange(page - 1)}
            aria-label="Previous page"
          >
            <IconChevronLeft size={16} />
          </Button>
          <span className="text-xs font-medium px-1 text-foreground">
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer"
            disabled={page >= totalPages || isPending}
            onClick={() => handlePageChange(page + 1)}
            aria-label="Next page"
          >
            <IconChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
