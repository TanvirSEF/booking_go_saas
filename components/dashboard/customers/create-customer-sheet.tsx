'use client';

import React, { useState, useTransition } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconUserPlus,
  IconLoader2,
  IconUser,
  IconMail,
  IconPhone,
  IconLock,
  IconNotes,
  IconCalendar,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { createCompanyCustomerAction } from '@/actions/customer-crm';
import type { CustomerCRMItem } from '@/types/customer-crm';

export interface CreateCustomerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customer: CustomerCRMItem) => void;
}

export function CreateCustomerSheet({
  open,
  onOpenChange,
  onCustomerCreated,
}: CreateCustomerSheetProps) {
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setContact('');
    setGender('');
    setDob('');
    setPassword('');
    setDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Customer name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      toast.error('A valid email address is required.');
      return;
    }

    if (!contact.trim() || contact.trim().length < 5) {
      toast.error('Contact phone number must be at least 5 digits.');
      return;
    }

    startTransition(async () => {
      const res = await createCompanyCustomerAction({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        contact: contact.trim(),
        gender: gender || '',
        dob: dob || '',
        password: password.trim() || 'Customer@123',
        description: description.trim() || '',
      });

      if (res.success && res.data) {
        toast.success(res.message || 'Customer profile created successfully.');
        onCustomerCreated(res.data);
        resetForm();
        onOpenChange(false);
      } else {
        toast.error(res.error || 'Failed to create customer.');
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(val) => !isPending && onOpenChange(val)}>
      <SheetContent
        data-theme="company"
        side="right"
        className="w-full sm:max-w-lg p-0 overflow-y-auto bg-card border-border flex flex-col"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border bg-muted/20">
            <SheetHeader className="p-0 text-left">
              <div className="flex items-center gap-2 text-primary">
                <IconUserPlus size={20} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  New Customer
                </span>
              </div>
              <SheetTitle className="text-xl font-bold text-foreground mt-1">
                Add Organization Customer
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Create a centralized customer profile with optional portal account credentials.
              </SheetDescription>
            </SheetHeader>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-4.5 flex-1 overflow-y-auto">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="cust-name" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <IconUser size={14} className="text-muted-foreground" />
                <span>Full Name <span className="text-destructive">*</span></span>
              </Label>
              <Input
                id="cust-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                disabled={isPending}
                required
                className="rounded-xl bg-background border-border text-xs h-9"
              />
            </div>

            {/* Email & Contact Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cust-email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <IconMail size={14} className="text-muted-foreground" />
                  <span>Email Address <span className="text-destructive">*</span></span>
                </Label>
                <Input
                  id="cust-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  disabled={isPending}
                  required
                  className="rounded-xl bg-background border-border text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-phone" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <IconPhone size={14} className="text-muted-foreground" />
                  <span>Contact Phone <span className="text-destructive">*</span></span>
                </Label>
                <Input
                  id="cust-phone"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  disabled={isPending}
                  required
                  className="rounded-xl bg-background border-border text-xs h-9"
                />
              </div>
            </div>

            {/* Gender & DOB Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Gender</Label>
                <Select
                  value={gender}
                  onValueChange={(val) => setGender(val as 'male' | 'female' | 'other' | '')}
                  disabled={isPending}
                >
                  <SelectTrigger className="rounded-xl bg-background border-border text-xs h-9 font-medium">
                    <SelectValue placeholder="Select gender (optional)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border bg-card">
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other / Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-dob" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <IconCalendar size={14} className="text-muted-foreground" />
                  <span>Date of Birth</span>
                </Label>
                <Input
                  id="cust-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  disabled={isPending}
                  className="rounded-xl bg-background border-border text-xs h-9"
                />
              </div>
            </div>

            {/* Initial Password */}
            <div className="space-y-1.5">
              <Label htmlFor="cust-password" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <IconLock size={14} className="text-muted-foreground" />
                <span>Initial Account Password</span>
              </Label>
              <Input
                id="cust-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Defaults to Customer@123 if left blank"
                disabled={isPending}
                className="rounded-xl bg-background border-border text-xs h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                If provided, will create a linked customer portal login account.
              </p>
            </div>

            {/* Customer Internal Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="cust-desc" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <IconNotes size={14} className="text-muted-foreground" />
                <span>Customer Notes & Preferences</span>
              </Label>
              <Textarea
                id="cust-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Internal notes (allergies, specialist preferences, VIP instructions)..."
                rows={4}
                disabled={isPending}
                className="rounded-xl bg-background border-border text-xs resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-6 border-t border-border bg-muted/20 flex flex-row items-center justify-end gap-2 mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-xl text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              {isPending ? (
                <>
                  <IconLoader2 size={15} className="animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <IconUserPlus size={15} />
                  <span>Save Customer</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
