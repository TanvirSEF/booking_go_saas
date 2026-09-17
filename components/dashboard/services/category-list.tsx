'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  IconFolder,
  IconFolderPlus,
  IconLayersIntersect,
  IconTrash,
  IconAlertCircle,
} from '@tabler/icons-react';
import {
  type CategoryItem,
  deleteCategory,
} from '@/actions/service';
import { CategoryDialog } from './category-dialog';
import { cn } from '@/lib/utils';

export interface CategoryListProps {
  categories: CategoryItem[];
  selectedCategoryId: string | null; // null represents "All Services"
  onSelectCategory: (categoryId: string | null) => void;
  onCategoriesChange: (updated: CategoryItem[]) => void;
  totalServicesCount: number;
}

export function CategoryList({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCategoriesChange,
  totalServicesCount,
}: CategoryListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCategoryCreated = (newCategory: CategoryItem) => {
    const updated = [...categories, newCategory];
    onCategoriesChange(updated);
    // Optionally switch to newly created category
    onSelectCategory(newCategory.id);
  };

  const handleDeleteCategory = async (cat: CategoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cat.serviceCount > 0) {
      toast.error(
        `Cannot delete "${cat.name}" because it still contains ${cat.serviceCount} service(s). Reassign or delete them first.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }

    setDeletingId(cat.id);
    try {
      const result = await deleteCategory(cat.id);
      if (result.success) {
        toast.success(`Category "${cat.name}" deleted.`);
        const updated = categories.filter((c) => c.id !== cat.id);
        onCategoriesChange(updated);
        if (selectedCategoryId === cat.id) {
          onSelectCategory(null);
        }
      } else {
        toast.error(result.error || 'Failed to delete category.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconFolder size={18} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold text-foreground truncate">
                Categories
              </CardTitle>
              <p className="text-[11px] text-muted-foreground truncate">
                {categories.length} {categories.length === 1 ? 'group' : 'groups'}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsDialogOpen(true)}
            className="h-8 rounded-xl px-2.5 text-xs font-semibold gap-1 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <IconFolderPlus size={15} />
            <span>Add</span>
          </Button>
        </CardHeader>

        <CardContent className="p-2 sm:p-3 space-y-1">
          {/* All Services Option */}
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={cn(
              'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left group cursor-pointer',
              selectedCategoryId === null
                ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-500'
                : 'text-foreground/80 hover:bg-accent hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <IconLayersIntersect
                size={16}
                className={cn(
                  'shrink-0',
                  selectedCategoryId === null
                    ? 'text-white'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              <span className="truncate font-semibold">All Services</span>
            </div>
            <Badge
              variant={selectedCategoryId === null ? 'secondary' : 'outline'}
              className={cn(
                'rounded-lg px-2 py-0.5 text-[10px] font-bold shrink-0 border-0',
                selectedCategoryId === null
                  ? 'bg-white/20 text-white'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {totalServicesCount}
            </Badge>
          </button>

          {/* Categories List */}
          {categories.length === 0 ? (
            <div className="py-6 px-3 text-center">
              <IconAlertCircle className="mx-auto size-6 text-muted-foreground/60 mb-1" />
              <p className="text-xs text-muted-foreground">No categories yet.</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="text-xs text-primary font-semibold p-0 h-auto mt-1"
              >
                Create your first category
              </Button>
            </div>
          ) : (
            categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={cn(
                    'group relative w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer',
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-500'
                      : 'text-foreground/80 hover:bg-accent hover:text-foreground'
                  )}
                  title={cat.description || cat.name}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <IconFolder
                      size={16}
                      className={cn(
                        'shrink-0',
                        isSelected
                          ? 'text-white'
                          : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant={isSelected ? 'secondary' : 'outline'}
                      className={cn(
                        'rounded-lg px-2 py-0.5 text-[10px] font-bold border-0',
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {cat.serviceCount}
                    </Badge>

                    {/* Delete action for empty categories */}
                    {cat.serviceCount === 0 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCategory(cat, e)}
                        disabled={deletingId === cat.id}
                        className={cn(
                          'opacity-0 group-hover:opacity-100 p-1 rounded-md transition-opacity',
                          isSelected
                            ? 'text-white/80 hover:text-white hover:bg-white/20'
                            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                        )}
                        title="Delete empty category"
                      >
                        <IconTrash size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleCategoryCreated}
      />
    </>
  );
}
