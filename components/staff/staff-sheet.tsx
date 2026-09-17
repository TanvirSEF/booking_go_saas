'use client';

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  IconAlertTriangle,
  IconCheck,
  IconColorSwatch,
  IconLoader2,
  IconLock,
  IconMail,
  IconMapPin,
  IconPhone,
  IconScissors,
  IconUser,
} from '@tabler/icons-react';
import {
  createStaffAction,
  updateStaffAction,
} from '@/actions/staff';
import {
  STAFF_DEFAULT_COLORS,
  type StaffMemberDTO,
  type CreateStaffInput,
  type UpdateStaffInput,
} from '@/types/staff';
import { StaffTagPicker, type TagOption } from './staff-tag-picker';
import { cn } from '@/lib/utils';

export interface StaffSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: StaffMemberDTO | null;
  locationOptions: TagOption[];
  serviceOptions: TagOption[];
  onSuccess?: (savedStaff: StaffMemberDTO) => void;
}

interface StaffFormContentProps {
  staff?: StaffMemberDTO | null;
  locationOptions: TagOption[];
  serviceOptions: TagOption[];
  onClose: () => void;
  onSuccess?: (savedStaff: StaffMemberDTO) => void;
}

interface StaffFormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  locationIds: string[];
  serviceIds: string[];
  colorCode: string;
  description: string;
  isActive: boolean;
}

