'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { IconCash } from '@tabler/icons-react';

interface CustomerSpendBadgeProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function CustomerSpendBadge({
  amount = 0,
  currency = '$',
  size = 'md',
  showIcon = true,
}: CustomerSpendBadgeProps) {
  const formatted = `${currency}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const isHighValue = amount >= 500;
  const isModerateValue = amount > 0 && amount < 500;

  return (
    <Badge
      variant={isHighValue ? 'default' : isModerateValue ? 'secondary' : 'outline'}
      className={`font-semibold tracking-tight rounded-lg inline-flex items-center gap-1 shrink-0 ${
        size === 'sm'
          ? 'text-[11px] px-2 py-0.5'
          : size === 'lg'
            ? 'text-sm px-3 py-1'
            : 'text-xs px-2.5 py-0.5'
      }`}
    >
      {showIcon && <IconCash size={size === 'lg' ? 15 : 13} className="shrink-0" />}
      <span>{formatted}</span>
    </Badge>
  );
}
