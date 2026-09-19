import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
} from '@tabler/icons-react';
import type { DeviceTypeBreakdown } from '@/types/login-detail';

interface DeviceMetricsCardsProps {
  breakdown: DeviceTypeBreakdown;
}

export function DeviceMetricsCards({ breakdown }: DeviceMetricsCardsProps) {
  const total =
    breakdown.desktop + breakdown.mobile + breakdown.tablet + breakdown.other;

  const getPercentage = (count: number) => {
    if (total === 0) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  };

  const cards = [
    {
      label: 'Desktop Logins',
      count: breakdown.desktop,
      percentage: getPercentage(breakdown.desktop),
      icon: IconDeviceDesktop,
      colorClass:
        'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
      barColor: 'bg-blue-500',
    },
    {
      label: 'Mobile Logins',
      count: breakdown.mobile,
      percentage: getPercentage(breakdown.mobile),
      icon: IconDeviceMobile,
      colorClass:
        'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      barColor: 'bg-emerald-500',
    },
    {
      label: 'Tablet & Other Logins',
      count: breakdown.tablet + breakdown.other,
      percentage: getPercentage(breakdown.tablet + breakdown.other),
      icon: IconDeviceTablet,
      colorClass:
        'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
      barColor: 'bg-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className="border-border bg-card shadow-xs rounded-xl overflow-hidden"
          >
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {card.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {card.count.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    ({card.percentage})
                  </span>
                </div>
              </div>

              <div
                className={`size-11 rounded-xl flex items-center justify-center border shrink-0 ${card.colorClass}`}
              >
                <Icon size={22} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
