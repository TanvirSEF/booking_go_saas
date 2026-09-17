'use client';

import React, { useState } from 'react';
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
  IconScissors,
  IconClock,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconPower,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import {
  type ServiceItem,
  type CategoryItem,
  toggleServiceStatus,
  deleteService,
} from '@/actions/service';
import { ServiceSheet } from './service-sheet';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { cn } from '@/lib/utils';

export interface PlanQuotaInfo {
  current: number;
  max: number;
  allowed: boolean;
}

export interface ServiceDataTableProps {
  services: ServiceItem[];
  categories: CategoryItem[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  currencySymbol?: string;
  planQuota: PlanQuotaInfo;
  onServicesChange: (updated: ServiceItem[]) => void;
}

export function ServiceDataTable({
  services,
  categories,
  selectedCategoryId,
  onSelectCategory,
  currencySymbol = '$',
  planQuota,
  onServicesChange,
}: ServiceDataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deletingService, setDeletingService] = useState<ServiceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredServices = services.filter((srv) => {
    // 1. Category filter
    if (selectedCategoryId && srv.categoryId !== selectedCategoryId) {
      return false;
    }

    // 2. Search query
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      srv.name.toLowerCase().includes(query) ||
      srv.categoryName.toLowerCase().includes(query) ||
      (srv.description && srv.description.toLowerCase().includes(query))
    );
  });

  const handleOpenAdd = () => {
    setEditingService(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (srv: ServiceItem) => {
    setEditingService(srv);
    setIsDialogOpen(true);
  };

  const handleServiceSuccess = (updatedOrNew: ServiceItem) => {
    let updated: ServiceItem[];
    if (editingService) {
      updated = services.map((s) => (s.id === updatedOrNew.id ? updatedOrNew : s));
    } else {
      updated = [updatedOrNew, ...services];
    }
    onServicesChange(updated);
  };

  const handleToggleStatus = async (id: string) => {
    setActionLoadingId(id);
    try {
      const result = await toggleServiceStatus(id);
      if (result.success && result.data) {
        const updated = services.map((s) =>
          s.id === id ? { ...s, isActive: result.data!.isActive } : s
        );
        onServicesChange(updated);
        toast.success(
          result.data.isActive
            ? 'Service activated for online booking.'
            : 'Service deactivated.'
        );
      } else {
        toast.error(result.error || 'Failed to toggle service status.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingService) return;

    setIsDeleting(true);
    try {
      const result = await deleteService(deletingService.id);
      if (result.success) {
        const updated = services.filter((s) => s.id !== deletingService.id);
        onServicesChange(updated);
        toast.success(`Service "${deletingService.name}" deleted successfully.`);
        setDeletingService(null);
      } else {
        toast.error(result.error || 'Failed to delete service.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      if (remainingMins === 0) {
        return hours === 1 ? '1 hour' : `${hours} hours`;
      }
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins} mins`;
  };

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Search & Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search services by title or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-card border-border"
          />
        </div>

        {/* Plan Quota Badge & Add Service Button */}
        <div className="flex items-center gap-2.5 justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-card text-xs text-muted-foreground">
            <IconScissors size={14} className="text-primary shrink-0" />
            <span className="font-semibold text-foreground">Quota:</span>
            <span>
              {planQuota.max === -1
                ? `${services.length} (Unlimited)`
                : `${services.length}/${planQuota.max}`}
            </span>
          </div>

          <Button
            onClick={handleOpenAdd}
            className="rounded-xl font-semibold gap-1.5 h-10"
          >
            <IconPlus size={16} />
            <span>Add Service</span>
          </Button>
        </div>
      </div>

      {/* Category Filter Pills (Quick switcher for mobile & responsive comfort) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={cn(
            'px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer border',
            selectedCategoryId === null
              ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500 font-semibold'
              : 'bg-card text-muted-foreground hover:text-foreground border-border'
          )}
        >
          All Categories ({services.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer border',
              selectedCategoryId === cat.id
                ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500 font-semibold'
                : 'bg-card text-muted-foreground hover:text-foreground border-border'
            )}
          >
            {cat.name} ({cat.serviceCount})
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-xs text-foreground min-w-[200px]">
                Service Name
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground min-w-[130px]">
                Category
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground min-w-[110px]">
                Duration
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground min-w-[100px]">
                Price
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground min-w-[90px]">
                Free
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground min-w-[100px]">
                Status
              </TableHead>
              <TableHead className="text-right font-semibold text-xs text-foreground w-[70px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <IconScissors size={20} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      No services found
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {searchQuery
                        ? `No services match "${searchQuery}". Try a different keyword.`
                        : selectedCategoryObj
                          ? `No services in "${selectedCategoryObj.name}" yet.`
                          : 'Get started by creating your first service item.'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenAdd}
                      className="mt-2 rounded-xl text-xs gap-1"
                    >
                      <IconPlus size={14} />
                      <span>Add Service</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredServices.map((srv) => (
                <TableRow key={srv.id} className="hover:bg-muted/30 transition-colors">
                  {/* Service Name & Description */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/15">
                        <IconScissors size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {srv.name}
                        </p>
                        {srv.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {srv.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Category Badge */}
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className="rounded-md font-medium text-xs bg-muted/30 text-foreground"
                    >
                      {srv.categoryName}
                    </Badge>
                  </TableCell>

                  {/* Duration */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <IconClock size={14} className="shrink-0 text-muted-foreground/70" />
                      <span>{formatDuration(srv.durationMinutes)}</span>
                    </div>
                  </TableCell>

                  {/* Price */}
                  <TableCell className="py-3">
                    {srv.isFree || srv.price === 0 ? (
                      <Badge
                        variant="secondary"
                        className="rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border-0 text-[11px]"
                      >
                        Free
                      </Badge>
                    ) : (
                      <span className="text-sm font-bold text-foreground">
                        {currencySymbol}
                        {srv.price.toFixed(2)}
                      </span>
                    )}
                  </TableCell>

                  {/* Free Toggle Indicator */}
                  <TableCell className="py-3">
                    {srv.isFree ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <IconCheck size={14} />
                        <span>Yes</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <IconX size={14} />
                        <span>No</span>
                      </span>
                    )}
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell className="py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(srv.id)}
                      disabled={actionLoadingId === srv.id}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      title="Click to toggle availability"
                    >
                      {srv.isActive ? (
                        <Badge
                          variant="secondary"
                          className="rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] border-0 gap-1"
                        >
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-md text-muted-foreground text-[11px] gap-1"
                        >
                          <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                          <span>Inactive</span>
                        </Badge>
                      )}
                    </button>
                  </TableCell>

                  {/* Actions Dropdown */}
                  <TableCell className="py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                          disabled={actionLoadingId === srv.id}
                        >
                          <IconDotsVertical size={16} />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-xl">
                        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                          Service Options
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(srv)}
                          className="text-xs font-medium cursor-pointer gap-2"
                        >
                          <IconEdit size={14} className="text-muted-foreground" />
                          <span>Edit Service</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(srv.id)}
                          className="text-xs font-medium cursor-pointer gap-2"
                        >
                          <IconPower
                            size={14}
                            className={srv.isActive ? 'text-amber-500' : 'text-emerald-500'}
                          />
                          <span>{srv.isActive ? 'Deactivate' : 'Activate'}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingService(srv)}
                          className="text-xs font-medium text-destructive cursor-pointer gap-2 focus:text-destructive"
                        >
                          <IconTrash size={14} />
                          <span>Delete Service</span>
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

      <ServiceSheet
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        service={editingService}
        categories={categories}
        currencySymbol={currencySymbol}
        defaultCategoryId={selectedCategoryId}
        onSuccess={handleServiceSuccess}
      />

      <DeleteConfirmDialog
        open={Boolean(deletingService)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingService(null);
        }}
        title="Delete Service"
        description="Are you sure you want to delete this service? This action cannot be undone and will remove it from the online booking wizard."
        itemName={deletingService?.name}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
