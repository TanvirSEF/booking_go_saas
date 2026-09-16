'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { WizardProvider, useWizard } from './wizard-context';
import { WizardHeader } from './wizard-header';
import { WizardProgress } from './wizard-progress';
import { WizardNavigation } from './wizard-navigation';
import type { ClientBusiness, WizardCatalog } from '@/types/wizard';
import { Card, CardContent } from '@/components/ui/card';
import { SplitScreenLayout } from './layouts/split-screen-layout';
import { getThemeStyles } from './layouts/theme-tokens';

import { Step1LocationCategory } from './steps/step1-location-category';
import { Step2ServiceStaff } from './steps/step2-service-staff';
import { Step3DateTimeSlots } from './steps/step3-datetime-slots';
import { Step4CustomerDetails } from './steps/step4-customer-details';
import { Step5ReviewConfirm } from './steps/step5-review-confirm';

export interface BookingWizardProps {
  business: ClientBusiness;
  catalog: WizardCatalog;
  isEmbed?: boolean;
  isTransparent?: boolean;
  layoutOverride?: string;
}

function Formlayout1Standard({
  isEmbed = false,
  isTransparent = false,
}: {
  isEmbed?: boolean;
  isTransparent?: boolean;
}) {
  const { state } = useWizard();
  const { currentStep } = state;

  if (isEmbed) {
    return (
      <div
        className={`w-full transition-colors ${
          isTransparent ? 'bg-transparent' : 'bg-background'
        } p-2 sm:p-4`}
      >
        <Card
          className={`overflow-hidden transition-all ${
            isTransparent
              ? 'border-border/40 shadow-none bg-transparent'
              : 'border-border/60 shadow-md bg-card'
          }`}
        >
          <CardContent className="p-4 sm:p-6">
            {/* Stepper Header */}
            <WizardProgress />

            {/* Step Content Container */}
            <div className="mt-6 min-h-[360px] flex flex-col justify-between">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col justify-between">
      <div>
        <WizardHeader />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-border/60 shadow-lg shadow-black/5 overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              {/* Stepper Header */}
              <WizardProgress />

              {/* Step Content Container */}
              <div className="mt-6 min-h-[380px] flex flex-col justify-between">
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
        </main>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground border-t bg-card/40 mt-8">
        <p>
          Powered by <span className="font-semibold text-foreground">BookingGo SaaS</span> &copy;{' '}
          {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

function WizardContent({
  isEmbed = false,
  isTransparent = false,
  layoutOverride,
}: {
  isEmbed?: boolean;
  isTransparent?: boolean;
  layoutOverride?: string;
}) {
  const { state, business } = useWizard();
  const { currentStep } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  // Active layout resolution: query param > prop override > business.layout > default Formlayout1
  const activeLayout = useMemo(() => {
    const queryLayout = searchParams.get('layout');
    if (queryLayout) return queryLayout;
    if (layoutOverride) return layoutOverride;
    return business.layout || 'Formlayout1';
  }, [searchParams, layoutOverride, business.layout]);

  // Dynamic Theme CSS Variables
  const themeStyles = useMemo(() => {
    return getThemeStyles(business.themeColor);
  }, [business.themeColor]);

  // Auto-resize postMessage handshake for parent iframes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const emitHeight = () => {
      const scrollHeight =
        containerRef.current?.scrollHeight ||
        document.body.scrollHeight ||
        document.documentElement.scrollHeight;

      window.parent.postMessage(
        {
          type: 'bookinggo:resize',
          height: scrollHeight,
        },
        '*'
      );
    };

    emitHeight();
    const timer = setTimeout(emitHeight, 150);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        emitHeight();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [currentStep, activeLayout]);

  return (
    <div ref={containerRef} style={themeStyles} className="w-full">
      {activeLayout === 'Formlayout2' ? (
        <SplitScreenLayout isEmbed={isEmbed} isTransparent={isTransparent} />
      ) : (
        <Formlayout1Standard isEmbed={isEmbed} isTransparent={isTransparent} />
      )}
    </div>
  );
}

export function BookingWizard({
  business,
  catalog,
  isEmbed = false,
  isTransparent = false,
  layoutOverride,
}: BookingWizardProps) {
  return (
    <WizardProvider business={business} catalog={catalog}>
      <WizardContent
        isEmbed={isEmbed}
        isTransparent={isTransparent}
        layoutOverride={layoutOverride}
      />
    </WizardProvider>
  );
}