function StaffFormContent({
  staff,
  locationOptions,
  serviceOptions,
  onClose,
  onSuccess,
}: StaffFormContentProps) {
  const isEditing = Boolean(staff);

  const [form, setForm] = useState<StaffFormState>({
    name: staff?.name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    password: '',
    locationIds: staff?.locationIds || [],
    serviceIds: staff?.serviceIds || [],
    colorCode: staff?.colorCode || STAFF_DEFAULT_COLORS[0],
    description: staff?.description || '',
    isActive: staff?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.name = 'Specialist name must be at least 2 characters.';
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Please provide a valid email address.';
    }

    if (!isEditing && form.password && form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setQuotaWarning(null);

    try {
      if (isEditing && staff) {
        const payload: UpdateStaffInput = {
          id: staff._id,
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim(),
          locationIds: form.locationIds,
          serviceIds: form.serviceIds,
          colorCode: form.colorCode,
          description: form.description.trim(),
          isActive: form.isActive,
        };

        const result = await updateStaffAction(payload);
        if (result.success && result.data) {
          toast.success(`Updated specialist "${form.name.trim()}".`);
          onClose();
          onSuccess?.(result.data);
        } else {
          toast.error(result.error || 'Failed to update specialist.');
        }
      } else {
        const payload: CreateStaffInput = {
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim(),
          password: form.password || undefined,
          locationIds: form.locationIds,
          serviceIds: form.serviceIds,
          colorCode: form.colorCode,
          description: form.description.trim(),
          isActive: form.isActive,
        };

        const result = await createStaffAction(payload);
        if (result.success && result.data) {
          toast.success(`Specialist "${form.name.trim()}" created successfully.`);
          onClose();
          onSuccess?.(result.data);
        } else {
          if (result.error && result.error.includes('quota')) {
            setQuotaWarning(result.error);
          }
          toast.error(result.error || 'Failed to create specialist.');
        }
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
      {/* Sheet Header */}
      <SheetHeader className="p-6 border-b border-border/60 bg-muted/20 shrink-0 text-left">
        <div className="flex items-center gap-2.5 text-primary font-bold text-lg">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <IconUser size={18} />
          </div>
          <SheetTitle className="text-lg font-bold text-foreground">
            {isEditing ? 'Edit Specialist' : 'Add New Specialist'}
          </SheetTitle>
        </div>
        <SheetDescription className="text-xs text-muted-foreground mt-1">
          {isEditing
            ? 'Update specialist profile, branch assignments, services, and calendar appearance.'
            : 'Create a specialist profile, invite login credentials, and assign services.'}
        </SheetDescription>
      </SheetHeader>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {quotaWarning && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs flex items-start gap-2.5">
            <IconAlertTriangle size={17} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Subscription Limit Reached</p>
              <p className="mt-0.5 leading-relaxed">{quotaWarning}</p>
            </div>
          </div>
        )}

        {/* Full Name & Email */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="staff-name" className="text-xs font-semibold">
              Specialist Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="staff-name"
              placeholder="e.g., Sarah Connor"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={cn('h-10 rounded-xl text-xs', errors.name && 'border-destructive')}
            />
            {errors.name && (
              <p className="text-[11px] text-destructive font-medium">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-email" className="text-xs font-semibold">
              Email Address
            </Label>
            <div className="relative">
              <IconMail
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="staff-email"
                type="email"
                placeholder="staff@example.com"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className={cn('h-10 pl-9 rounded-xl text-xs', errors.email && 'border-destructive')}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-destructive font-medium">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-phone" className="text-xs font-semibold">
              Mobile / Contact Phone
            </Label>
            <div className="relative">
              <IconPhone
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="staff-phone"
                placeholder="+1 (555) 019-2834"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="h-10 pl-9 rounded-xl text-xs"
              />
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="staff-password" className="text-xs font-semibold">
                Account Password (Optional)
              </Label>
              <div className="relative">
                <IconLock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="staff-password"
                  type="password"
                  placeholder="Leave empty for auto-generated password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className={cn('h-10 pl-9 rounded-xl text-xs', errors.password && 'border-destructive')}
                />
              </div>
              {errors.password && (
                <p className="text-[11px] text-destructive font-medium">{errors.password}</p>
              )}
            </div>
          )}

          {/* Assigned Locations */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <IconMapPin size={14} className="text-primary" />
                <span>Assigned Locations</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Branch locations
              </span>
            </div>
            <StaffTagPicker
              options={locationOptions}
              selectedIds={form.locationIds}
              onChange={(ids) => setForm((prev) => ({ ...prev, locationIds: ids }))}
              placeholder="Select branch locations..."
              searchPlaceholder="Search locations..."
              emptyText="No branch locations available."
              icon={<IconMapPin size={14} />}
            />
          </div>

          {/* Assigned Services */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <IconScissors size={14} className="text-primary" />
                <span>Assigned Services</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Bookable services
              </span>
            </div>
            <StaffTagPicker
              options={serviceOptions}
              selectedIds={form.serviceIds}
              onChange={(ids) => setForm((prev) => ({ ...prev, serviceIds: ids }))}
              placeholder="Select services..."
              searchPlaceholder="Search services..."
              emptyText="No services available in catalog."
              icon={<IconScissors size={14} />}
            />
          </div>

          {/* Color Code Palette Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <IconColorSwatch size={14} className="text-primary" />
                <span>Calendar Badge Color</span>
              </Label>
              <span className="text-[11px] font-mono text-muted-foreground uppercase">
                {form.colorCode}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-xl border border-border bg-muted/20">
              {STAFF_DEFAULT_COLORS.map((color) => {
                const isSelected = form.colorCode.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, colorCode: color }))}
                    style={{ backgroundColor: color }}
                    className={cn(
                      'size-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer shadow-xs border border-black/10',
                      isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                    )}
                    aria-label={`Select color ${color}`}
                  >
                    {isSelected && <IconCheck size={14} className="text-slate-800 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bio / Description */}
          <div className="space-y-1.5">
            <Label htmlFor="staff-desc" className="text-xs font-semibold">
              Bio & Specialization Notes
            </Label>
            <Textarea
              id="staff-desc"
              placeholder="Senior stylist specializing in creative cuts, styling, and color consultation..."
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="rounded-xl text-xs"
            />
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
            <div className="space-y-0.5">
              <Label htmlFor="staff-active" className="text-xs font-semibold cursor-pointer">
                Active for Appointments
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Customers can choose this specialist in the booking wizard.
              </p>
            </div>
            <Switch
              id="staff-active"
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </div>
      </div>

      {/* Sheet Footer */}
      <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 shrink-0 flex flex-row items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-xl font-medium"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl font-semibold gap-1.5 min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEditing ? 'Save Changes' : 'Create Specialist'}</span>
          )}
        </Button>
      </SheetFooter>
    </form>
  );
}

export function StaffSheet({
  open,
  onOpenChange,
  staff,
  locationOptions,
  serviceOptions,
  onSuccess,
}: StaffSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-theme="company"
        className="data-[side=right]:sm:max-w-lg w-full p-0 flex flex-col justify-between overflow-hidden border-l border-border bg-card shadow-2xl"
      >
        {open && (
          <StaffFormContent
            key={staff?._id || 'new-staff'}
            staff={staff}
            locationOptions={locationOptions}
            serviceOptions={serviceOptions}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
