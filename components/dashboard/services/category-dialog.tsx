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
import { toast } from 'sonner';
import { IconFolderPlus, IconLoader2 } from '@tabler/icons-react';
import {
  createCategory,
  type CategoryItem,
  type CategoryInput,
} from '@/actions/service';

export interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (item: CategoryItem) => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  onSuccess,
}: CategoryDialogProps) {
  const [formData, setFormData] = useState<CategoryInput>({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await createCategory(formData);
      if (result.success && result.data) {
        toast.success(`Category "${result.data.name}" created successfully.`);
        resetForm();
        onOpenChange(false);
        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        toast.error(result.error || 'Failed to create category.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent data-theme="company" className="max-w-md rounded-2xl border-border bg-card p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconFolderPlus size={20} />
              </div>
              <span>Add Category</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Group related services together to streamline customer booking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category Name */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-name" className="text-xs font-semibold text-foreground">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cat-name"
                placeholder="e.g. Hair Styling & Care, Spa Treatments"
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

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc" className="text-xs font-semibold text-foreground">
                Description <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="cat-desc"
                placeholder="Brief summary of services contained in this category..."
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                className="resize-none rounded-xl bg-background text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2  pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <IconFolderPlus size={16} />
                  <span>Create Category</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
