'use client';

import React from 'react';
import { IconClock, IconCheck, IconSparkles } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import type { ClientService } from '@/types/wizard';

export interface ServiceSelectionCardProps {
  service: ClientService;
  currencySymbol?: string;
  isSelected: boolean;
  onSelect: (serviceId: string) => void;
}

export function ServiceSelectionCard({
  service,
  currencySymbol = '$',
  isSelected,
  onSelect,
}: ServiceSelectionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(service.id)}
      className={`group relative w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/25 shadow-md scale-[1.01]'
          : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40 hover:shadow-sm'
      }`}
    >
      {/* Top Header: Title & Badges */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pr-2">
            <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors leading-tight">
              {service.name}
            </h3>
            {service.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                {service.description}
              </p>
            )}
          </div>

          {/* Selection Indicator Circle */}
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'border-2 border-muted-foreground/30 group-hover:border-primary/60'
            }`}
          >
            {isSelected && <IconCheck size={14} className="stroke-[3]" />}
          </div>
        </div>
      </div>

      {/* Bottom Row: Duration & Price Badges */}
      <div className="mt-4 pt-3.5 border-t border-border/60 flex items-center justify-between gap-2">
        {/* Duration Badge */}
        <Badge
          variant="secondary"
          className="flex items-center gap-1 text-[11px] font-medium bg-muted/60 text-muted-foreground px-2.5 py-0.5 rounded-lg"
        >
          <IconClock size={13} className="shrink-0 text-primary" />
          <span>{service.durationMinutes} min</span>
        </Badge>

        {/* Price Badge */}
        <div className="flex items-center gap-1">
          {service.isFree ? (
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1"
            >
              <IconSparkles size={13} />
              <span>Free</span>
            </Badge>
          ) : (
            <span className="text-sm font-bold text-foreground">
              {currencySymbol}
              {service.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
