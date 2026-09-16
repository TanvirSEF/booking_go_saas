'use client';

import React, { useEffect } from 'react';
import {
  IconMapPin,
  IconPhone,
  IconCategory,
  IconCheck,
} from '@tabler/icons-react';
import { useWizard } from '../wizard-context';

export function Step1LocationCategory() {
  const { state, catalog, updateLocation, updateCategory } = useWizard();
  const { selectedLocationId, selectedCategoryId } = state;

  // Auto-select location if only 1 location exists
  useEffect(() => {
    if (catalog.locations.length === 1 && !selectedLocationId) {
      updateLocation(catalog.locations[0].id);
    }
  }, [catalog.locations, selectedLocationId, updateLocation]);

  // Auto-select first category if none selected and categories exist
  useEffect(() => {
    if (catalog.categories.length > 0 && !selectedCategoryId) {
      updateCategory(catalog.categories[0].id);
    }
  }, [catalog.categories, selectedCategoryId, updateCategory]);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <IconMapPin className="text-primary" size={22} />
          <span>Select Location & Category</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your branch location and service category to see available specialists and services.
        </p>
      </div>

      {/* Section 1: Location Selection */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Branch Location ({catalog.locations.length})
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {catalog.locations.map((loc) => {
            const isSelected = selectedLocationId === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => updateLocation(loc.id)}
                className={`group relative p-4 sm:p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/25 shadow-md scale-[1.01]'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <IconMapPin size={16} />
                      </div>
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                        {loc.name}
                      </p>
                    </div>

                    {/* Check Indicator */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'border-2 border-muted-foreground/30'
                      }`}
                    >
                      {isSelected && <IconCheck size={12} className="stroke-[3]" />}
                    </div>
                  </div>

                  {loc.address && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed pl-10.5">
                      {loc.address}
                    </p>
                  )}
                </div>

                {loc.phone && (
                  <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center gap-1.5 text-xs text-muted-foreground/90 pl-1">
                    <IconPhone size={13} className="text-primary/70 shrink-0" />
                    <span>{loc.phone}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Category Selection */}
      {catalog.categories.length > 0 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Service Category ({catalog.categories.length})
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {catalog.categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              // Count services belonging to this category
              const serviceCount = catalog.services.filter(
                (s) => s.categoryId === cat.id
              ).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => updateCategory(cat.id)}
                  className={`group p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[75px] ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                      : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <IconCategory size={14} />
                    </div>
                    <p className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                      {cat.name}
                    </p>
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-2">
                    {serviceCount} {serviceCount === 1 ? 'service' : 'services'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
