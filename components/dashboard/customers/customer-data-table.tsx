'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { DeleteConfirmDialog } from '@/components/dashboard/services/delete-confirm-dialog';
import { CustomerSpendBadge } from './customer-spend-badge';
import { CustomerDetailsDrawer } from './customer-details-drawer';
import { CreateCustomerSheet } from './create-customer-sheet';
import { TablePaginationBar } from '@/components/shared/table-pagination-bar';
import {
  IconSearch,
  IconX,
  IconDownload,
  IconUserPlus,
  IconDotsVertical,
  IconTrash,
  IconEye,
  IconMail,
  IconPhone,
  IconCalendar,
  IconUsers,
  IconLoader2,
  IconCalendarEvent,
  IconRotateClockwise,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  deleteCompanyCustomerAction,
} from '@/actions/customer-crm';
import { exportCustomersCsvAction } from '@/actions/export';
import type { CustomerCRMItem } from '@/types/customer-crm';

interface CustomerDataTableProps {
  initialCustomers: CustomerCRMItem[];
  totalRecords: number;
  page?: number;
  limit?: number;
  search?: string;
  initialPage?: number;
  pageSize?: number;
}

function getInitials(name: string): string {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CustomerDataTable({
  initialCustomers,
  totalRecords,
  page: propPage,
  limit: propLimit,
  search: propSearch = '',
  initialPage = 1,
  pageSize = 10,
}: CustomerDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activePage = propPage ?? initialPage;
  const activeLimit = propLimit ?? pageSize;

  const [customers, setCustomers] = useState<CustomerCRMItem[]>(initialCustomers);
  const [total, setTotal] = useState(totalRecords);
  const [searchTerm, setSearchTerm] = useState(propSearch);
  const [isExporting, setIsExporting] = useState(false);

  // Synchronize state when server re-renders with new props
  const [prevInitialCustomers, setPrevInitialCustomers] = useState(initialCustomers);
  if (initialCustomers !== prevInitialCustomers) {
    setPrevInitialCustomers(initialCustomers);
    setCustomers(initialCustomers);
    setTotal(totalRecords);
  }

  // Inspection Drawer state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCRMItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Add Customer Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Deletion state
  const [customerToDelete, setCustomerToDelete] = useState<CustomerCRMItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : '');

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
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

  // Debounce search input
  useEffect(() => {
    if (searchTerm === propSearch) return;

    const timeout = setTimeout(() => {
      updateFilters({ search: searchTerm.trim() || null });
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchTerm, propSearch, updateFilters]);

  // CSV Export handler
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await exportCustomersCsvAction(searchTerm);
      if (res.success && res.data) {
        // Trigger browser download via Blob
        const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.filename || 'customers_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Customer CSV exported successfully.');
      } else {
        toast.error(res.error || 'Failed to export customer records.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error exporting CSV.';
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  // Safe Deletion Confirmation
  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);

    try {
      const res = await deleteCompanyCustomerAction(customerToDelete.id);

      if (res.success) {
        toast.success(res.message || 'Customer profile deleted.');
        setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
        setTotal((prev) => Math.max(0, prev - 1));
        setCustomerToDelete(null);
      } else {
        // Show safe backend deletion error toast (e.g. active upcoming booking)
        toast.error(res.error || 'Failed to delete customer.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error deleting customer.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCustomerCreated = (newCust: CustomerCRMItem) => {
    setCustomers((prev) => [newCust, ...prev]);
    setTotal((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Search Bar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <IconSearch
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or phone number..."
            className="!pl-10 pr-9 h-10 rounded-xl bg-background border-border text-xs focus-visible:ring-1 focus-visible:ring-primary"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                updateFilters({ search: null });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <IconX size={16} />
            </button>
          )}
          {isPending && !searchTerm && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <IconLoader2 size={16} className="animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            disabled={isExporting || total === 0}
            className="rounded-xl text-xs font-semibold gap-2 border-border/80 bg-background hover:bg-muted cursor-pointer"
          >
            {isExporting ? (
              <IconLoader2 size={15} className="animate-spin text-primary" />
            ) : (
              <IconDownload size={15} className="text-muted-foreground" />
            )}
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            onClick={() => setIsAddDialogOpen(true)}
            className="rounded-xl text-xs font-semibold gap-2 shadow-2xs cursor-pointer"
          >
            <IconUserPlus size={15} />
            <span>Add Customer</span>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 sm:px-6">Customer</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Gender & DOB</th>
                <th className="py-3.5 px-4 text-center">Total Visits</th>
                <th className="py-3.5 px-4 text-center">Completed</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4">Last Visit</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 px-6 sm:px-10 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto py-4 space-y-4">
                      <div className="size-14 rounded-2xl bg-muted/80 flex items-center justify-center text-muted-foreground border border-border/60 shadow-2xs">
                        <IconUsers size={28} />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <h3 className="font-bold text-base text-foreground">
                          {searchTerm ? 'No matching customers found' : 'No customers recorded yet'}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {searchTerm
                            ? `Try clearing your search query "${searchTerm}" or search with different keywords.`
                            : 'Add your first customer profile or allow customers to self-book online.'}
                        </p>
                      </div>
                      {searchTerm ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchTerm('');
                            updateFilters({ search: null });
                          }}
                          className="rounded-xl text-xs font-semibold gap-1.5 mt-2 cursor-pointer"
                        >
                          <IconRotateClockwise size={15} />
                          <span>Clear Search</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setIsAddDialogOpen(true)}
                          className="rounded-xl text-xs font-semibold gap-1.5 mt-2 shadow-2xs cursor-pointer"
                        >
                          <IconUserPlus size={15} />
                          <span>Add New Customer</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setIsDrawerOpen(true);
                    }}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    {/* Customer Info (Avatar + Name + Email) */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 rounded-xl border border-border/80 shadow-2xs shrink-0">
                          <AvatarImage src={cust.avatar} alt={cust.name} />
                          <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
                            {getInitials(cust.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors block truncate">
                            {cust.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                            <IconMail size={12} className="shrink-0" />
                            {cust.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact Phone */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-foreground flex items-center gap-1.5 whitespace-nowrap">
                        <IconPhone size={13} className="text-muted-foreground shrink-0" />
                        {cust.contact}
                      </span>
                    </td>

                    {/* Gender & DOB */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 whitespace-nowrap">
                        <span className="font-medium capitalize text-foreground block">
                          {cust.gender || <span className="text-muted-foreground italic font-normal">—</span>}
                        </span>
                        {cust.dob && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                            <IconCalendar size={11} />
                            {cust.dob}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Bookings */}
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="outline" className="rounded-lg text-xs font-semibold py-0.5 px-2">
                        {cust.totalAppointments}
                      </Badge>
                    </td>

                    {/* Completed Bookings */}
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={cust.completedAppointments > 0 ? 'secondary' : 'outline'}
                        className="rounded-lg text-xs font-semibold py-0.5 px-2"
                      >
                        {cust.completedAppointments}
                      </Badge>
                    </td>

                    {/* Total Spent */}
                    <td className="py-3.5 px-4">
                      <CustomerSpendBadge amount={cust.totalSpent} size="sm" />
                    </td>

                    {/* Last Visit Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {cust.lastAppointmentDate ? (
                        <div className="flex items-center gap-1 text-foreground font-medium">
                          <IconCalendarEvent size={13} className="text-muted-foreground" />
                          <span>{cust.lastAppointmentDate}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">No visits yet</span>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <IconDotsVertical size={16} />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl border-border bg-card">
                          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground">
                            Customer Options
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsDrawerOpen(true);
                            }}
                            className="text-xs cursor-pointer gap-2"
                          >
                            <IconEye size={14} />
                            <span>View History</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setCustomerToDelete(cust)}
                            className="text-xs cursor-pointer text-destructive focus:text-destructive gap-2"
                          >
                            <IconTrash size={14} />
                            <span>Delete Profile</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Bar */}
        <TablePaginationBar
          total={total}
          page={activePage}
          limit={activeLimit}
          noun="customers"
          syncToUrl={true}
        />
      </div>

      {/* Customer Appointment History Drawer */}
      <CustomerDetailsDrawer
        customer={selectedCustomer}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />

      {/* Add Customer Sheet */}
      <CreateCustomerSheet
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onCustomerCreated={handleCustomerCreated}
      />

      {/* Safe Deletion Guard Dialog */}
      <DeleteConfirmDialog
        open={!!customerToDelete}
        onOpenChange={(open) => !open && setCustomerToDelete(null)}
        title="Delete Customer Profile"
        description="Are you sure you want to remove this customer record? If they have upcoming active bookings, removal will be prevented."
        itemName={customerToDelete ? `${customerToDelete.name} (${customerToDelete.email})` : undefined}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
