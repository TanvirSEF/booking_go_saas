'use client';

import React from 'react';
import Link from 'next/link';
import {
  IconBuildingStore,
  IconShieldCheck,
  IconSearch,
  IconCalendarClock,
} from '@tabler/icons-react';
import { useWizard } from './wizard-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function WizardHeader() {
  const { business } = useWizard();

  return (
    <header className="w-full bg-card/60 backdrop-blur-md border-b sticky top-0 z-20 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Business Branding */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <IconBuildingStore size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
                {business.name}
              </h1>
              <Badge variant="secondary" className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800">
                <IconShieldCheck size={13} />
                <span>Verified</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <IconCalendarClock size={13} />
              <span>Online Appointment Booking</span>
            </p>
          </div>
        </div>

        {/* Action: Track Existing Appointment */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <Link href={`/find-appointment/${business.slug}`}>
              <IconSearch size={15} />
              <span className="hidden sm:inline">Track Booking</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
