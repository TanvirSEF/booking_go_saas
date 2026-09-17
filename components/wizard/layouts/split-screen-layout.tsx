'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconBuildingStore,
  IconShieldCheck,
  IconMapPin,
  IconCut,
  IconUser,
  IconCalendar,
  IconSearch,
  IconShare,
  IconChevronDown,
  IconChevronUp,
  IconSparkles,
  IconCircleCheckFilled,
} from '@tabler/icons-react';
import { useWizard } from '../wizard-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmbedShareDialog } from '../embed-share-dialog';
import { WizardNavigation } from '../wizard-navigation';
import { resolveThemeConfig } from './theme-tokens';

import { Step1LocationCategory } from '../steps/step1-location-category';
import { Step2ServiceStaff } from '../steps/step2-service-staff';
import { Step3DateTimeSlots } from '../steps/step3-datetime-slots';
import { Step4CustomerDetails } from '../steps/step4-customer-details';
import { Step5ReviewConfirm } from '../steps/step5-review-confirm';

export interface SplitScreenLayoutProps {
  isEmbed?: boolean;
  isTransparent?: boolean;
}

const STEP_TITLES = [
  'Location & Category',
  'Service & Staff',
  'Date & Time',
  'Your Details',
  'Review & Confirm',
];

export function SplitScreenLayout({
  isEmbed = false,
  isTransparent = false,
}: SplitScreenLayoutProps) {
  const { state, business, catalog, setStep } = useWizard();
  const {
    currentStep,
    selectedLocationId,
    selectedServiceId,
    selectedStaffId,
    selectedDate,
    selectedTimeSlot,
  } = state;

  const [shareOpen, setShareOpen] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Resolved dynamic selections
  const selectedLocation = useMemo(() => {
    return catalog.locations.find((l) => l.id === selectedLocationId);
  }, [catalog.locations, selectedLocationId]);

  const selectedService = useMemo(() => {
    return catalog.services.find((s) => s.id === selectedServiceId);
  }, [catalog.services, selectedServiceId]);

  const selectedStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return catalog.staff.find((stf) => stf.id === selectedStaffId);
  }, [catalog.staff, selectedStaffId]);

  const themeConfig = useMemo(() => {
    return resolveThemeConfig(business.themeColor);
  }, [business.themeColor]);

  // Formatted date
  const formattedDate = useMemo(() => {
    if (!selectedDate) return null;
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      // Fallback
    }
    return selectedDate;
  }, [selectedDate]);

  // Operating status for today
  const operatingStatus = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];
    const todayHours = business.businessHours?.find((bh) => bh.dayName === todayName);

    if (!todayHours || !todayHours.isOpen) {
      return { isOpen: false, text: 'Closed Today' };
    }
    return {
      isOpen: true,
      text: `Open Today: ${todayHours.startTime} - ${todayHours.endTime}`,
    };
  }, [business.businessHours]);

  return (
    <div
      className={`w-full min-h-screen ${
        isTransparent ? 'bg-transparent' : 'bg-muted/30'
      } flex flex-col justify-between`}
    >
      {/* Top Header (Only on standard non-embed page) */}
      {!isEmbed && (
        <header className="w-full bg-card/60 backdrop-blur-md border-b sticky top-0 z-20 py-3.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${themeConfig.accentGradient} text-white flex items-center justify-center shadow-xs font-bold text-sm`}
              >
                {business.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-foreground truncate">
                    {business.name}
                  </h1>
                  <Badge
                    variant="secondary"
                    className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200"
                  >
                    <IconShieldCheck size={12} />
                    <span>Verified</span>
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span>Split-Screen Booking Experience</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShareOpen(true)}
                className="text-xs h-8 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <IconShare size={14} />
                <span className="hidden sm:inline">Share & Embed</span>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs h-8 rounded-xl text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <Link href={`/find-appointment/${business.slug}`}>
                  <IconSearch size={14} />
                  <span className="hidden sm:inline">Track</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Main Split-Screen Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mobile Collapsible Booking Summary Drawer */}
        <div className="lg:hidden mb-6">
          <button
            type="button"
            onClick={() => setMobileSummaryOpen((prev) => !prev)}
            className="w-full p-4 rounded-2xl bg-card border shadow-xs flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${themeConfig.accentGradient} text-white flex items-center justify-center shadow-xs shrink-0`}
              >
                <IconSparkles size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {selectedService ? selectedService.name : 'Booking in progress'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedDate && selectedTimeSlot
                    ? `${formattedDate} @ ${selectedTimeSlot.start}`
                    : `Step ${currentStep} of 5: ${STEP_TITLES[currentStep - 1]}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">
                {selectedService
                  ? selectedService.isFree
                    ? 'Free'
                    : `${business.currencySymbol || '$'}${selectedService.price.toFixed(2)}`
                  : '—'}
              </span>
              {mobileSummaryOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </div>
          </button>

          {/* Collapsed Details on Mobile */}
          {mobileSummaryOpen && (
            <div className="mt-2 p-4 rounded-2xl bg-card border shadow-xs space-y-3 animate-in fade-in-50 duration-200 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-muted-foreground py-1 border-b">
                  <span className="flex items-center gap-1.5">
                    <IconMapPin size={13} className="text-primary" /> Location
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedLocation?.name || 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground py-1 border-b">
                  <span className="flex items-center gap-1.5">
                    <IconCut size={13} className="text-primary" /> Service
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedService?.name || 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground py-1 border-b">
                  <span className="flex items-center gap-1.5">
                    <IconUser size={13} className="text-primary" /> Specialist
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedStaff?.name || 'Any Specialist'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground py-1 border-b">
                  <span className="flex items-center gap-1.5">
                    <IconCalendar size={13} className="text-primary" /> Date & Time
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedDate && selectedTimeSlot
                      ? `${formattedDate} (${selectedTimeSlot.start})`
                      : 'Not selected'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Split-Screen Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Desktop Sticky Summary Sidebar - 5 cols) */}
          <aside className="hidden lg:block lg:col-span-5 space-y-5 sticky top-24">
            <div
              className={`p-6 rounded-3xl border shadow-sm transition-all ${
                isTransparent ? 'bg-card/70 backdrop-blur-md' : 'bg-card'
              }`}
            >
              {/* Business Hero Banner */}
              <div className="flex items-start gap-4 pb-5 border-b">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${themeConfig.accentGradient} text-white flex items-center justify-center shadow-md shrink-0 border-2 border-white/20`}
                >
                  <IconBuildingStore size={28} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-lg font-bold text-foreground truncate">{business.name}</h2>
                    <IconCircleCheckFilled size={16} className="text-primary shrink-0" />
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedLocation?.address || 'Official Online Booking Portal'}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        operatingStatus.isOpen
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block animate-pulse" />
                      <span>{operatingStatus.text}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Real-time Live Selection Ticker */}
              <div className="py-5 space-y-3.5 border-b text-xs">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <IconSparkles size={14} className="text-primary" />
                  <span>Live Booking Preview</span>
                </h3>

                {/* Location Selection */}
                <div
                  onClick={() => setStep(1)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedLocation
                      ? 'bg-muted/40 border-border/80 hover:border-primary/50'
                      : 'bg-muted/10 border-dashed border-border/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                      <IconMapPin size={13} className="text-primary" />
                      <span>Location</span>
                    </span>
                    {selectedLocation && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        Selected
                      </Badge>
                    )}
                  </div>
                  <p className="font-semibold text-foreground mt-1">
                    {selectedLocation?.name || 'Select a branch location'}
                  </p>
                  {selectedLocation?.address && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {selectedLocation.address}
                    </p>
                  )}
                </div>

                {/* Service Selection */}
                <div
                  onClick={() => setStep(2)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedService
                      ? 'bg-muted/40 border-border/80 hover:border-primary/50'
                      : 'bg-muted/10 border-dashed border-border/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                      <IconCut size={13} className="text-primary" />
                      <span>Service</span>
                    </span>
                    {selectedService && (
                      <span className="font-bold text-primary text-xs">
                        {selectedService.isFree
                          ? 'Free'
                          : `${business.currencySymbol || '$'}${selectedService.price.toFixed(2)}`}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-foreground mt-1">
                    {selectedService?.name || 'Choose your service'}
                  </p>
                  {selectedService && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedService.durationMinutes} mins duration
                    </p>
                  )}
                </div>

                {/* Specialist Selection */}
                <div
                  onClick={() => setStep(2)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedStaff
                      ? 'bg-muted/40 border-border/80 hover:border-primary/50'
                      : 'bg-muted/10 border-dashed border-border/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                      <IconUser size={13} className="text-primary" />
                      <span>Specialist</span>
                    </span>
                  </div>
                  <p className="font-semibold text-foreground mt-1">
                    {selectedStaff ? selectedStaff.name : 'First Available Specialist'}
                  </p>
                </div>

                {/* Date & Time Selection */}
                <div
                  onClick={() => setStep(3)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedDate && selectedTimeSlot
                      ? 'bg-muted/40 border-border/80 hover:border-primary/50'
                      : 'bg-muted/10 border-dashed border-border/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                      <IconCalendar size={13} className="text-primary" />
                      <span>Schedule</span>
                    </span>
                    {selectedTimeSlot && (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {selectedTimeSlot.start}
                      </Badge>
                    )}
                  </div>
                  <p className="font-semibold text-foreground mt-1">
                    {selectedDate && selectedTimeSlot
                      ? `${formattedDate} @ ${selectedTimeSlot.start} - ${selectedTimeSlot.end}`
                      : 'Pick date & available time slot'}
                  </p>
                </div>
              </div>

              {/* Cost & Payment Summary Ticker */}
              <div className="pt-5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">
                    {business.currencySymbol || '$'}
                    {selectedService ? selectedService.price.toFixed(2) : '0.00'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Booking Fee</span>
                  <span className="text-emerald-600 font-medium">Free</span>
                </div>

                <div className="pt-2 border-t flex items-center justify-between font-bold text-sm">
                  <span className="text-foreground">Total Payable</span>
                  <span className="text-base text-primary">
                    {business.currencySymbol || '$'}
                    {selectedService ? selectedService.price.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>

              {/* Guarantee Tag */}
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <IconShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Instant Confirmation & Flexible Counter Pay</span>
              </div>
            </div>
          </aside>

          {/* Right Column: Step Flow Card (7 cols) */}
          <section className="lg:col-span-7">
            <Card
              className={`overflow-hidden transition-all ${
                isTransparent
                  ? 'border-border/40 shadow-none bg-transparent'
                  : 'border-border/60 shadow-lg bg-card'
              }`}
            >
              <CardContent className="p-6 sm:p-8">
                {/* Step Progress Pills Header */}
                <div className="pb-6 mb-6 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Step {currentStep} of 5
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {STEP_TITLES[currentStep - 1]}
                    </span>
                  </div>

                  {/* Horizontal Segmented Bar */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div
                        key={s}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          s <= currentStep
                            ? `bg-gradient-to-r ${themeConfig.accentGradient}`
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Step Content Container */}
                <div className="min-h-[380px] flex flex-col justify-between">
                  {/* Step 1: Location & Category */}
                  {currentStep === 1 && <Step1LocationCategory />}

                  {/* Step 2: Service & Staff */}
                  {currentStep === 2 && <Step2ServiceStaff />}

                  {/* Step 3: Date & Time Slots */}
                  {currentStep === 3 && <Step3DateTimeSlots />}

                  {/* Step 4: Customer Details Form */}
                  {currentStep === 4 && <Step4CustomerDetails />}

                  {/* Step 5: Review & Confirm Booking */}
                  {currentStep === 5 && <Step5ReviewConfirm />}

                  {/* Wizard Navigation Footer */}
                  {currentStep < 5 && <WizardNavigation />}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {/* Footer (Only on standard non-embed page) */}
      {!isEmbed && (
        <footer className="py-6 text-center text-xs text-muted-foreground border-t bg-card/40 mt-8">
          <p>
            Powered by <span className="font-semibold text-foreground">BookingGo SaaS</span> &copy;{' '}
            {new Date().getFullYear()}
          </p>
        </footer>
      )}

      {/* Embed & Share Dialog */}
      <EmbedShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        businessSlug={business.slug}
        businessName={business.name}
      />
    </div>
  );
}
