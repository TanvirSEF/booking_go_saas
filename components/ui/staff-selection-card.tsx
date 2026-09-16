'use client';

import React from 'react';
import { IconUsers, IconCheck } from '@tabler/icons-react';
import type { ClientStaff } from '@/types/wizard';

export interface StaffSelectionCardProps {
  staff?: ClientStaff | null;
  isAnyStaff?: boolean;
  isSelected: boolean;
  onSelect: (staffId: string) => void;
}

export function StaffSelectionCard({
  staff,
  isAnyStaff = false,
  isSelected,
  onSelect,
}: StaffSelectionCardProps) {
  const staffId = isAnyStaff ? '' : staff?.id || '';

  // Calculate initials from staff name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(staffId)}
      className={`group relative p-3.5 rounded-2xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-between min-h-[110px] ${
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/25 shadow-md scale-[1.02]'
          : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40 hover:shadow-sm'
      }`}
    >
      {/* Selected Indicator Badge */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <IconCheck size={11} className="stroke-[3]" />
        </div>
      )}

      {/* Avatar Circle */}
      {isAnyStaff ? (
        <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs mb-2 transition-transform group-hover:scale-105">
          <IconUsers size={20} />
        </div>
      ) : (
        <div
          className="w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-xs mb-2 border-2 border-background transition-transform group-hover:scale-105"
          style={{ backgroundColor: staff?.colorCode || '#3b82f6' }}
        >
          {getInitials(staff?.name || 'Staff')}
        </div>
      )}

      {/* Name and Role */}
      <div className="w-full">
        <p className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
          {isAnyStaff ? 'Any Specialist' : staff?.name}
        </p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {isAnyStaff ? 'First Available' : 'Specialist'}
        </p>
      </div>
    </button>
  );
}
