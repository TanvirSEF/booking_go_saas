'use client';

import { WizardProvider, useWizard } from './wizard-context';
import { WizardHeader } from './wizard-header';
import { WizardProgress } from './wizard-progress';
import { WizardNavigation } from './wizard-navigation';
import type { ClientBusiness, WizardCatalog } from '@/types/wizard';
import { Card, CardContent } from '@/components/ui/card';

import { Step1LocationCategory } from './steps/step1-location-category';
import { Step2ServiceStaff } from './steps/step2-service-staff';
import { Step3DateTimeSlots } from './steps/step3-datetime-slots';
import { Step4CustomerDetails } from './steps/step4-customer-details';
import { Step5ReviewConfirm } from './steps/step5-review-confirm';

export interface BookingWizardProps {
  business: ClientBusiness;
  catalog: WizardCatalog;
}

function WizardContent() {
  const { state } = useWizard();
  const { currentStep } = state;

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
          Powered by <span className="font-semibold text-foreground">BookingGo SaaS</span> &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

export function BookingWizard({ business, catalog }: BookingWizardProps) {
  return (
    <WizardProvider business={business} catalog={catalog}>
      <WizardContent />
    </WizardProvider>
  );
}
