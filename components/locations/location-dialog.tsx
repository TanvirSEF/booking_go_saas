'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  IconMapPin,
  IconPhone,
  IconLoader2,
  IconAlertTriangle,
} from '@tabler/icons-react';
import {
  createLocation,
  updateLocation,
  type LocationItem,
  type LocationInput,
} from '@/actions/location';

export interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: LocationItem | null;
  onSuccess?: (item?: LocationItem) => void;
}

interface LocationFormProps {
  location?: LocationItem | null;
  onClose: () => void;
  onSuccess?: (item?: LocationItem) => void;
}

function LocationFormContent({ location, onClose, onSuccess }: LocationFormProps) {
  const isEditing = Boolean(location);

  const [formData, setFormData] = useState<LocationInput>({
    name: location?.name || '',
    address: location?.address || '',
    phone: location?.phone || '',
    description: location?.description || '',
    image: location?.image || '',
    isActive: location?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planWarning, setPlanWarning] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Location name must be at least 2 characters.';
    }

    if (!formData.address.trim() || formData.address.trim().length < 3) {
      newErrors.address = 'Address is required (at least 3 characters).';
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
      if (isEditing && location) {
        const result = await updateLocation(location.id, formData);
        if (result.success) {
          toast.success('Location updated successfully.');
          onClose();
          if (onSuccess) onSuccess(result.data);
        } else {
          toast.error(result.error || 'Failed to update location.');
        }
      } else {
        const result = await createLocation(formData);
        if (result.success) {
          toast.success('Location created successfully.');
          onClose();
          if (onSuccess) onSuccess(result.data);
        } else {
          if (result.planLimitExceeded) {
            setPlanWarning(result.error || 'Plan limit reached.');
            toast.error(result.error || 'Plan limit reached.');
          } else {
            toast.error(result.error || 'Failed to create location.');
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
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
          <IconMapPin className="text-primary" size={20} />
          <span>{isEditing ? 'Edit Location' : 'Add New Location'}</span>
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          {isEditing
            ? 'Update your branch details and appointment availability.'
            : 'Add a new branch or salon location to your organization.'}
        </DialogDescription>
      </DialogHeader>

      {planWarning && (
        <div className="mt-4 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2.5">
          <IconAlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Subscription Plan Quota Exceeded</p>
            <p className="mt-0.5 leading-relaxed">{planWarning}</p>
          </div>
        </div>
      )}

      <div className="space-y-4 py-4">
        {/* Location Name */}
        <div className="space-y-1.5">
          <Label htmlFor="loc-name" className="text-xs font-semibold">
            Location Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="loc-name"
            placeholder="e.g., Downtown Flagship"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-[11px] text-destructive font-medium">{errors.name}</p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label htmlFor="loc-address" className="text-xs font-semibold">
            Full Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="loc-address"
            placeholder="e.g., 123 Market Street, Suite 400"
            value={formData.address}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, address: e.target.value }))
            }
            className={errors.address ? 'border-destructive' : ''}
          />
          {errors.address && (
            <p className="text-[11px] text-destructive font-medium">{errors.address}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="loc-phone" className="text-xs font-semibold">
            Contact Phone
          </Label>
          <div className="relative">
            <IconPhone
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="loc-phone"
              placeholder="e.g., +1 555-0199"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="pl-9"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="loc-desc" className="text-xs font-semibold">
            Description / Notes
          </Label>
          <Textarea
            id="loc-desc"
            placeholder="Brief description, parking instructions, or landmark info..."
            rows={3}
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </div>

        {/* Active Status Switch */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
          <div className="space-y-0.5">
            <Label htmlFor="loc-active" className="text-xs font-semibold cursor-pointer">
              Active for Online Bookings
            </Label>
            <p className="text-[11px] text-muted-foreground">
              When enabled, customers can select this branch in the booking wizard.
            </p>
          </div>
          <Switch
            id="loc-active"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, isActive: checked }))
            }
          />
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[100px]">
          {isSubmitting ? (
            <>
              <IconLoader2 size={16} className="animate-spin mr-2" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEditing ? 'Save Changes' : 'Create Location'}</span>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function LocationDialog({
  open,
  onOpenChange,
  location,
  onSuccess,
}: LocationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <LocationFormContent
            key={location?.id || 'new'}
            location={location}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
