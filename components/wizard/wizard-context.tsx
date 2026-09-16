'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type {
  WizardStep,
  WizardState,
  WizardContextType,
  ClientBusiness,
  WizardCatalog,
  TimeSlotSelection,
  CustomerDetails,
} from '@/types/wizard';

const initialCustomerState: CustomerDetails = {
  name: '',
  email: '',
  contact: '',
  customerType: 'guest-user',
  password: '',
  gender: '',
  dob: '',
  notes: '',
  customFields: {},
};

const initialWizardState: WizardState = {
  currentStep: 1,
  selectedLocationId: '',
  selectedCategoryId: '',
  selectedServiceId: '',
  selectedStaffId: '',
  selectedDate: '',
  selectedTimeSlot: null,
  customer: initialCustomerState,
  paymentType: 'Manually',
};

const WizardContext = createContext<WizardContextType | null>(null);

export interface WizardProviderProps {
  business: ClientBusiness;
  catalog: WizardCatalog;
  children: React.ReactNode;
}

export function WizardProvider({ business, catalog, children }: WizardProviderProps) {
  const [state, setState] = useState<WizardState>(() => {
    // Pre-select first location and category if available
    const defaultLocationId = catalog.locations[0]?.id || '';
    const defaultCategoryId = catalog.categories[0]?.id || '';
    return {
      ...initialWizardState,
      selectedLocationId: defaultLocationId,
      selectedCategoryId: defaultCategoryId,
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const setStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep >= 5) return prev;
      return { ...prev, currentStep: (prev.currentStep + 1) as WizardStep };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep <= 1) return prev;
      return { ...prev, currentStep: (prev.currentStep - 1) as WizardStep };
    });
  }, []);

  const updateLocation = useCallback((locationId: string) => {
    setState((prev) => ({
      ...prev,
      selectedLocationId: locationId,
      // Reset downstream selections that depend on location
      selectedStaffId: '',
      selectedTimeSlot: null,
    }));
  }, []);

  const updateCategory = useCallback((categoryId: string) => {
    setState((prev) => ({
      ...prev,
      selectedCategoryId: categoryId,
      // Reset downstream selections that depend on category
      selectedServiceId: '',
      selectedStaffId: '',
      selectedTimeSlot: null,
    }));
  }, []);

  const updateService = useCallback((serviceId: string) => {
    setState((prev) => ({
      ...prev,
      selectedServiceId: serviceId,
      selectedStaffId: '',
      selectedTimeSlot: null,
    }));
  }, []);

  const updateStaff = useCallback((staffId: string) => {
    setState((prev) => ({
      ...prev,
      selectedStaffId: staffId,
      selectedTimeSlot: null,
    }));
  }, []);

  const updateDate = useCallback((date: string) => {
    setState((prev) => ({
      ...prev,
      selectedDate: date,
      selectedTimeSlot: null,
    }));
  }, []);

  const updateTimeSlot = useCallback((slot: TimeSlotSelection | null) => {
    setState((prev) => ({
      ...prev,
      selectedTimeSlot: slot,
    }));
  }, []);

  const updateCustomer = useCallback((info: Partial<CustomerDetails>) => {
    setState((prev) => ({
      ...prev,
      customer: {
        ...prev.customer,
        ...info,
      },
    }));
  }, []);

  const updatePaymentType = useCallback((paymentType: WizardState['paymentType']) => {
    setState((prev) => ({
      ...prev,
      paymentType,
    }));
  }, []);

  const resetWizard = useCallback(() => {
    setState({
      ...initialWizardState,
      selectedLocationId: catalog.locations[0]?.id || '',
      selectedCategoryId: catalog.categories[0]?.id || '',
    });
  }, [catalog.locations, catalog.categories]);

  // Step guard validation logic
  const canGoNext = useMemo(() => {
    switch (state.currentStep) {
      case 1:
        // Location and Category must be selected (if catalog has them)
        if (catalog.locations.length > 0 && !state.selectedLocationId) return false;
        if (catalog.categories.length > 0 && !state.selectedCategoryId) return false;
        return Boolean(state.selectedLocationId);

      case 2:
        // Service must be selected
        return Boolean(state.selectedServiceId);

      case 3:
        // Date and Time slot must be chosen
        return Boolean(state.selectedDate && state.selectedTimeSlot?.start);

      case 4: {
        // Customer fields validation
        const { name, email, contact, customerType, password } = state.customer;
        const hasValidName = name.trim().length >= 2;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const hasValidEmail = emailRegex.test(email.trim());
        const hasValidContact = contact.trim().length >= 5;

        if (!hasValidName || !hasValidEmail || !hasValidContact) return false;
        if (customerType === 'new-user' && (!password || password.length < 4)) return false;

        return true;
      }

      case 5:
        return !isSubmitting;

      default:
        return false;
    }
  }, [state, catalog, isSubmitting]);

  const value = useMemo(
    () => ({
      state,
      business,
      catalog,
      canGoNext,
      isSubmitting,
      setStep,
      nextStep,
      prevStep,
      updateLocation,
      updateCategory,
      updateService,
      updateStaff,
      updateDate,
      updateTimeSlot,
      updateCustomer,
      updatePaymentType,
      setIsSubmitting,
      resetWizard,
    }),
    [
      state,
      business,
      catalog,
      canGoNext,
      isSubmitting,
      setStep,
      nextStep,
      prevStep,
      updateLocation,
      updateCategory,
      updateService,
      updateStaff,
      updateDate,
      updateTimeSlot,
      updateCustomer,
      updatePaymentType,
      resetWizard,
    ]
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextType {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}
