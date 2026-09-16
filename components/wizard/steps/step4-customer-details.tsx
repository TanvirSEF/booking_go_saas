'use client';

import React, { useState } from 'react';
import {
  IconUser,
  IconMail,
  IconPhone,
  IconLock,
  IconEye,
  IconEyeOff,
  IconUserPlus,
  IconNotes,
  IconFileText,
  IconCalendar,
} from '@tabler/icons-react';
import { useWizard } from '../wizard-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CustomerType } from '@/types/wizard';

const CUSTOMER_TYPE_OPTIONS: Array<{
  value: CustomerType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}> = [
  {
    value: 'guest-user',
    label: 'Continue as Guest',
    description: 'Fast booking without creating an account',
    icon: IconUser,
  },
  {
    value: 'new-user',
    label: 'Create New Account',
    description: 'Save details & manage future appointments',
    icon: IconUserPlus,
  },
  {
    value: 'existing-user',
    label: 'Existing Account',
    description: 'Log in with your customer credentials',
    icon: IconLock,
  },
];

export function Step4CustomerDetails() {
  const { state, catalog, updateCustomer } = useWizard();
  const { customer } = state;

  const [showPassword, setShowPassword] = useState(false);

  const handleTypeChange = (type: CustomerType) => {
    updateCustomer({ customerType: type });
  };

  const handleInputChange = (field: keyof typeof customer, value: unknown) => {
    updateCustomer({ [field]: value });
  };

  const handleCustomFieldChange = (fieldId: string, value: unknown) => {
    updateCustomer({
      customFields: {
        ...(customer.customFields || {}),
        [fieldId]: value,
      },
    });
  };

  // Validation indicators
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = !customer.email || emailRegex.test(customer.email.trim());
  const isNameValid = !customer.name || customer.name.trim().length >= 2;
  const isContactValid = !customer.contact || customer.contact.trim().length >= 5;
  const isPasswordValid =
    customer.customerType === 'guest-user' ||
    (customer.customerType === 'new-user' && Boolean(customer.password && customer.password.length >= 4)) ||
    (customer.customerType === 'existing-user' && Boolean(customer.password && customer.password.length >= 1));

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <IconUser className="text-primary" size={22} />
          <span>Customer Information</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Provide your contact details so we can send your appointment confirmation and updates.
        </p>
      </div>

      {/* 1. Customer Type Selector */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Booking Method
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CUSTOMER_TYPE_OPTIONS.map((opt) => {
            const isSelected = customer.customerType === opt.value;
            const Icon = opt.icon;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleTypeChange(opt.value)}
                className={`group p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm scale-[1.01]'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                    {opt.label}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Customer Contact Details Form */}
      <div className="bg-card rounded-2xl border p-5 sm:p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-name" className="text-xs font-semibold flex items-center gap-1">
              <span>Full Name</span>
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <IconUser
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="cust-name"
                placeholder="e.g., Alex Johnson"
                value={customer.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`pl-9 h-10 ${!isNameValid ? 'border-destructive' : ''}`}
              />
            </div>
            {!isNameValid && (
              <p className="text-[11px] text-destructive font-medium">
                Please enter a valid name (at least 2 characters).
              </p>
            )}
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-email" className="text-xs font-semibold flex items-center gap-1">
              <span>Email Address</span>
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <IconMail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="cust-email"
                type="email"
                placeholder="e.g., alex@example.com"
                value={customer.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`pl-9 h-10 ${!isEmailValid ? 'border-destructive' : ''}`}
              />
            </div>
            {!isEmailValid && (
              <p className="text-[11px] text-destructive font-medium">
                Please enter a valid email address.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Phone / Contact */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-phone" className="text-xs font-semibold flex items-center gap-1">
              <span>Phone Number</span>
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <IconPhone
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="cust-phone"
                type="tel"
                placeholder="e.g., +1 555-0199"
                value={customer.contact}
                onChange={(e) => handleInputChange('contact', e.target.value)}
                className={`pl-9 h-10 ${!isContactValid ? 'border-destructive' : ''}`}
              />
            </div>
            {!isContactValid && (
              <p className="text-[11px] text-destructive font-medium">
                Please enter a valid phone number.
              </p>
            )}
          </div>

          {/* Conditional Password Field (for New User or Existing User) */}
          {customer.customerType !== 'guest-user' && (
            <div className="space-y-1.5 animate-in fade-in-50 duration-200">
              <Label htmlFor="cust-password" className="text-xs font-semibold flex items-center gap-1">
                <span>Account Password</span>
                <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <IconLock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="cust-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={
                    customer.customerType === 'new-user'
                      ? 'Create a secure password (min. 4 chars)'
                      : 'Enter your account password'
                  }
                  value={customer.password || ''}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-9 pr-10 h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {!isPasswordValid && customer.customerType === 'new-user' && (
                <p className="text-[11px] text-destructive font-medium">
                  Password must be at least 4 characters.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Gender & DOB Row (Optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="cust-gender" className="text-xs font-semibold text-muted-foreground">
              Gender (Optional)
            </Label>
            <select
              id="cust-gender"
              value={customer.gender || ''}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cust-dob" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <IconCalendar size={13} />
              <span>Date of Birth (Optional)</span>
            </Label>
            <Input
              id="cust-dob"
              type="date"
              value={customer.dob || ''}
              onChange={(e) => handleInputChange('dob', e.target.value)}
              className="h-10 text-xs"
            />
          </div>
        </div>

        {/* Dynamic Custom Fields (if configured by business) */}
        {catalog.customFields && catalog.customFields.length > 0 && (
          <div className="space-y-4 pt-3 border-t">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
              <IconFileText size={14} className="text-primary" />
              <span>Additional Information</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {catalog.customFields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label htmlFor={`custom-${field.id}`} className="text-xs font-semibold">
                    {field.label} {field.isRequired && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id={`custom-${field.id}`}
                    placeholder={field.placeholder || `Enter ${field.label}`}
                    value={String(customer.customFields?.[field.id] || '')}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special Instructions / Notes */}
        <div className="space-y-1.5 pt-2">
          <Label htmlFor="cust-notes" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <IconNotes size={13} />
            <span>Special Requests or Notes (Optional)</span>
          </Label>
          <Textarea
            id="cust-notes"
            rows={3}
            placeholder="Any allergies, styling preferences, or instructions for your specialist..."
            value={customer.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}
