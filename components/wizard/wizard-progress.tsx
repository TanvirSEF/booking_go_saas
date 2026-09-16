'use client';

import React from 'react';
import {
  IconMapPin,
  IconCut,
  IconCalendarTime,
  IconUser,
  IconCheck,
} from '@tabler/icons-react';
import { useWizard } from './wizard-context';
import type { WizardStep } from '@/types/wizard';

interface StepDefinition {
  step: WizardStep;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const STEPS: StepDefinition[] = [
  {
    step: 1,
    title: 'Location',
    subtitle: 'Location & Category',
    icon: IconMapPin,
  },
  {
    step: 2,
    title: 'Service',
    subtitle: 'Service & Staff',
    icon: IconCut,
  },
  {
    step: 3,
    title: 'Schedule',
    subtitle: 'Date & Time',
    icon: IconCalendarTime,
  },
  {
    step: 4,
    title: 'Details',
    subtitle: 'Your Information',
    icon: IconUser,
  },
  {
    step: 5,
    title: 'Confirm',
    subtitle: 'Review & Pay',
    icon: IconCheck,
  },
];

export function WizardProgress() {
  const { state, setStep } = useWizard();
  const currentStep = state.currentStep;

  // Percentage for the continuous connecting bar
  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full py-6">
      {/* Desktop & Tablet Stepper */}
      <div className="relative">
        {/* Background Track */}
        <div className="absolute top-5 left-8 right-8 h-1 bg-muted rounded-full -z-0" />

        {/* Active Progress Fill Track */}
        <div
          className="absolute top-5 left-8 h-1 bg-primary rounded-full transition-all duration-500 ease-out -z-0"
          style={{ width: `calc((100% - 4rem) * ${progressPercent / 100})` }}
        />

        {/* Steps Grid */}
        <div className="relative z-10 flex items-start justify-between">
          {STEPS.map((item) => {
            const isCompleted = item.step < currentStep;
            const isActive = item.step === currentStep;
            const isClickable = item.step < currentStep;
            const Icon = item.icon;

            return (
              <button
                key={item.step}
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && setStep(item.step)}
                className={`group flex flex-col items-center focus:outline-none transition-all ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {/* Step Circle Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-semibold text-sm shadow-sm ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground scale-100 hover:ring-4 hover:ring-primary/20'
                      : isActive
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/25 shadow-md scale-110'
                        : 'bg-background text-muted-foreground border-2 border-muted'
                  }`}
                >
                  {isCompleted ? (
                    <IconCheck size={18} className="stroke-[3]" />
                  ) : (
                    <Icon size={18} />
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-2.5 text-center">
                  <p
                    className={`text-xs font-semibold tracking-tight transition-colors ${
                      isActive
                        ? 'text-primary'
                        : isCompleted
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="hidden md:block text-[11px] text-muted-foreground/80 mt-0.5 max-w-[90px] truncate">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Step Status Badge (Displayed below stepper for small screens) */}
      <div className="md:hidden mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          Step {currentStep} of 5: <span className="text-primary font-semibold">{STEPS[currentStep - 1].subtitle}</span>
        </span>
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-mono">
          {Math.round(progressPercent)}%
        </span>
      </div>
    </div>
  );
}
