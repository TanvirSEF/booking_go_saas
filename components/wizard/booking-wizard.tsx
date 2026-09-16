'use client';

import React from 'react';
import {
  IconMapPin,
  IconCategory,
  IconCut,
  IconCalendarEvent,
  IconUser,
  IconChecklist,
  IconSparkles,
} from '@tabler/icons-react';
import { WizardProvider, useWizard } from './wizard-context';
import { WizardHeader } from './wizard-header';
import { WizardProgress } from './wizard-progress';
import { WizardNavigation } from './wizard-navigation';
import type { ClientBusiness, WizardCatalog } from '@/types/wizard';
import { Card, CardContent } from '@/components/ui/card';

export interface BookingWizardProps {
  business: ClientBusiness;
  catalog: WizardCatalog;
}

function WizardContent() {
  const { state, business, catalog, updateLocation, updateCategory } = useWizard();
  const { currentStep, selectedLocationId, selectedCategoryId } = state;

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
                {currentStep === 1 && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <IconMapPin className="text-primary" size={22} />
                        <span>Select Location & Category</span>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Choose your preferred branch and service category to explore available options.
                      </p>
                    </div>

                    {/* Locations Grid */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2.5">
                        Branch Location
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {catalog.locations.map((loc) => {
                          const isSelected = selectedLocationId === loc.id;
                          return (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => updateLocation(loc.id)}
                              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm text-foreground">{loc.name}</p>
                                {isSelected && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                                )}
                              </div>
                              {loc.address && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {loc.address}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Categories Grid */}
                    {catalog.categories.length > 0 && (
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2.5">
                          Service Category
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {catalog.categories.map((cat) => {
                            const isSelected = selectedCategoryId === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => updateCategory(cat.id)}
                                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <IconCategory size={16} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
                                  <p className="font-medium text-xs text-foreground truncate">{cat.name}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Service & Staff Shell (Full UI in BGO-102) */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <IconCut className="text-primary" size={22} />
                        <span>Select Service & Staff</span>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Select the service you wish to book and optionally choose a specific specialist.
                      </p>
                    </div>

                    <div className="p-8 border border-dashed rounded-xl bg-muted/20 text-center space-y-2">
                      <IconSparkles className="mx-auto text-primary" size={32} />
                      <p className="text-sm font-medium text-foreground">Service Catalog & Staff Selection</p>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Catalog ready for {business.name}. Select your service in Step 2 to proceed to real-time slot booking.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Schedule Shell (Full UI in BGO-103) */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <IconCalendarEvent className="text-primary" size={22} />
                        <span>Choose Date & Time</span>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pick an available date and select from open appointment slots.
                      </p>
                    </div>

                    <div className="p-8 border border-dashed rounded-xl bg-muted/20 text-center space-y-2">
                      <IconCalendarEvent className="mx-auto text-primary" size={32} />
                      <p className="text-sm font-medium text-foreground">Interactive Calendar & Slot Engine</p>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Integrated with /api/slots calculation algorithm to provide instant live availability.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: Details Shell (Full UI in BGO-104) */}
                {currentStep === 4 && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <IconUser className="text-primary" size={22} />
                        <span>Customer Information</span>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter your details or log in to confirm your appointment.
                      </p>
                    </div>

                    <div className="p-8 border border-dashed rounded-xl bg-muted/20 text-center space-y-2">
                      <IconUser className="mx-auto text-primary" size={32} />
                      <p className="text-sm font-medium text-foreground">Customer Form & Dynamic Fields</p>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Guest booking, new customer registration, and business custom questions.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 5: Review & Confirm Shell (Full UI in BGO-104) */}
                {currentStep === 5 && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <IconChecklist className="text-primary" size={22} />
                        <span>Review & Confirm</span>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Please review your appointment summary before final booking confirmation.
                      </p>
                    </div>

                    <div className="p-8 border border-dashed rounded-xl bg-muted/20 text-center space-y-2">
                      <IconChecklist className="mx-auto text-primary" size={32} />
                      <p className="text-sm font-medium text-foreground">Appointment Summary & Checkout</p>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Final review with payment options (Manual, Stripe, PayPal) and instant notification dispatch.
                      </p>
                    </div>
                  </div>
                )}

                {/* Wizard Navigation Footer */}
                <WizardNavigation />
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
