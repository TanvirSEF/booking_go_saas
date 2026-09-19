"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconSearch,
  IconCalendar,
  IconClock,
  IconBuildingBank,
  IconReceipt,
  IconChevronLeft,
  IconChevronRight,
  IconCalendarEvent,
  IconRefresh,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AppointmentStatusBadge,
  PaymentStatusBadge,
} from "@/components/dashboard/appointments/appointment-status-badge";
import { VerifySlipModal } from "@/components/dashboard/appointments/verify-slip-modal";
import {
  getCompanyAppointmentsAction,
  updateAppointmentStatusAction,
} from "@/actions/appointment-management";
import type {
  AdminAppointmentDTO,
  AppointmentListResponse,
} from "@/types/appointment-management";

interface AppointmentsTableProps {
  initialData: AppointmentListResponse;
}

type StatusTab = "all" | "pending" | "confirmed" | "completed" | "cancelled";

export function AppointmentsTable({ initialData }: AppointmentsTableProps) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AdminAppointmentDTO[]>(
    initialData.data || []
  );
  const [pagination, setPagination] = useState(
    initialData.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }
  );
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedSlipAppointment, setSelectedSlipAppointment] =
    useState<AdminAppointmentDTO | null>(null);

  const fetchAppointments = (
    page = pagination.page,
    status = activeTab,
    search = searchQuery
  ) => {
    startTransition(async () => {
      try {
        const res = await getCompanyAppointmentsAction({
          page,
          limit: 10,
          status: status === "all" ? undefined : status,
          search: search.trim() || undefined,
        });

        if (res.success && res.data) {
          setAppointments(res.data);
          if (res.pagination) setPagination(res.pagination);
        } else {
          toast.error(res.error || "Failed to filter appointments.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load appointments.");
      }
    });
  };

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    fetchAppointments(1, tab, searchQuery);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAppointments(1, activeTab, searchQuery);
  };

  const handleStatusChange = async (
    appointmentId: string,
    status: "Pending" | "Confirmed" | "Completed" | "Cancelled"
  ) => {
    try {
      const res = await updateAppointmentStatusAction(appointmentId, status);
      if (res.success) {
        toast.success(res.message || `Status updated to ${status}`);
        setAppointments((prev) =>
          prev.map((apt) =>
            apt._id === appointmentId ? { ...apt, appointmentStatus: status } : apt
          )
        );
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update status.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update appointment status.");
    }
  };

  const statusTabs: { id: StatusTab; label: string }[] = [
    { id: "all", label: "All Bookings" },
    { id: "pending", label: "Pending Approval" },
    { id: "confirmed", label: "Confirmed" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-4">
      {/* Top Controls: Search + Tab Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar + Calendar Link */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-72">
            <IconSearch className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, email, ref..."
              className="pl-9 h-9 text-xs"
            />
          </form>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs shrink-0"
          >
            <Link href="/dashboard/appointments/calendar">
              <IconCalendarEvent className="w-4 h-4 text-primary" />
              Calendar
            </Link>
          </Button>
        </div>
      </div>

      {/* Appointments Data Table */}
      <Card className="border-border/60 bg-card text-card-foreground shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[140px] text-xs font-bold uppercase text-muted-foreground">
                    Reference
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground">
                    Customer
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground">
                    Service & Specialist
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground">
                    Date & Time
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground">
                    Payment
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isPending ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                        <IconRefresh className="w-5 h-5 animate-spin text-primary" />
                        <span>Updating appointment records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <IconCalendar className="w-8 h-8 text-muted-foreground/50 mb-1" />
                        <p className="font-semibold text-foreground text-base">
                          No appointments found
                        </p>
                        <p className="text-xs max-w-sm">
                          {searchQuery
                            ? `No bookings matched your search query "${searchQuery}".`
                            : "There are no bookings matching the selected status tab."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((apt) => {
                    const isBankTransfer =
                      apt.paymentType?.toLowerCase().includes("bank") ||
                      apt.paymentType?.toLowerCase() === "banktransfer";
                    const isUnverifiedSlip =
                      isBankTransfer &&
                      apt.attachment &&
                      (apt.paymentStatus === "pending_verification" ||
                        apt.paymentStatus === "unpaid" ||
                        apt.paymentStatus === "pending");

                    return (
                      <TableRow key={apt._id} className="hover:bg-muted/20 transition-colors">
                        {/* Reference / ID */}
                        <TableCell className="font-mono text-xs font-semibold text-foreground">
                          <div>
                            <span>{apt.appointmentNumber}</span>
                            {apt.customerType === "guest-user" && (
                              <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-muted/40">
                                Guest
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-foreground">{apt.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                              {apt.email}
                            </p>
                            {apt.contact && (
                              <p className="text-[11px] text-muted-foreground">{apt.contact}</p>
                            )}
                          </div>
                        </TableCell>

                        {/* Service & Specialist */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-foreground">{apt.serviceName}</p>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: apt.staffColor || "#4F46E5" }}
                              />
                              <span>{apt.staffName}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Date & Time */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                              <IconCalendar className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{apt.date}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <IconClock className="w-3.5 h-3.5 shrink-0" />
                              <span>{apt.time}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Payment Method & Status */}
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <PaymentStatusBadge status={apt.paymentStatus} />
                              <span className="text-[11px] text-muted-foreground">
                                (${Number(apt.servicePrice || 0).toFixed(2)})
                              </span>
                            </div>

                            {/* Verify Slip highlighted button */}
                            {isUnverifiedSlip ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedSlipAppointment(apt)}
                                className="h-6 text-[11px] px-2 gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                              >
                                <IconReceipt className="w-3 h-3" />
                                Verify Slip
                              </Button>
                            ) : isBankTransfer && apt.attachment ? (
                              <button
                                type="button"
                                onClick={() => setSelectedSlipAppointment(apt)}
                                className="text-[11px] text-primary hover:underline flex items-center gap-1"
                              >
                                <IconBuildingBank className="w-3 h-3" />
                                View Receipt
                              </button>
                            ) : null}
                          </div>
                        </TableCell>

                        {/* Booking Status */}
                        <TableCell>
                          <AppointmentStatusBadge status={apt.appointmentStatus} />
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">
                                Manage
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuLabel>Update Booking Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(apt._id, "Confirmed")}
                                className="cursor-pointer gap-2"
                              >
                                <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Mark Confirmed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(apt._id, "Completed")}
                                className="cursor-pointer gap-2"
                              >
                                <IconCheck className="w-3.5 h-3.5 text-blue-600" />
                                Mark Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(apt._id, "Cancelled")}
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                              >
                                <IconX className="w-3.5 h-3.5" />
                                Cancel Booking
                              </DropdownMenuItem>

                              {apt.attachment && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setSelectedSlipAppointment(apt)}
                                    className="cursor-pointer gap-2"
                                  >
                                    <IconReceipt className="w-3.5 h-3.5 text-amber-600" />
                                    Inspect Deposit Slip
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground">
              <div>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} bookings
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page <= 1 || isPending}
                  onClick={() => fetchAppointments(pagination.page - 1)}
                >
                  <IconChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="px-2 font-medium text-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page >= pagination.totalPages || isPending}
                  onClick={() => fetchAppointments(pagination.page + 1)}
                >
                  <IconChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Transfer Slip Verification Modal */}
      <VerifySlipModal
        isOpen={!!selectedSlipAppointment}
        onClose={() => setSelectedSlipAppointment(null)}
        appointment={selectedSlipAppointment}
        onSuccess={() => fetchAppointments(pagination.page, activeTab, searchQuery)}
      />
    </div>
  );
}
