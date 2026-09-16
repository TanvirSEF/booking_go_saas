'use client';

import React from 'react';
import { IconArrowLeft, IconArrowRight, IconCheck, IconLoader2 } from '@tabler/icons-react';
import { useWizard } from './wizard-context';
import { Button } from '@/components/ui/button';

export interface WizardNavigationProps {
  onComplete?: () => void;
  nextLabel?: string;
}

export function WizardNavigation({ onComplete, nextLabel }: WizardNavigationProps) {
  const { state, canGoNext, isSubmitting, prevStep, nextStep } = useWizard();
  const { currentStep } = state;

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === 5;

  const handleNextClick = () => {
    if (isLastStep) {
      if (onComplete) {
        onComplete();
      }
    } else {
      nextStep();
    }
  };

  return (
    <div className="w-full pt-6 mt-6 border-t flex items-center justify-between gap-4">
      {/* Back Button */}
      <div>
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={isSubmitting}
            className="flex items-center gap-2 cursor-pointer font-medium"
          >
            <IconArrowLeft size={16} />
            <span>Back</span>
          </Button>
        )}
      </div>

      {/* Next / Submit Button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleNextClick}
          disabled={!canGoNext || isSubmitting}
          className={`flex items-center gap-2 font-medium min-w-[120px] shadow-sm transition-all ${
            isLastStep
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
        >
          {isSubmitting ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              <span>Processing...</span>
            </>
          ) : isLastStep ? (
            <>
              <IconCheck size={16} />
              <span>{nextLabel || 'Confirm Booking'}</span>
            </>
          ) : (
            <>
              <span>{nextLabel || 'Continue'}</span>
              <IconArrowRight size={16} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
