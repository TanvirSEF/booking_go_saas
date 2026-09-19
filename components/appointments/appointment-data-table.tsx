'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  IconDotsVertical,
  IconClock,
  IconCalendar,
  IconMail,
  IconPhone,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
  IconCalendarOff,
  IconX,
  IconCircleCheck,
  IconRotateClockwise,
} from '@tabler/icons-react';
import { AppointmentTableFilters, type StaffFilterOption } from './appointment-table-filters';
import { AppointmentStatusDialog } from './appointment-status-dialog';
import { AppointmentRescheduleDialog } from './appointment-reschedule-dialog';
import { AppointmentCancelDialog } from './appointment-cancel-dialog';
import type { AppointmentListItem } from '@/types/appointment-query';

interface AppointmentDataTableProps {
  appointments: AppointmentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  staffList: StaffFilterOption[];
  currencySymbol?: string;
  filters: {
    search?: string;
    status?: string;
    staffId?: string;
    startDate?: string;
    endDate?: string;
  };
}

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
    case 'completed':
      return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800';
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
    case 'pending':
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
  }
}

export function AppointmentDataTable({
  appointments,
  total,
  page,
  limit,
  totalPages,
  staffList,
  currencySymbol = '$',
  filters,
}: AppointmentDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [statusDialogApt, setStatusDialogApt] = useState<AppointmentListItem | null>(null);
  const [rescheduleDialogApt, setRescheduleDialogApt] = useState<AppointmentListItem | null>(null);
  const [cancelDialogApt, setCancelDialogApt] = useState<AppointmentListItem | null>(null);

  const navigateToPage = (newPage: number) => {
    if (newPage < 1 || (totalPages > 0 && newPage > totalPages) || newPage === page) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const changeLimit = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', newLimit);
    params.set('page', '1');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="space-y-4">
      {/* Filters & Search Toolbar */}
      <AppointmentTableFilters
        staffList={staffList}
        currentSearch={filters.search}
        currentStatus={filters.status}
        currentStaffId={filters.staffId}
        currentStartDate={filters.startDate}
        currentEndDate={filters.endDate}
      />

      {/* Main Table Container */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] font-semibold text-xs text-foreground">
                  Appointment #
                </TableHead>
                <TableHead className="min-w-[180px] font-semibold text-xs text-foreground">
                  Customer
                </TableHead>
                <TableHead className="min-w-[180px] font-semibold text-xs text-foreground">
                  Service & Duration
                </TableHead>
                <TableHead className="min-w-[150px] font-semibold text-xs text-foreground">
                  Specialist
                </TableHead>
                <TableHead className="min-w-[150px] font-semibold text-xs text-foreground">
                  Date & Time
                </TableHead>
                <TableHead className="min-w-[140px] font-semibold text-xs text-foreground">
                  Price & Payment
                </TableHead>
                <TableHead className="w-[110px] font-semibold text-xs text-foreground text-center">
                  Status
                </TableHead>
                <TableHead className="w-[70px] text-right font-semibold text-xs text-foreground pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2.5">
                      <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                        <IconCalendarOff size={24} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-foreground">
                          No appointments found
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          We couldn&apos;t find any bookings matching your current filter criteria.
                        </p>
                      </div>
                      {(filters.search || filters.status || filters.staffId || filters.startDate || filters.endDate) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(pathname)}
                          className="text-xs h-8 cursor-pointer mt-1 gap-1.5"
                        >
                          <IconRotateClockwise size={13} />
                          <span>Reset Filters</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((apt) => (
                  <TableRow
                    key={apt.id}
                    className="transition-colors hover:bg-muted/30 group"
                  >
                    {/* Appointment # */}
                    <TableCell className="font-medium">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs font-bold bg-muted/50 text-foreground border-border tracking-wider"
                      >
                        {apt.appointmentNumber}
                      </Badge>
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-semibold text-sm text-foreground">
                          {apt.customerName}
                        </div>
                        {apt.customerEmail && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <IconMail size={13} className="shrink-0 text-muted-foreground/80" />
                            <span className="truncate max-w-[160px]">{apt.customerEmail}</span>
                          </div>
                        )}
                        {apt.customerContact && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <IconPhone size={13} className="shrink-0 text-muted-foreground/80" />
                            <span>{apt.customerContact}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Service & Duration */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm text-foreground">
                          {apt.serviceName}
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-[11px] font-normal px-2 py-0 h-5 inline-flex items-center gap-1 bg-secondary text-secondary-foreground"
                        >
                          <IconClock size={11} />
                          <span>{apt.durationMinutes || 30} min</span>
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Specialist */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 border border-border">
                          <AvatarFallback
                            className="text-xs font-bold text-foreground"
                            style={{
                              backgroundColor: apt.staffColor ? `${apt.staffColor}30` : undefined,
                            }}
                          >
                            {getInitials(apt.staffName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {apt.staffName}
                          </div>
                          {apt.locationName && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {apt.locationName}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Date & Time */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <IconCalendar size={13} className="text-primary shrink-0" />
                          <span>{apt.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                          <IconClock size={13} className="shrink-0 text-muted-foreground/80" />
                          <span>{apt.time}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Total Price & Payment Status */}
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-sm text-foreground">
                          {currencySymbol}
                          {apt.servicePrice.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`size-1.5 rounded-full shrink-0 ${
                              apt.paymentStatus === 'completed' || apt.paymentStatus === 'paid'
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span className="text-[11px] font-medium capitalize text-muted-foreground">
                            {apt.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium px-2.5 py-0.5 border ${getStatusBadgeClass(apt.status)}`}
                      >
                        {apt.status}
                      </Badge>
                    </TableCell>

                    {/* Row Actions Dropdown */}
                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 cursor-pointer hover:bg-muted"
                            aria-label={`Actions for appointment ${apt.appointmentNumber}`}
                          >
                            <IconDotsVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                            Appointment #{apt.appointmentNumber}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setStatusDialogApt(apt)}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <IconCircleCheck size={15} className="text-primary" />
                            <span>Change Status</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setRescheduleDialogApt(apt)}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <IconRefresh size={15} className="text-primary" />
                            <span>Reschedule</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setCancelDialogApt(apt)}
                            className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                          >
                            <IconX size={15} />
                            <span>Cancel Appointment</span>
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

        {/* Server-Side Pagination & Record Counters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-foreground">{startRecord}</strong> to{' '}
              <strong className="text-foreground">{endRecord}</strong> of{' '}
              <strong className="text-foreground">{total}</strong> appointments
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Rows per page:</span>
              <Select value={String(limit)} onValueChange={changeLimit}>
                <SelectTrigger className="h-8 w-16 text-xs bg-background cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Prev / Next Pagination Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8 cursor-pointer"
                disabled={page <= 1 || isPending}
                onClick={() => navigateToPage(page - 1)}
                aria-label="Previous page"
              >
                <IconChevronLeft size={16} />
              </Button>
              <span className="text-xs font-medium px-1 text-foreground">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8 cursor-pointer"
                disabled={page >= totalPages || isPending}
                onClick={() => navigateToPage(page + 1)}
                aria-label="Next page"
              >
                <IconChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Dialog */}
      {statusDialogApt && (
        <AppointmentStatusDialog
          key={statusDialogApt.id}
          isOpen={Boolean(statusDialogApt)}
          onClose={() => setStatusDialogApt(null)}
          appointmentId={statusDialogApt.id}
          appointmentNumber={statusDialogApt.appointmentNumber}
          customerName={statusDialogApt.customerName}
          currentStatus={statusDialogApt.status}
        />
      )}

      {/* Reschedule Dialog */}
      {rescheduleDialogApt && (
        <AppointmentRescheduleDialog
          key={rescheduleDialogApt.id}
          isOpen={Boolean(rescheduleDialogApt)}
          onClose={() => setRescheduleDialogApt(null)}
          appointmentId={rescheduleDialogApt.id}
          appointmentNumber={rescheduleDialogApt.appointmentNumber}
          customerName={rescheduleDialogApt.customerName}
          serviceName={rescheduleDialogApt.serviceName}
          currentDate={rescheduleDialogApt.date}
          currentTime={rescheduleDialogApt.time}
          currentStaffId={rescheduleDialogApt.staffId}
          staffName={rescheduleDialogApt.staffName}
          staffList={staffList}
          businessId={rescheduleDialogApt.businessId}
          serviceId={rescheduleDialogApt.serviceId}
        />
      )}

      {/* Cancel Dialog */}
      {cancelDialogApt && (
        <AppointmentCancelDialog
          key={cancelDialogApt.id}
          isOpen={Boolean(cancelDialogApt)}
          onClose={() => setCancelDialogApt(null)}
          appointmentId={cancelDialogApt.id}
          appointmentNumber={cancelDialogApt.appointmentNumber}
          customerName={cancelDialogApt.customerName}
        />
      )}
    </div>
  );
}
