'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  IconSearch,
  IconX,
  IconCalendar,
  IconRotateClockwise,
  IconTrash,
  IconCopy,
  IconCheck,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconDevices,
  IconShieldOff,
  IconAlertTriangle,
  IconLoader2,
  IconFilter,
} from '@tabler/icons-react';
import { TablePaginationBar } from '@/components/shared/table-pagination-bar';
import { toast } from 'sonner';
import { deleteLoginLogAction } from '@/actions/login-detail';
import type { LoginDetailDTO } from '@/types/login-detail';

interface LoginAuditTableProps {
  logs: LoginDetailDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isSuperAdmin?: boolean;
  filters: {
    search?: string;
    startDate?: string;
    endDate?: string;
    role?: string;
  };
}

function getInitials(name?: string, email?: string): string {
  const str = name || email || 'User';
  const parts = str.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTimestamp(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

function getDeviceIcon(deviceType: string) {
  switch (deviceType.toLowerCase()) {
    case 'mobile':
      return <IconDeviceMobile size={16} className="text-emerald-600 dark:text-emerald-400" />;
    case 'tablet':
      return <IconDeviceTablet size={16} className="text-purple-600 dark:text-purple-400" />;
    case 'desktop':
      return <IconDeviceDesktop size={16} className="text-blue-600 dark:text-blue-400" />;
    default:
      return <IconDevices size={16} className="text-muted-foreground" />;
  }
}

function getRoleBadgeClass(role: string): string {
  switch (role.toLowerCase()) {
    case 'super admin':
      return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800';
    case 'company':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
    case 'staff':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
    case 'customer':
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
  }
}

export function LoginAuditTable({
  logs,
  total,
  page,
  limit,
  totalPages,
  isSuperAdmin = false,
  filters,
}: LoginAuditTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Deletion modal state
  const [deletingLog, setDeletingLog] = useState<LoginDetailDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value);
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

  // Debounced search
  useEffect(() => {
    if (searchTerm === (filters.search || '')) return;

    const timeout = setTimeout(() => {
      updateFilters({ search: searchTerm.trim() || null });
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchTerm, filters.search, updateFilters]);

  const handleStartDateChange = (val: string) => {
    updateFilters({ startDate: val || null });
  };

  const handleEndDateChange = (val: string) => {
    updateFilters({ endDate: val || null });
  };

  const handleRoleChange = (val: string) => {
    updateFilters({ role: val === 'all' ? null : val });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    toast.success(`IP address ${ip} copied to clipboard.`);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const confirmDelete = async () => {
    if (!deletingLog) return;

    setIsDeleting(true);
    try {
      const res = await deleteLoginLogAction(deletingLog.id);
      if (res.success) {
        toast.success(res.message || 'Login log deleted successfully.');
        setDeletingLog(null);
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(res.error || 'Failed to delete login log.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    Boolean(filters.search) ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    (Boolean(filters.role) && filters.role !== 'all');

  return (
    <div className="space-y-4">
      {/* Filter Toolbar adhering to Rule 10 */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Real-time search */}
        <div className="relative flex-1 min-w-[240px]">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            id="security-search-input"
            type="text"
            placeholder="Search by IP, user, browser, or OS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 h-9 text-xs bg-background border-input transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                updateFilters({ search: null });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <IconX size={15} />
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter (Visible to Super Admin or Company Admin) */}
          <div className="w-[130px] sm:w-[150px]">
            <Select
              value={filters.role || 'all'}
              onValueChange={handleRoleChange}
            >
              <SelectTrigger className="h-9 text-xs bg-background border-input cursor-pointer">
                <div className="flex items-center gap-1.5 truncate">
                  <IconFilter size={14} className="text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Roles" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {isSuperAdmin && (
                  <SelectItem value="super admin">Super Admin</SelectItem>
                )}
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-1.5 bg-background border border-input rounded-md px-2.5 h-9 shadow-2xs">
            <IconCalendar size={14} className="text-muted-foreground shrink-0" />
            <input
              type="date"
              aria-label="Start Date"
              value={filters.startDate || ''}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="text-xs bg-transparent border-0 text-foreground focus:outline-hidden w-[105px] cursor-pointer"
              title="Start Date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              aria-label="End Date"
              value={filters.endDate || ''}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="text-xs bg-transparent border-0 text-foreground focus:outline-hidden w-[105px] cursor-pointer"
              title="End Date"
            />
            {(filters.startDate || filters.endDate) && (
              <button
                type="button"
                onClick={() => {
                  updateFilters({ startDate: null, endDate: null });
                }}
                className="text-muted-foreground hover:text-foreground transition-colors ml-0.5 cursor-pointer"
                title="Clear dates"
              >
                <IconX size={13} />
              </button>
            )}
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              disabled={isPending}
              className="h-9 text-xs gap-1.5 border-dashed hover:border-solid cursor-pointer"
            >
              <IconRotateClockwise
                size={13}
                className={isPending ? 'animate-spin' : ''}
              />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Standard Table Shell */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[180px] font-semibold text-xs text-foreground pl-4">
                  Device & Browser
                </TableHead>
                <TableHead className="min-w-[180px] font-semibold text-xs text-foreground">
                  User
                </TableHead>
                <TableHead className="w-[110px] font-semibold text-xs text-foreground text-center">
                  Role
                </TableHead>
                <TableHead className="min-w-[140px] font-semibold text-xs text-foreground">
                  IP Address
                </TableHead>
                <TableHead className="min-w-[160px] font-semibold text-xs text-foreground">
                  Timestamp
                </TableHead>
                <TableHead className="w-[90px] font-semibold text-xs text-foreground text-center">
                  Status
                </TableHead>
                <TableHead className="w-[60px] text-right font-semibold text-xs text-foreground pr-4">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2.5">
                      <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                        <IconShieldOff size={24} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-foreground">
                          No login records found
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {hasActiveFilters
                            ? 'No login audit sessions match your current filter parameters.'
                            : 'No security login events have been recorded yet.'}
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          disabled={isPending}
                          className="text-xs h-8 cursor-pointer mt-1 gap-1.5"
                        >
                          <IconRotateClockwise
                            size={13}
                            className={isPending ? 'animate-spin' : ''}
                          />
                          <span>Reset Filters</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.status === 'success';

                  return (
                    <TableRow
                      key={log.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      {/* Device & Browser */}
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 border border-border">
                            {getDeviceIcon(log.deviceType)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">
                              {log.browser}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {log.os} •{' '}
                              <span className="capitalize">{log.deviceType}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* User Info */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7 border border-border shrink-0">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {getInitials(log.userName, log.userEmail)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">
                              {log.userName || 'Account User'}
                            </div>
                            {log.userEmail && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                {log.userEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0 h-5 border ${getRoleBadgeClass(log.role)}`}
                        >
                          {log.role}
                        </Badge>
                      </TableCell>

                      {/* IP Address */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-foreground">
                            {log.ip}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyIp(log.ip)}
                            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Copy IP"
                            aria-label={`Copy IP ${log.ip}`}
                          >
                            {copiedIp === log.ip ? (
                              <IconCheck size={12} className="text-emerald-500" />
                            ) : (
                              <IconCopy size={12} />
                            )}
                          </Button>
                        </div>
                        {(log.city || log.country) && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {[log.city, log.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {formatTimestamp(log.loginAt)}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium px-2 py-0 h-5 border ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                          }`}
                        >
                          {isSuccess ? 'Success' : 'Failed'}
                        </Badge>
                      </TableCell>

                      {/* Delete Action */}
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingLog(log)}
                          className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Delete Log"
                          aria-label="Delete login log"
                        >
                          <IconTrash size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Unified Pagination Bar adhering to Rule 10 */}
        <TablePaginationBar
          total={total}
          page={page}
          limit={limit}
          totalPages={totalPages}
          noun="logs"
          pageSizeOptions={[10, 25, 50]}
        />
      </div>

      {/* Single Delete Confirmation Modal */}
      <Dialog
        open={Boolean(deletingLog)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingLog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <IconAlertTriangle size={20} />
              <DialogTitle>Delete Login Record</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Are you sure you want to delete this security audit entry for IP{' '}
              <strong className="text-foreground">{deletingLog?.ip}</strong>?
              This record will be permanently purged from the audit trail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingLog(null)}
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
                  <span>Delete Record</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
