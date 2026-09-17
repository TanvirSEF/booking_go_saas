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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  IconScissors,
  IconClock,
  IconCurrencyDollar,
  IconLoader2,
  IconAlertTriangle,
} from '@tabler/icons-react';
import {
  createService,
  updateService,
  type ServiceItem,
  type CategoryItem,
  type ServiceInput,
} from '@/actions/service';

export interface ServiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceItem | null;
  categories: CategoryItem[];
  currencySymbol?: string;
  defaultCategoryId?: string | null;
  onSuccess?: (item: ServiceItem) => void;
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 mins' },
  { value: 30, label: '30 mins (Standard)' },
  { value: 45, label: '45 mins' },
  { value: 60, label: '1 hour (60 mins)' },
  { value: 90, label: '1 hr 30 mins (90 mins)' },
  { value: 120, label: '2 hours (120 mins)' },
];

interface ServiceFormContentProps {
  service?: ServiceItem | null;
  categories: CategoryItem[];
  currencySymbol?: string;
  defaultCategoryId?: string | null;
  onClose: () => void;
  onSuccess?: (item: ServiceItem) => void;
}

function ServiceFormContent({
  service,
  categories,
  currencySymbol = '$',
  defaultCategoryId,
  onClose,
  onSuccess,
}: ServiceFormContentProps) {
  const isEditing = Boolean(service);

  const initialCategory =
    service?.categoryId ||
    (defaultCategoryId && categories.some((c) => c.id === defaultCategoryId)
      ? defaultCategoryId
      : categories[0]?.id || '');

  const [formData, setFormData] = useState<ServiceInput>({
    name: service?.name || '',
    categoryId: initialCategory,
    durationMinutes: service?.durationMinutes ?? 30,
    price: service?.price ?? 25,
    isFree: service?.isFree ?? false,
    description: service?.description || '',
    onlineMeetingType: service?.onlineMeetingType || 'none',
    onlineMeetingUrl: service?.onlineMeetingUrl || '',
    isActive: service?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planWarning, setPlanWarning] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Service name must be at least 2 characters.';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category.';
    }

    if (!formData.durationMinutes || formData.durationMinutes < 5) {
      newErrors.durationMinutes = 'Duration must be at least 5 minutes.';
    }

    if (!formData.isFree && (formData.price === undefined || formData.price < 0)) {
      newErrors.price = 'Price must be 0 or higher.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setPlanWarning(null);

    try {
      if (isEditing && service) {
        const result = await updateService(service.id, formData);
        if (result.success && result.data) {
          toast.success(`Service "${result.data.name}" updated successfully.`);
          onClose();
          if (onSuccess) onSuccess(result.data);
        } else {
          toast.error(result.error || 'Failed to update service.');
        }
      } else {
        const result = await createService(formData);
        if (result.success && result.data) {
          toast.success(`Service "${result.data.name}" added successfully.`);
          onClose();
          if (onSuccess) onSuccess(result.data);
        } else {
          if (result.planLimitExceeded) {
            setPlanWarning(
              result.error ||
                'Your subscription plan limit for services has been reached.'
            );
            toast.error(result.error || 'Plan limit reached.');
          } else {
            toast.error(result.error || 'Failed to create service.');
          }
        }
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <SheetHeader className="p-6 pb-4 border-b border-border/60 shrink-0">
        <SheetTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
            <IconScissors size={20} />
          </div>
          <span>{isEditing ? 'Edit Service' : 'Add New Service'}</span>
        </SheetTitle>
        <SheetDescription className="text-xs text-muted-foreground">
          {isEditing
            ? 'Update pricing, duration, and availability for this service.'
            : 'Offer a new appointment service for clients to book online.'}
        </SheetDescription>
      </SheetHeader>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Plan limit warning banner */}
        {planWarning && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
            <IconAlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Upgrade Required: </span>
              <span>{planWarning}</span>
            </div>
          </div>
        )}

        {/* Service Name */}
        <div className="space-y-1.5">
          <Label htmlFor="srv-name" className="text-xs font-semibold text-foreground">
            Service Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="srv-name"
            placeholder="e.g. Signature Haircut & Blowdry"
            value={formData.name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, name: e.target.value }));
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            className="h-10 rounded-xl bg-background"
            autoFocus
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="space-y-1.5">
          <Label htmlFor="srv-cat" className="text-xs font-semibold text-foreground">
            Category <span className="text-destructive">*</span>
          </Label>
          {categories.length === 0 ? (
            <div className="text-xs text-muted-foreground p-2 border rounded-xl bg-muted/40">
              No categories found. Please add a category first.
            </div>
          ) : (
            <Select
              value={formData.categoryId}
              onValueChange={(val) => {
                setFormData((prev) => ({ ...prev, categoryId: val }));
                if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: '' }));
              }}
            >
              <SelectTrigger id="srv-cat" className="w-full h-10 rounded-xl bg-background">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent data-theme="company" className="rounded-xl">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="rounded-lg text-xs">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.categoryId && (
            <p className="text-xs text-destructive">{errors.categoryId}</p>
          )}
        </div>

        {/* Duration and Price Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Duration select */}
          <div className="space-y-1.5">
            <Label htmlFor="srv-duration" className="text-xs font-semibold text-foreground flex items-center gap-1">
              <IconClock size={14} className="text-muted-foreground" />
              <span>Duration <span className="text-destructive">*</span></span>
            </Label>
            <Select
              value={String(formData.durationMinutes)}
              onValueChange={(val) =>
                setFormData((prev) => ({ ...prev, durationMinutes: Number(val) }))
              }
            >
              <SelectTrigger id="srv-duration" className="w-full h-10 rounded-xl bg-background">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent data-theme="company" className="rounded-xl">
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)} className="rounded-lg text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.durationMinutes && (
              <p className="text-xs text-destructive">{errors.durationMinutes}</p>
            )}
          </div>

          {/* Price input */}
          <div className="space-y-1.5">
            <Label htmlFor="srv-price" className="text-xs font-semibold text-foreground flex items-center gap-1">
              <IconCurrencyDollar size={14} className="text-muted-foreground" />
              <span>Price ({currencySymbol})</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="srv-price"
                type="number"
                step="0.01"
                min="0"
                disabled={formData.isFree}
                placeholder="0.00"
                value={formData.isFree ? '0' : formData.price}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    price: parseFloat(e.target.value) || 0,
                  }));
                  if (errors.price) setErrors((prev) => ({ ...prev, price: '' }));
                }}
                className="h-10 rounded-xl bg-background pl-7"
              />
            </div>
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price}</p>
            )}
          </div>
        </div>

        {/* Free Toggle & Status Switches */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
          {/* isFree Checkbox */}
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="srv-free"
              checked={formData.isFree}
              onCheckedChange={(checked) => {
                const isFree = Boolean(checked);
                setFormData((prev) => ({
                  ...prev,
                  isFree,
                  price: isFree ? 0 : prev.price,
                }));
              }}
            />
            <div className="grid gap-0.5 leading-none">
              <label
                htmlFor="srv-free"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                Mark as Free Service
              </label>
              <p className="text-[11px] text-muted-foreground">
                Clients can book this service at no monetary charge.
              </p>
            </div>
          </div>

          {/* Active Toggle Switch */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <div className="grid gap-0.5">
              <Label htmlFor="srv-active" className="text-xs font-semibold text-foreground cursor-pointer">
                Active for Online Booking
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When inactive, clients cannot select this in the booking wizard.
              </p>
            </div>
            <Switch
              id="srv-active"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="srv-desc" className="text-xs font-semibold text-foreground">
            Description <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Textarea
            id="srv-desc"
            placeholder="Details of what is included, preparation instructions, etc."
            rows={4}
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            className="resize-none rounded-xl bg-background text-sm"
          />
        </div>
      </div>

      {/* Footer */}
      <SheetFooter className="p-4 sm:p-6 border-t border-border/60 bg-muted/10 shrink-0 flex flex-row items-center justify-end gap-2">
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
          className="rounded-xl font-medium gap-1.5"
        >
          {isSubmitting ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <IconScissors size={16} />
              <span>{isEditing ? 'Save Changes' : 'Create Service'}</span>
            </>
          )}
        </Button>
      </SheetFooter>
    </form>
  );
}

export function ServiceSheet({
  open,
  onOpenChange,
  service,
  categories,
  currencySymbol = '$',
  defaultCategoryId,
  onSuccess,
}: ServiceSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-theme="company"
        className="data-[side=right]:sm:max-w-lg w-full p-0 flex flex-col justify-between overflow-hidden border-l border-border bg-card shadow-2xl"
      >
        {open && (
          <ServiceFormContent
            key={service?.id || 'new-service'}
            service={service}
            categories={categories}
            currencySymbol={currencySymbol}
            defaultCategoryId={defaultCategoryId}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
