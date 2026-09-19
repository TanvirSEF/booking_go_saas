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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  IconStarFilled,
  IconStar,
  IconLoader2,
  IconUser,
  IconSparkles,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  createTestimonialAction,
  updateTestimonialAction,
} from '@/actions/testimonial';
import type { TestimonialDTO } from '@/types/testimonial';

interface TestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  testimonialToEdit?: TestimonialDTO | null;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: '1 Star - Needs Improvement',
  2: '2 Stars - Fair Experience',
  3: '3 Stars - Good Service',
  4: '4 Stars - Very Satisfied',
  5: '5 Stars - Outstanding Experience',
};

function getInitials(name: string): string {
  if (!name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface TestimonialFormProps {
  testimonialToEdit?: TestimonialDTO | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function TestimonialForm({
  testimonialToEdit,
  onClose,
  onSuccess,
}: TestimonialFormProps) {
  const isEditMode = Boolean(testimonialToEdit);

  const [name, setName] = useState(testimonialToEdit?.name || '');
  const [title, setTitle] = useState(testimonialToEdit?.title || '');
  const [rating, setRating] = useState<number>(testimonialToEdit?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [description, setDescription] = useState(
    testimonialToEdit?.description || ''
  );
  const [image, setImage] = useState(testimonialToEdit?.image || '');
  const [isActive, setIsActive] = useState(testimonialToEdit?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (!trimmedName || trimmedName.length < 2) {
      toast.error('Client name must be at least 2 characters.');
      return;
    }

    if (!trimmedDesc || trimmedDesc.length < 5) {
      toast.error('Review description must be at least 5 characters.');
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error('Rating must be between 1 and 5 stars.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && testimonialToEdit) {
        const res = await updateTestimonialAction({
          id: testimonialToEdit.id,
          name: trimmedName,
          title: title.trim(),
          rating,
          description: trimmedDesc,
          image: image.trim(),
          isActive,
        });

        if (res.success) {
          toast.success(res.message || 'Testimonial updated successfully.');
          onSuccess?.();
          onClose();
        } else {
          toast.error(res.error || 'Failed to update testimonial.');
        }
      } else {
        const res = await createTestimonialAction({
          name: trimmedName,
          title: title.trim(),
          rating,
          description: trimmedDesc,
          image: image.trim(),
          isActive,
        });

        if (res.success) {
          toast.success(res.message || 'Testimonial created successfully.');
          onSuccess?.();
          onClose();
        } else {
          toast.error(res.error || 'Failed to create testimonial.');
        }
      }
    } catch {
      toast.error('An unexpected error occurred while saving the review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDisplayRating = hoverRating ?? rating;

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 text-primary mb-0.5">
          <IconSparkles size={18} />
          <DialogTitle>
            {isEditMode ? 'Edit Customer Review' : 'Add Customer Review'}
          </DialogTitle>
        </div>
        <DialogDescription className="text-xs">
          {isEditMode
            ? 'Update review details, client rating, or public storefront visibility.'
            : 'Add customer feedback and 5-star ratings to showcase on your booking storefront.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {/* Client Details Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <Label
              htmlFor="client-name"
              className="text-xs font-semibold text-foreground"
            >
              Client Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-name"
              placeholder="e.g. Sarah Jenkins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="client-title"
              className="text-xs font-semibold text-foreground"
            >
              Title / Designation (Optional)
            </Label>
            <Input
              id="client-title"
              placeholder="e.g. Verified Client, BMW Owner"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              className="text-xs"
            />
          </div>
        </div>

        {/* Interactive Star Rating Selector */}
        <div className="space-y-1.5 rounded-lg border border-border/80 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground">
              Rating <span className="text-destructive">*</span>
            </Label>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {RATING_LABELS[activeDisplayRating] ||
                `${activeDisplayRating} Stars`}
            </span>
          </div>

          <div
            className="flex items-center gap-1 pt-1"
            onMouseLeave={() => setHoverRating(null)}
            role="radiogroup"
            aria-label="Star rating picker"
          >
            {[1, 2, 3, 4, 5].map((starValue) => {
              const isFilled = starValue <= activeDisplayRating;
              return (
                <button
                  key={starValue}
                  type="button"
                  onClick={() => setRating(starValue)}
                  onMouseEnter={() => setHoverRating(starValue)}
                  disabled={isSubmitting}
                  className="p-1 rounded-sm text-amber-500 hover:scale-110 transition-transform cursor-pointer focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={`Select ${starValue} star${starValue > 1 ? 's' : ''}`}
                  aria-checked={rating === starValue}
                  role="radio"
                >
                  {isFilled ? (
                    <IconStarFilled size={22} className="text-amber-500" />
                  ) : (
                    <IconStar
                      size={22}
                      className="text-muted-foreground/40 hover:text-amber-400"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Review Text */}
        <div className="space-y-1.5">
          <Label
            htmlFor="review-description"
            className="text-xs font-semibold text-foreground"
          >
            Review Quote <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="review-description"
            placeholder="What did the customer say about your services and staff?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            required
            disabled={isSubmitting}
            className="text-xs resize-none"
          />
        </div>

        {/* Avatar Image URL with Live Preview */}
        <div className="space-y-1.5">
          <Label
            htmlFor="client-image"
            className="text-xs font-semibold text-foreground"
          >
            Avatar Image URL (Optional)
          </Label>
          <div className="flex items-center gap-2.5">
            <Avatar className="size-9 border border-border shrink-0">
              {image ? (
                <AvatarImage src={image} alt={name || 'Avatar'} />
              ) : null}
              <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">
                {name ? getInitials(name) : <IconUser size={16} />}
              </AvatarFallback>
            </Avatar>
            <Input
              id="client-image"
              type="url"
              placeholder="https://example.com/photos/avatar.jpg"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              disabled={isSubmitting}
              className="text-xs flex-1"
            />
          </div>
        </div>

        {/* Visibility Switch */}
        <div className="flex items-center justify-between pt-2 pb-1 border-t border-border">
          <div className="space-y-0.5">
            <Label
              htmlFor="publish-toggle"
              className="text-xs font-semibold text-foreground cursor-pointer"
            >
              Publish on Storefront
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Visible to customers on the public booking wizard slider.
            </p>
          </div>
          <Switch
            id="publish-toggle"
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={isSubmitting}
          />
        </div>

        <DialogFooter className="pt-2 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="cursor-pointer text-xs gap-1.5 font-medium"
          >
            {isSubmitting ? (
              <>
                <IconLoader2 size={15} className="animate-spin" />
                <span>{isEditMode ? 'Saving...' : 'Creating...'}</span>
              </>
            ) : (
              <span>{isEditMode ? 'Save Changes' : 'Create Testimonial'}</span>
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function TestimonialModal({
  isOpen,
  onClose,
  testimonialToEdit,
  onSuccess,
}: TestimonialModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {isOpen ? (
          <TestimonialForm
            key={testimonialToEdit ? testimonialToEdit.id : 'new'}
            testimonialToEdit={testimonialToEdit}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
