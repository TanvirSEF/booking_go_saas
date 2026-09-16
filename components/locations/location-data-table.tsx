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
  IconMapPin,
  IconPhone,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconPower,
  IconBuilding,
  IconAlertCircle,
} from '@tabler/icons-react';
import {
  type LocationItem,
  toggleLocationStatus,
  deleteLocation,
} from '@/actions/location';
import { LocationDialog } from './location-dialog';

export interface PlanQuotaInfo {
  current: number;
  max: number;
  allowed: boolean;
}

export interface LocationDataTableProps {
  initialLocations: LocationItem[];
  planQuota: PlanQuotaInfo;
}

export function LocationDataTable({
  initialLocations,
  planQuota,
}: LocationDataTableProps) {
  const [locations, setLocations] = useState<LocationItem[]>(initialLocations);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const filteredLocations = locations.filter((loc) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      loc.name.toLowerCase().includes(query) ||
      loc.address.toLowerCase().includes(query) ||
      loc.phone.toLowerCase().includes(query)
    );
  });

  const handleOpenAddDialog = () => {
    setSelectedLocation(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (loc: LocationItem) => {
    setSelectedLocation(loc);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (id: string) => {
    setActionLoadingId(id);
    try {
      const result = await toggleLocationStatus(id);
      if (result.success && result.data) {
        setLocations((prev) =>
          prev.map((loc) =>
            loc.id === id ? { ...loc, isActive: result.data!.isActive } : loc
          )
        );
        toast.success(
          result.data.isActive
            ? 'Location activated for bookings.'
            : 'Location deactivated.'
        );
      } else {
        toast.error(result.error || 'Failed to toggle location status.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setActionLoadingId(id);
    try {
      const result = await deleteLocation(id);
      if (result.success) {
        setLocations((prev) => prev.filter((loc) => loc.id !== id));
        toast.success(`"${name}" deleted successfully.`);
      } else {
        toast.error(result.error || 'Failed to delete location.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Quota Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search branches or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>

        {/* Action Button & Quota Info */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Plan Quota Badge */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-xl border">
            <IconBuilding size={15} className="text-primary shrink-0" />
            <span>
              Capacity:{' '}
              <strong className="text-foreground font-semibold">
                {planQuota.current} / {planQuota.max === -1 ? 'Unlimited' : planQuota.max}
              </strong>
            </span>
          </div>

          <Button
            onClick={handleOpenAddDialog}
            className="rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <IconPlus size={16} />
            <span>Add Location</span>
          </Button>
        </div>
      </div>

      {/* Locations Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[260px] font-semibold text-xs">Branch Name</TableHead>
              <TableHead className="font-semibold text-xs">Address</TableHead>
              <TableHead className="font-semibold text-xs">Contact Phone</TableHead>
              <TableHead className="font-semibold text-xs">Status</TableHead>
              <TableHead className="text-right font-semibold text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc) => {
                const isLoading = actionLoadingId === loc.id;
                return (
                  <TableRow key={loc.id} className="transition-colors">
                    {/* Name */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                          <IconMapPin size={16} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{loc.name}</p>
                          {loc.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {loc.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Address */}
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="line-clamp-2">{loc.address || '—'}</span>
                    </TableCell>

                    {/* Phone */}
                    <TableCell className="text-xs text-muted-foreground">
                      {loc.phone ? (
                        <div className="flex items-center gap-1.5">
                          <IconPhone size={13} className="text-muted-foreground/80" />
                          <span>{loc.phone}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {loc.isActive ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium text-[11px]"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-muted text-muted-foreground font-medium text-[11px]"
                        >
                          Inactive
                        </Badge>
                      )}
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
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-xs">Location Options</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleOpenEditDialog(loc)}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <IconEdit size={14} />
                            <span>Edit Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(loc.id)}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <IconPower size={14} />
                            <span>{loc.isActive ? 'Deactivate' : 'Activate'}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(loc.id, loc.name)}
                            className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                          >
                            <IconTrash size={14} />
                            <span>Delete Branch</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                    <IconAlertCircle size={28} className="text-muted-foreground/60" />
                    <p className="text-sm font-medium">No locations found</p>
                    <p className="text-xs max-w-sm">
                      {searchQuery
                        ? 'No branches match your search query. Try clearing the filter.'
                        : 'You haven’t created any branches yet. Click "Add Location" to get started.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Modal Dialog */}
      <LocationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        location={selectedLocation}
        onSuccess={(savedItem) => {
          if (savedItem) {
            setLocations((prev) => {
              const exists = prev.some((l) => l.id === savedItem.id);
              if (exists) {
                return prev.map((l) => (l.id === savedItem.id ? savedItem : l));
              }
              return [savedItem, ...prev];
            });
          }
        }}
      />
    </div>
  );
}
