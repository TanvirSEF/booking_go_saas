'use client';

import React, { useMemo, useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  IconAlertCircle,
  IconDotsVertical,
  IconEdit,
  IconMail,
  IconMapPin,
  IconPhone,
  IconPlus,
  IconScissors,
  IconSearch,
  IconTrash,
  IconUserCheck,
  IconUsers,
  IconX,
  IconRotateClockwise,
} from '@tabler/icons-react';
import {
  toggleStaffStatusAction,
  deleteStaffAction,
} from '@/actions/staff';
import type { StaffMemberDTO, StaffPlanQuota } from '@/types/staff';
import { StaffSheet } from './staff-sheet';
import { DeleteConfirmDialog } from '@/components/dashboard/services/delete-confirm-dialog';
import { TablePaginationBar } from '@/components/shared/table-pagination-bar';
import type { TagOption } from './staff-tag-picker';

export interface StaffDataTableProps {
  initialStaff: StaffMemberDTO[];
  locationOptions: TagOption[];
  serviceOptions: TagOption[];
  planQuota?: StaffPlanQuota;
}

export function StaffDataTable({
  initialStaff,
  locationOptions,
  serviceOptions,
  planQuota,
}: StaffDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlSearch = searchParams?.get('search') || '';
  const urlLocation = searchParams?.get('location') || 'all';
  const urlStatus = (searchParams?.get('status') as 'all' | 'active' | 'inactive') || 'all';
  const page = Math.max(1, parseInt(searchParams?.get('page') || '1', 10) || 1);
  const limit = Math.max(1, parseInt(searchParams?.get('limit') || '10', 10) || 10);

  const [staffList, setStaffList] = useState<StaffMemberDTO[]>(initialStaff);
  const [searchTerm, setSearchTerm] = useState(urlSearch);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMemberDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMemberDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : '');

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value.trim());
        } else {
          params.delete(key);
        }
      });

      params.set('page', '1');

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  // Debounce search term changes
  useEffect(() => {
    if (searchTerm === urlSearch) return;

    const timeout = setTimeout(() => {
      updateFilters({ search: searchTerm.trim() || null });
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchTerm, urlSearch, updateFilters]);

  // Filter staff records
  const filteredStaff = useMemo(() => {
    const q = urlSearch.toLowerCase().trim();

    return staffList.filter((stf) => {
      // Search filter
      const matchesSearch =
        !q ||
        stf.name.toLowerCase().includes(q) ||
        (stf.email && stf.email.toLowerCase().includes(q)) ||
        (stf.phone && stf.phone.toLowerCase().includes(q)) ||
        stf.locations.some((l) => l.name.toLowerCase().includes(q)) ||
        stf.services.some((s) => s.name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Location filter
      if (urlLocation !== 'all') {
        if (!stf.locationIds.includes(urlLocation)) return false;
      }

      // Status filter
      if (urlStatus === 'active' && !stf.isActive) return false;
      if (urlStatus === 'inactive' && stf.isActive) return false;

      return true;
    });
  }, [staffList, urlSearch, urlLocation, urlStatus]);

  // Pagination math
  const totalItems = filteredStaff.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safeCurrentPage = Math.min(page, totalPages);

  const paginatedStaff = useMemo(() => {
    const start = (safeCurrentPage - 1) * limit;
    return filteredStaff.slice(start, start + limit);
  }, [filteredStaff, safeCurrentPage, limit]);

  // Handlers
  const handleOpenAdd = () => {
    setSelectedStaff(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (stf: StaffMemberDTO) => {
    setSelectedStaff(stf);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (stf: StaffMemberDTO) => {
    setActionLoadingId(stf._id);
    try {
      const res = await toggleStaffStatusAction(stf._id);
      if (res.success && res.data) {
        setStaffList((prev) =>
          prev.map((item) =>
            item._id === stf._id ? { ...item, isActive: res.data!.isActive } : item
          )
        );
        toast.success(
          res.data.isActive
            ? `Specialist "${stf.name}" is now active.`
            : `Specialist "${stf.name}" has been deactivated.`
        );
      } else {
        toast.error(res.error || 'Failed to update specialist status.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await deleteStaffAction(deleteTarget._id);
      if (res.success) {
        setStaffList((prev) => prev.filter((item) => item._id !== deleteTarget._id));
        toast.success(`Specialist "${deleteTarget.name}" deleted.`);
        setDeleteTarget(null);
      } else {
        toast.error(res.error || 'Failed to delete specialist.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStaffSaved = (saved: StaffMemberDTO) => {
    setStaffList((prev) => {
      const index = prev.findIndex((s) => s._id === saved._id);
      // Hydrate populated location and service names from current options
      const hydrated: StaffMemberDTO = {
        ...saved,
        locations: saved.locationIds.map((id) => {
          const opt = locationOptions.find((l) => l.id === id);
          return { _id: id, name: opt?.name || 'Assigned Branch' };
        }),
        services: saved.serviceIds.map((id) => {
          const opt = serviceOptions.find((s) => s.id === id);
          return { _id: id, name: opt?.name || 'Assigned Service' };
        }),
      };

      if (index >= 0) {
        const next = [...prev];
        next[index] = hydrated;
        return next;
      }
      return [hydrated, ...prev];
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto">
          {/* Search input */}
          <div className="relative w-full sm:w-72">
            <IconSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Search specialists, email, service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 h-10 rounded-xl text-xs bg-card"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  updateFilters({ search: null });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                <IconX size={15} />
              </button>
            )}
          </div>

          {/* Location filter */}
          <Select
            value={urlLocation}
            onValueChange={(val) => {
              updateFilters({ location: val === 'all' ? null : val });
            }}
          >
            <SelectTrigger className="h-10 w-44 rounded-xl text-xs bg-card cursor-pointer">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent data-theme="company">
              <SelectItem value="all">All Locations</SelectItem>
              {locationOptions.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select
            value={urlStatus}
            onValueChange={(val) => {
              updateFilters({ status: val === 'all' ? null : val });
            }}
          >
            <SelectTrigger className="h-10 w-36 rounded-xl text-xs bg-card cursor-pointer">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent data-theme="company">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters button */}
          {(urlSearch || urlLocation !== 'all' || urlStatus !== 'all') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                startTransition(() => {
                  router.push(pathname);
                });
              }}
              disabled={isPending}
              className="h-10 rounded-xl text-xs gap-1.5 border-dashed hover:border-solid cursor-pointer"
            >
              <IconRotateClockwise size={14} className={isPending ? 'animate-spin' : ''} />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* Quota info and Add button */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {planQuota && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-xl border border-border">
              <IconUsers size={15} className="text-primary shrink-0" />
              <span>
                Staff Quota:{' '}
                <strong className="text-foreground font-semibold">
                  {planQuota.current} / {planQuota.max === -1 ? 'Unlimited' : planQuota.max}
                </strong>
              </span>
            </div>
          )}

          <Button
            onClick={handleOpenAdd}
            className="rounded-xl flex items-center gap-1.5 shadow-sm font-semibold text-xs h-10"
          >
            <IconPlus size={16} />
            <span>Add Specialist</span>
          </Button>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
              <TableHead className="w-[280px] font-semibold text-xs">Specialist</TableHead>
              <TableHead className="font-semibold text-xs">Assigned Locations</TableHead>
              <TableHead className="font-semibold text-xs">Assigned Services</TableHead>
              <TableHead className="font-semibold text-xs w-[120px]">Color Code</TableHead>
              <TableHead className="font-semibold text-xs w-[110px]">Status</TableHead>
              <TableHead className="text-right font-semibold text-xs w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStaff.length > 0 ? (
              paginatedStaff.map((stf) => {
                const isLoading = actionLoadingId === stf._id;
                const initials = stf.name
                  .split(' ')
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'SP';

                return (
                  <TableRow key={stf._id} className="transition-colors hover:bg-muted/30 border-b border-border">
                    {/* Specialist Name & Contact */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            borderColor: stf.colorCode || '#CEEDC1',
                            backgroundColor: `${stf.colorCode || '#CEEDC1'}25`,
                          }}
                          className="size-10 rounded-full flex items-center justify-center shrink-0 border-2 font-bold text-xs text-foreground shadow-2xs"
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {stf.name}
                            </p>
                            {stf.userId && (
                              <IconUserCheck
                                size={14}
                                className="text-primary shrink-0"
                                title="Linked login user"
                              />
                            )}
                          </div>
                          {stf.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate mt-0.5">
                              <IconMail size={12} className="shrink-0" />
                              <span className="truncate">{stf.email}</span>
                            </div>
                          )}
                          {stf.phone && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 truncate">
                              <IconPhone size={11} className="shrink-0" />
                              <span>{stf.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Assigned Locations (Badges) */}
                    <TableCell>
                      {stf.locations && stf.locations.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {stf.locations.map((loc) => (
                            <Badge
                              key={loc._id}
                              variant="outline"
                              className="text-[11px] font-medium gap-1 py-0.5 px-2 rounded-md bg-muted/30 border-border"
                            >
                              <IconMapPin size={11} className="text-primary shrink-0" />
                              <span className="truncate max-w-[130px]">{loc.name}</span>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          All locations
                        </span>
                      )}
                    </TableCell>

                    {/* Assigned Services (Badges) */}
                    <TableCell>
                      {stf.services && stf.services.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {stf.services.slice(0, 3).map((svc) => (
                            <Badge
                              key={svc._id}
                              variant="secondary"
                              className="text-[11px] font-medium gap-1 py-0.5 px-2 rounded-md bg-primary/10 text-primary border-primary/20"
                            >
                              <IconScissors size={11} className="shrink-0" />
                              <span className="truncate max-w-[130px]">{svc.name}</span>
                            </Badge>
                          ))}
                          {stf.services.length > 3 && (
                            <Badge
                              variant="secondary"
                              className="text-[11px] py-0.5 px-1.5 rounded-md bg-muted text-muted-foreground"
                            >
                              +{stf.services.length - 3} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          All services
                        </span>
                      )}
                    </TableCell>

                    {/* Color Code indicator */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          style={{ backgroundColor: stf.colorCode || '#CEEDC1' }}
                          className="size-4 rounded-full border border-black/15 shrink-0 shadow-2xs"
                        />
                        <span className="text-xs font-mono text-muted-foreground uppercase">
                          {stf.colorCode || '#CEEDC1'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Active Status Switch */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={stf.isActive}
                          disabled={isLoading}
                          onCheckedChange={() => handleToggleStatus(stf)}
                          aria-label={`Toggle active state for ${stf.name}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {stf.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isLoading}
                            className="h-8 w-8 p-0 rounded-lg"
                          >
                            <IconDotsVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" data-theme="company" className="w-44">
                          <DropdownMenuLabel className="text-xs">Specialist Options</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(stf)}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <IconEdit size={14} />
                            <span>Edit Specialist</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(stf)}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <IconUserCheck size={14} />
                            <span>{stf.isActive ? 'Deactivate' : 'Activate'}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(stf)}
                            className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                          >
                            <IconTrash size={14} />
                            <span>Delete Specialist</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-3 py-6">
                    <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground border border-border/60">
                      <IconAlertCircle size={24} />
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-sm font-semibold text-foreground">No specialists found</p>
                      <p className="text-xs max-w-sm text-muted-foreground">
                        {urlSearch || urlLocation !== 'all' || urlStatus !== 'all'
                          ? 'No staff members match the selected filters. Try clearing or resetting your filters.'
                          : 'No specialists created yet. Click "Add Specialist" to get started.'}
                      </p>
                    </div>
                    {urlSearch || urlLocation !== 'all' || urlStatus !== 'all' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm('');
                          startTransition(() => {
                            router.push(pathname);
                          });
                        }}
                        className="rounded-xl text-xs gap-1.5 mt-1 cursor-pointer"
                      >
                        <IconRotateClockwise size={14} />
                        <span>Reset Filters</span>
                      </Button>
                    ) : (
                      <Button
                        onClick={handleOpenAdd}
                        size="sm"
                        className="rounded-xl text-xs font-semibold gap-1.5 mt-1 cursor-pointer"
                      >
                        <IconPlus size={14} />
                        <span>Add Specialist</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Unified Table Pagination Bar */}
        <TablePaginationBar
          total={totalItems}
          page={safeCurrentPage}
          limit={limit}
          noun="specialists"
          syncToUrl={true}
        />
      </div>

      {/* Add / Edit Specialist Sheet */}
      <StaffSheet
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        staff={selectedStaff}
        locationOptions={locationOptions}
        serviceOptions={serviceOptions}
        onSuccess={handleStaffSaved}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Specialist"
        description="Are you sure you want to delete this specialist? This action cannot be undone. Specialists with future upcoming appointments cannot be deleted."
        itemName={deleteTarget?.name}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
