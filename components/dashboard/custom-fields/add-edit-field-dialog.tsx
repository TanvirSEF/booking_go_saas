'use client';

import React, { useState, useEffect, useTransition } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldOptionsInput } from './field-options-input';
import {
  IconForms,
  IconLoader2,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  createCustomFieldAction,
  updateCustomFieldAction,
} from '@/actions/custom-field';
import type {
  CustomFieldDTO,
  CustomFieldType,
  CreateCustomFieldInput,
} from '@/types/custom-field';

interface AddEditFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldToEdit?: CustomFieldDTO | null;
  onFieldSaved: (saved: CustomFieldDTO) => void;
}

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Single-line Text',
  number: 'Numeric Input',
  email: 'Email Address',
  date: 'Calendar Date',
  select: 'Dropdown Selection',
  textarea: 'Multi-line Textbox',
  radio: 'Radio Choice Buttons',
  checkbox: 'Multi-Select Checkboxes',
};

export function AddEditFieldDialog({
  open,
  onOpenChange,
  fieldToEdit,
  onFieldSaved,
}: AddEditFieldDialogProps) {
  const [isPending, startTransition] = useTransition();

  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [options, setOptions] = useState<string[]>([]);
  const [placeholder, setPlaceholder] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  // Sync state whenever fieldToEdit or modal open changes
  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (!isMounted) return;
      if (fieldToEdit) {
        setLabel(fieldToEdit.label);
        setType(fieldToEdit.type);
        setOptions(fieldToEdit.options || []);
        setPlaceholder(fieldToEdit.placeholder || '');
        setDefaultValue(fieldToEdit.defaultValue || '');
        setIsRequired(Boolean(fieldToEdit.isRequired));
      } else {
        setLabel('');
        setType('text');
        setOptions([]);
        setPlaceholder('');
        setDefaultValue('');
        setIsRequired(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [fieldToEdit, open]);

  const hasOptions = ['select', 'radio', 'checkbox'].includes(type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) {
      toast.error('Please specify a label for this question.');
      return;
    }

    if (hasOptions && options.length === 0) {
      toast.error('Please add at least one option choice for this field.');
      return;
    }

    startTransition(async () => {
      if (fieldToEdit) {
        const res = await updateCustomFieldAction({
          id: fieldToEdit.id,
          label: label.trim(),
          type,
          options: hasOptions ? options : [],
          placeholder: placeholder.trim(),
          defaultValue: defaultValue.trim(),
          isRequired,
        });

        if (res.success && res.data) {
          toast.success(res.message || 'Custom field updated.');
          onFieldSaved(res.data);
          onOpenChange(false);
        } else {
          toast.error(res.error || 'Failed to update custom field.');
        }
      } else {
        const input: CreateCustomFieldInput = {
          label: label.trim(),
          type,
          options: hasOptions ? options : [],
          placeholder: placeholder.trim(),
          defaultValue: defaultValue.trim(),
          isRequired,
        };

        const res = await createCustomFieldAction(input);

        if (res.success && res.data) {
          toast.success(res.message || 'Custom field created.');
          onFieldSaved(res.data);
          onOpenChange(false);
        } else {
          toast.error(res.error || 'Failed to create custom field.');
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isPending && onOpenChange(val)}>
      <DialogContent
        data-theme="company"
        className="max-w-lg rounded-2xl border-border bg-card p-0 shadow-2xl overflow-hidden"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-border bg-muted/20">
            <DialogHeader className="p-0 text-left">
              <div className="flex items-center gap-2 text-primary">
                <IconForms size={20} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Intake Question
                </span>
              </div>
              <DialogTitle className="text-xl font-bold text-foreground mt-1">
                {fieldToEdit ? 'Edit Custom Field' : 'Add Custom Field'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configures an intake question shown during Step 4 of the booking wizard.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-4.5 max-h-[70vh] overflow-y-auto">
            {/* Field Label */}
            <div className="space-y-1.5">
              <Label htmlFor="cf-label" className="text-xs font-semibold text-foreground">
                Field Label / Question Prompt <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cf-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Vehicle License Plate or Medical Allergies"
                disabled={isPending}
                required
                className="rounded-xl bg-background border-border text-xs h-9"
              />
            </div>

            {/* Field Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Field Input Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={type}
                onValueChange={(val) => setType(val as CustomFieldType)}
                disabled={isPending}
              >
                <SelectTrigger className="rounded-xl bg-background border-border text-xs h-9 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-card">
                  {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {FIELD_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Options Input if select/radio/checkbox */}
            {hasOptions && (
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>Options List</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {options.length} choice{options.length === 1 ? '' : 's'} defined
                  </span>
                </div>
                <FieldOptionsInput
                  options={options}
                  onChange={setOptions}
                  disabled={isPending}
                />
              </div>
            )}

            {/* Placeholder Text */}
            <div className="space-y-1.5">
              <Label htmlFor="cf-placeholder" className="text-xs font-semibold text-foreground">
                Placeholder Text (Optional)
              </Label>
              <Input
                id="cf-placeholder"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="e.g. Enter plate number (e.g. 7XYZ123)"
                disabled={isPending}
                className="rounded-xl bg-background border-border text-xs h-9"
              />
            </div>

            {/* Default Value */}
            <div className="space-y-1.5">
              <Label htmlFor="cf-default" className="text-xs font-semibold text-foreground">
                Default Value (Optional)
              </Label>
              <Input
                id="cf-default"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder="Optional pre-filled answer"
                disabled={isPending}
                className="rounded-xl bg-background border-border text-xs h-9"
              />
            </div>

            {/* Required Toggle */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="cf-required" className="text-xs font-bold text-foreground cursor-pointer">
                  Mandatory Field (Required)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When enabled, customers cannot submit their booking without completing this answer.
                </p>
              </div>
              <Switch
                id="cf-required"
                checked={isRequired}
                onCheckedChange={setIsRequired}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="p-4 sm:p-6 border-t border-border bg-muted/20 flex flex-row items-center justify-end gap-2">
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <IconDeviceFloppy size={15} />
                  <span>{fieldToEdit ? 'Save Changes' : 'Create Field'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
