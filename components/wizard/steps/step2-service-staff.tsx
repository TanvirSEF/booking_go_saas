'use client';

import React, { useMemo } from 'react';
import { IconCut, IconUsers, IconSparkles } from '@tabler/icons-react';
import { useWizard } from '../wizard-context';
import { ServiceSelectionCard } from '@/components/ui/service-selection-card';
import { StaffSelectionCard } from '@/components/ui/staff-selection-card';

export function Step2ServiceStaff() {
  const { state, business, catalog, updateService, updateStaff } = useWizard();
  const { selectedCategoryId, selectedServiceId, selectedStaffId, selectedLocationId } = state;

  // 1. Filter services dynamically by category (or show all if no category selected)
  const filteredServices = useMemo(() => {
    if (!selectedCategoryId) return catalog.services;
    return catalog.services.filter((s) => s.categoryId === selectedCategoryId);
  }, [catalog.services, selectedCategoryId]);

  // 2. Filter qualified staff for the selected location and service
  const qualifiedStaff = useMemo(() => {
    return catalog.staff.filter((stf) => {
      // If staff has location restrictions, check location
      if (
        selectedLocationId &&
        stf.locationIds &&
        stf.locationIds.length > 0 &&
        !stf.locationIds.includes(selectedLocationId)
      ) {
        return false;
      }

      // If service is selected and staff has service restrictions, check service
      if (
        selectedServiceId &&
        stf.serviceIds &&
        stf.serviceIds.length > 0 &&
        !stf.serviceIds.includes(selectedServiceId)
      ) {
        return false;
      }

      return true;
    });
  }, [catalog.staff, selectedLocationId, selectedServiceId]);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <IconCut className="text-primary" size={22} />
          <span>Select Service & Specialist</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick your treatment or service, then optionally select a preferred specialist.
        </p>
      </div>

      {/* Section 1: Services Catalog Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Available Services ({filteredServices.length})
          </label>
        </div>

        {filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredServices.map((service) => (
              <ServiceSelectionCard
                key={service.id}
                service={service}
                currencySymbol={business.currencySymbol || '$'}
                isSelected={selectedServiceId === service.id}
                onSelect={updateService}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 border border-dashed rounded-2xl bg-muted/20 text-center space-y-2">
            <IconSparkles size={28} className="mx-auto text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No services found in this category</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Please go back to Step 1 and select another category to view services.
            </p>
          </div>
        )}
      </div>

      {/* Section 2: Staff Selection */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Specialist Preference
          </label>
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <IconUsers size={13} />
            <span>Optional</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* Default Option: Any Specialist */}
          <StaffSelectionCard
            isAnyStaff
            isSelected={selectedStaffId === ''}
            onSelect={updateStaff}
          />

          {/* Qualified Staff Members */}
          {qualifiedStaff.map((staffMember) => (
            <StaffSelectionCard
              key={staffMember.id}
              staff={staffMember}
              isSelected={selectedStaffId === staffMember.id}
              onSelect={updateStaff}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
