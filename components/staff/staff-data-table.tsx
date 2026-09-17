'use client';

import React, { useMemo, useState } from 'react';
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
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
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
} from '@tabler/icons-react';
import {
  toggleStaffStatusAction,
  deleteStaffAction,
} from '@/actions/staff';
import type { StaffMemberDTO, StaffPlanQuota } from '@/types/staff';
import { StaffSheet } from './staff-sheet';
import { DeleteConfirmDialog } from '@/components/dashboard/services/delete-confirm-dialog';
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
  const [staffList, setStaffList] = useState<StaffMemberDTO[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocationId, setFilterLocationId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMemberDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMemberDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filter staff records
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

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
      if (filterLocationId !== 'all') {
        if (!stf.locationIds.includes(filterLocationId)) return false;
      }

      // Status filter
      if (filterStatus === 'active' && !stf.isActive) return false;
      if (filterStatus === 'inactive' && stf.isActive) return false;

      return true;
    });
  }, [staffList, searchQuery, filterLocationId, filterStatus]);

  // Pagination math
  const totalItems = filteredStaff.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedStaff = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, safeCurrentPage, pageSize]);

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
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search specialists, email, service..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-10 rounded-xl text-xs bg-card"
            />
          </div>

          {/* Location filter */}
          <Select
            value={filterLocationId}
            onValueChange={(val) => {
              setFilterLocationId(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-44 rounded-xl text-xs bg-card">
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
            value={filterStatus}
            onValueChange={(val: 'all' | 'active' | 'inactive') => {
              setFilterStatus(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-36 rounded-xl text-xs bg-card">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent data-theme="company">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
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
                <TableCell colSpan={6} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                    <IconAlertCircle size={28} className="text-muted-foreground/60" />
                    <p className="text-sm font-semibold text-foreground">No specialists found</p>
                    <p className="text-xs max-w-sm text-muted-foreground">
                      {searchQuery || filterLocationId !== 'all' || filterStatus !== 'all'
                        ? 'No staff members match the selected filters. Try clearing your search.'
                        : 'No specialists created yet. Click "Add Specialist" to get started.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Toolbar */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-theme="company">
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>
                Showing{' '}
                <strong className="text-foreground">
                  {(safeCurrentPage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-foreground">
                  {Math.min(safeCurrentPage * pageSize, totalItems)}
                </strong>{' '}
                of <strong className="text-foreground">{totalItems}</strong> specialists
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage <= 1}
                className="size-8 p-0 rounded-lg"
                title="First Page"
              >
                <IconChevronsLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="size-8 p-0 rounded-lg"
                title="Previous Page"
              >
                <IconChevronLeft size={16} />
              </Button>

              <div className="px-2 text-xs text-muted-foreground font-medium">
                Page <span className="text-foreground font-semibold">{safeCurrentPage}</span> of{' '}
                <span className="text-foreground font-semibold">{totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="size-8 p-0 rounded-lg"
                title="Next Page"
              >
                <IconChevronRight size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage >= totalPages}
                className="size-8 p-0 rounded-lg"
                title="Last Page"
              >
                <IconChevronsRight size={16} />
              </Button>
            </div>
          </div>
        )}
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
