'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  IconPlus,
  IconSearch,
  IconFolder,
  IconFolderPlus,
  IconDotsVertical,
  IconTrash,
  IconExternalLink,
} from '@tabler/icons-react';
import {
  type CategoryItem,
  deleteCategory,
} from '@/actions/service';
import { CategoryDialog } from './category-dialog';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

export interface CategoryDataTableProps {
  initialCategories: CategoryItem[];
}

export function CategoryDataTable({ initialCategories }: CategoryDataTableProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCategories = categories.filter((cat) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      cat.name.toLowerCase().includes(query) ||
      (cat.description && cat.description.toLowerCase().includes(query))
    );
  });

  const handleCategoryCreated = (newCategory: CategoryItem) => {
    setCategories((prev) => [...prev, newCategory]);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;

    if (deletingCategory.serviceCount > 0) {
      toast.error(
        `Cannot delete "${deletingCategory.name}": it has ${deletingCategory.serviceCount} service(s) assigned.`
      );
      setDeletingCategory(null);
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteCategory(deletingCategory.id);
      if (result.success) {
        setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
        toast.success(`Category "${deletingCategory.name}" deleted.`);
        setDeletingCategory(null);
      } else {
        toast.error(result.error || 'Failed to delete category.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-card border-border"
          />
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="rounded-xl font-semibold gap-1.5 h-10"
        >
          <IconPlus size={16} />
          <span>Add Category</span>
        </Button>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-xs text-foreground min-w-[220px]">
                Category Name
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground min-w-[250px]">
                Description
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground min-w-[120px]">
                Services
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground min-w-[120px]">
                Created
              </TableHead>
              <TableHead className="text-right font-semibold text-xs text-foreground w-[70px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <IconFolder size={20} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      No categories found
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {searchQuery
                        ? `No category matches "${searchQuery}".`
                        : 'Organize your service catalog by adding your first category.'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDialogOpen(true)}
                      className="mt-2 rounded-xl text-xs gap-1"
                    >
                      <IconFolderPlus size={14} />
                      <span>Add Category</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((cat) => (
                <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                  {/* Category Name */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/15">
                        <IconFolder size={16} />
                      </div>
                      <span className="font-semibold text-sm text-foreground truncate">
                        {cat.name}
                      </span>
                    </div>
                  </TableCell>

                  {/* Description */}
                  <TableCell className="py-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-md">
                      {cat.description || '—'}
                    </p>
                  </TableCell>

                  {/* Services count badge */}
                  <TableCell className="py-3">
                    <Badge
                      variant="secondary"
                      className="rounded-md font-semibold text-xs bg-muted/60 text-foreground"
                    >
                      {cat.serviceCount} {cat.serviceCount === 1 ? 'service' : 'services'}
                    </Badge>
                  </TableCell>

                  {/* Created Date */}
                  <TableCell className="py-3">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(cat.createdAt)}
                    </span>
                  </TableCell>

                  {/* Actions Dropdown */}
                  <TableCell className="py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                          disabled={isDeleting && deletingCategory?.id === cat.id}
                        >
                          <IconDotsVertical size={16} />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl" data-theme="company">
                        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                          Category Actions
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="text-xs font-medium cursor-pointer gap-2">
                          <Link href={`/dashboard/services/catalog?category=${cat.id}`}>
                            <IconExternalLink size={14} className="text-muted-foreground" />
                            <span>View Services</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingCategory(cat)}
                          disabled={cat.serviceCount > 0}
                          className="text-xs font-medium text-destructive cursor-pointer gap-2 focus:text-destructive disabled:opacity-50"
                        >
                          <IconTrash size={14} />
                          <span>Delete Category</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleCategoryCreated}
      />

      <DeleteConfirmDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingCategory(null);
        }}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        itemName={deletingCategory?.name}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
