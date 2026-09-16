import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  IconSearch,
  IconCalendarClock,
  IconHome,
  IconChevronRight,
  IconBuildingStore,
} from '@tabler/icons-react';
import { TrackingSearchForm } from '@/components/tracking/tracking-search-form';

export const metadata: Metadata = {
  title: 'Track Appointment | BookingGo Self-Service Portal',
  description: 'Lookup and track your live appointment status, time window, specialist, and payment details.',
};

interface FindAppointmentPageProps {
  searchParams: Promise<{
    number?: string;
    email?: string;
  }>;
}

export default async function FindAppointmentPage({
  searchParams,
}: FindAppointmentPageProps) {
  const resolvedParams = await searchParams;
  const initialNumber = resolvedParams.number || '';
  const initialEmail = resolvedParams.email || '';

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <IconCalendarClock size={22} />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                Appointment Tracking Portal
              </h1>
              <p className="text-xs text-muted-foreground">
                Real-time booking status & appointment management
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
          >
            <IconBuildingStore size={15} />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6 font-medium">
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <IconHome size={14} />
            <span>Home</span>
          </Link>
          <IconChevronRight size={13} className="text-muted-foreground/60" />
          <span className="text-foreground font-semibold flex items-center gap-1">
            <IconSearch size={13} className="text-primary" />
            <span>Track Appointment</span>
          </span>
        </nav>

        {/* Tracking Search Form & Results Container */}
        <TrackingSearchForm
          initialNumber={initialNumber}
          initialEmail={initialEmail}
        />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground border-t bg-card/40 mt-12">
        <p>
          Powered by <span className="font-semibold text-foreground">BookingGo SaaS</span> &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
