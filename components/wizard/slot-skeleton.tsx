'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function SlotSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-4 w-16 rounded-md" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className="h-12 rounded-xl border border-border/50 bg-muted/30 p-2 flex items-center justify-center animate-pulse"
          >
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
