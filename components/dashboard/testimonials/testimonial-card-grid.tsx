'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  IconStarFilled,
  IconStar,
  IconPlus,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconSearch,
  IconX,
  IconQuote,
  IconAlertTriangle,
  IconLoader2,
  IconStarOff,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  toggleTestimonialStatusAction,
  deleteTestimonialAction,
  reorderTestimonialsAction,
} from '@/actions/testimonial';
import { TestimonialModal } from './testimonial-modal';
import type { TestimonialDTO } from '@/types/testimonial';

interface TestimonialCardGridProps {
  initialTestimonials: TestimonialDTO[];
  businessSlug?: string;
}

function getInitials(name: string): string {
  if (!name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        star <= rating ? (
          <IconStarFilled key={star} size={14} className="text-amber-500" />
        ) : (
          <IconStar key={star} size={14} className="text-muted-foreground/30" />
        )
      ))}
    </div>
  );
}

export function TestimonialCardGrid({
  initialTestimonials,
}: TestimonialCardGridProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [testimonials, setTestimonials] = useState<TestimonialDTO[]>(initialTestimonials);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TestimonialDTO | null>(null);

  // Delete Dialog state
  const [deletingItem, setDeletingItem] = useState<TestimonialDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reordering state
  const [isReordering, setIsReordering] = useState(false);

  // Summary Metrics
  const totalCount = testimonials.length;
  const activeCount = testimonials.filter((t) => t.isActive).length;
  const avgRating =
    totalCount > 0
      ? (
          testimonials.reduce((acc, curr) => acc + (curr.rating || 5), 0) /
          totalCount
        ).toFixed(1)
      : '0.0';

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: TestimonialDTO) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item: TestimonialDTO) => {
    const nextStatus = !item.isActive;

    // Optimistic UI update
    setTestimonials((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, isActive: nextStatus } : t))
    );

    try {
      const res = await toggleTestimonialStatusAction(item.id);
      if (res.success) {
        toast.success(
          nextStatus ? 'Review published to storefront.' : 'Review hidden from storefront.'
        );
        startTransition(() => {
          router.refresh();
        });
      } else {
        // Rollback
        setTestimonials((prev) =>
          prev.map((t) => (t.id === item.id ? { ...t, isActive: !nextStatus } : t))
        );
        toast.error(res.error || 'Failed to update review status.');
      }
    } catch {
      setTestimonials((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, isActive: !nextStatus } : t))
      );
      toast.error('An unexpected error occurred.');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= testimonials.length) return;

    const reordered = [...testimonials];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistic UI
    setTestimonials(reordered);
    setIsReordering(true);

    try {
      const orderedIds = reordered.map((t) => t.id);
      const res = await reorderTestimonialsAction({ orderedIds });
      if (res.success) {
        toast.success('Display order updated.');
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || 'Failed to update display order.');
        setTestimonials(initialTestimonials);
      }
    } catch {
      toast.error('An unexpected error occurred.');
      setTestimonials(initialTestimonials);
    } finally {
      setIsReordering(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    setIsDeleting(true);
    try {
      const res = await deleteTestimonialAction(deletingItem.id);
      if (res.success) {
        toast.success(res.message || 'Testimonial deleted successfully.');
        setTestimonials((prev) => prev.filter((t) => t.id !== deletingItem.id));
        setDeletingItem(null);
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || 'Failed to delete review.');
      }
    } catch {
      toast.error('An unexpected error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered list
  const filteredList = testimonials.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.title && t.title.toLowerCase().includes(q)) ||
      t.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Metrics & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 shadow-2xs">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold text-foreground">{totalCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/30 px-3 py-1.5 shadow-2xs">
            <IconEye size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              {activeCount} Published
            </span>
          </div>

          {totalCount - activeCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 shadow-2xs text-muted-foreground">
              <IconEyeOff size={14} />
              <span>{totalCount - activeCount} Hidden</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/30 px-3 py-1.5 shadow-2xs">
            <IconStarFilled size={14} className="text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400 font-bold">
              {avgRating} / 5.0
            </span>
          </div>
        </div>

        {/* Search & Add Review Button */}
        <div className="flex items-center gap-2.5">
          {totalCount > 0 && (
            <div className="relative w-full sm:w-60">
              <IconSearch
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-7 text-xs bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>
          )}

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="h-9 gap-1.5 cursor-pointer font-medium text-xs shrink-0"
          >
            <IconPlus size={16} />
            <span>Add Review</span>
          </Button>
        </div>
      </div>

      {/* Reviews Card Grid */}
      {filteredList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
            <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <IconStarOff size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-foreground">
                {searchQuery ? 'No matching reviews found' : 'No customer reviews yet'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {searchQuery
                  ? 'No customer reviews match your search query.'
                  : 'Start showcasing your customer feedback, social proof, and 5-star ratings on your public storefront.'}
              </p>
            </div>
            {searchQuery ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-xs h-8 cursor-pointer mt-1"
              >
                Clear Search
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                className="text-xs h-8 gap-1.5 cursor-pointer mt-1"
              >
                <IconPlus size={15} />
                <span>Add First Review</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredList.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === filteredList.length - 1;

            return (
              <Card
                key={item.id}
                className={`relative flex flex-col justify-between transition-all hover:shadow-sm border ${
                  item.isActive
                    ? 'border-border bg-card'
                    : 'border-border/60 bg-muted/10 opacity-75'
                }`}
              >
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                  {/* Top Bar: Reorder Controls, Badges, Dropdown Menu */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Reorder Shift Buttons */}
                    <div className="flex items-center gap-0.5 bg-muted/60 rounded-md p-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveOrder(index, 'up')}
                        disabled={isFirst || isReordering || Boolean(searchQuery)}
                        title={searchQuery ? 'Clear search to reorder' : 'Move up in display order'}
                        className="size-6 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                      >
                        <IconArrowUp size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveOrder(index, 'down')}
                        disabled={isLast || isReordering || Boolean(searchQuery)}
                        title={searchQuery ? 'Clear search to reorder' : 'Move down in display order'}
                        className="size-6 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                      >
                        <IconArrowDown size={13} />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Published / Hidden Badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium px-2 py-0 h-5 border ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {item.isActive ? 'Published' : 'Hidden'}
                      </Badge>

                      {/* Actions Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 cursor-pointer hover:bg-muted"
                            aria-label={`Actions for ${item.name}`}
                          >
                            <IconDotsVertical size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground truncate">
                            {item.name}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenEditModal(item)}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <IconPencil size={14} className="text-primary" />
                            <span>Edit Review</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingItem(item)}
                            className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                          >
                            <IconTrash size={14} />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Review Stars & Quote Text */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center justify-between">
                      {renderStars(item.rating || 5)}
                      <IconQuote size={20} className="text-muted-foreground/20 shrink-0" />
                    </div>

                    <p className="text-xs sm:text-sm text-foreground/90 italic leading-relaxed line-clamp-4">
                      &ldquo;{item.description}&rdquo;
                    </p>
                  </div>

                  {/* Reviewer Info & Storefront Toggle */}
                  <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-8 border border-border shrink-0">
                        {item.image ? (
                          <AvatarImage src={item.image} alt={item.name} />
                        ) : null}
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {getInitials(item.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground truncate">
                          {item.name}
                        </div>
                        {item.title ? (
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.title}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Instant Visibility Switch */}
                    <div className="flex items-center gap-1.5 shrink-0" title="Toggle public visibility">
                      <Switch
                        size="sm"
                        checked={item.isActive}
                        onCheckedChange={() => handleToggleStatus(item)}
                        aria-label={`Toggle storefront visibility for ${item.name}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <TestimonialModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        testimonialToEdit={editingItem}
        onSuccess={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <IconAlertTriangle size={20} />
              <DialogTitle>Delete Review</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Are you sure you want to delete the review by{' '}
              <strong className="text-foreground">{deletingItem?.name}</strong>?
              This will remove the testimonial from your public storefront immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingItem(null)}
              disabled={isDeleting}
              className="cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="cursor-pointer text-xs gap-1.5 font-medium"
            >
              {isDeleting ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <IconTrash size={14} />
                  <span>Delete Review</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
