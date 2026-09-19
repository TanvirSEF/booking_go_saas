"use client";

import * as React from "react";
import {
  IconArchive,
  IconCalendar,
  IconCheck,
  IconEye,
  IconInbox,
  IconMail,
  IconPhone,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ContactDetailDrawer } from "@/components/dashboard/contacts/contact-detail-drawer";
import {
  getCompanyContactInquiriesAction,
  bulkUpdateContactInquiriesAction,
  bulkDeleteContactInquiriesAction,
  deleteContactInquiryAction,
} from "@/actions/contact-us";
import type {
  ContactInquiryDTO,
  ContactInquiryStatus,
  PaginatedContactInquiriesResult,
} from "@/types/contact-us";

interface ContactInboxTableProps {
  initialData: PaginatedContactInquiriesResult;
}

export function ContactInboxTable({ initialData }: ContactInboxTableProps) {
  const [data, setData] = React.useState<PaginatedContactInquiriesResult>(initialData);
  const [statusFilter, setStatusFilter] = React.useState<ContactInquiryStatus | "all">("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = React.useState<boolean>(false);

  // Drawer detail modal
  const [activeInquiry, setActiveInquiry] = React.useState<ContactInquiryDTO | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);

  const fetchInquiries = React.useCallback(
    async (targetPage = page, targetStatus = statusFilter, targetSearch = searchQuery) => {
      setIsLoading(true);
      try {
        const res = await getCompanyContactInquiriesAction({
          page: targetPage,
          limit: 15,
          status: targetStatus === "all" ? undefined : targetStatus,
          search: targetSearch.trim() || undefined,
        });

        if (res.success && res.data) {
          setData(res.data);
          setSelectedIds([]);
        } else {
          toast.error(res.error || "Failed to load inquiries");
        }
      } catch {
        toast.error("Failed to fetch contact inquiries");
      } finally {
        setIsLoading(false);
      }
    },
    [page, statusFilter, searchQuery]
  );

  const handleStatusChange = (newStatus: ContactInquiryStatus | "all") => {
    setStatusFilter(newStatus);
    setPage(1);
    fetchInquiries(1, newStatus, searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setPage(1);
    const timer = setTimeout(() => {
      fetchInquiries(1, statusFilter, query);
    }, 350);
    return () => clearTimeout(timer);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(data.inquiries.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkOperating(true);
    try {
      const res = await bulkUpdateContactInquiriesAction(selectedIds, "archived");
      if (res.success) {
        toast.success(res.message || "Inquiries archived");
        fetchInquiries();
      } else {
        toast.error(res.error || "Failed to archive inquiries");
      }
    } catch {
      toast.error("Bulk archive failed");
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkMarkReplied = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkOperating(true);
    try {
      const res = await bulkUpdateContactInquiriesAction(selectedIds, "replied");
      if (res.success) {
        toast.success(res.message || "Inquiries marked as replied");
        fetchInquiries();
      } else {
        toast.error(res.error || "Failed to update inquiries");
      }
    } catch {
      toast.error("Bulk update failed");
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} inquiries?`)) return;

    setIsBulkOperating(true);
    try {
      const res = await bulkDeleteContactInquiriesAction(selectedIds);
      if (res.success) {
        toast.success(res.message || "Inquiries deleted");
        fetchInquiries();
      } else {
        toast.error(res.error || "Failed to delete inquiries");
      }
    } catch {
      toast.error("Bulk delete failed");
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleDeleteSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await deleteContactInquiryAction(id);
      if (res.success) {
        toast.success("Inquiry removed");
        fetchInquiries();
      } else {
        toast.error(res.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete inquiry");
    }
  };

  const counts = data.counts || { total: 0, new: 0, read: 0, replied: 0, archived: 0 };
  const allSelected = data.inquiries.length > 0 && selectedIds.length === data.inquiries.length;

  return (
    <div className="space-y-4">
      {/* Top Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: "all", label: "All Inquiries", count: counts.total },
            { key: "new", label: "New", count: counts.new },
            { key: "read", label: "Read", count: counts.read },
            { key: "replied", label: "Replied", count: counts.replied },
            { key: "archived", label: "Archived", count: counts.archived },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleStatusChange(tab.key as ContactInquiryStatus | "all")}
              className={
                statusFilter === tab.key
                  ? "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-2xs transition-colors shrink-0"
                  : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
              }
            >
              <span>{tab.label}</span>
              <span
                className={
                  statusFilter === tab.key
                    ? "px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary-foreground/20 text-primary-foreground"
                    : "px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-background text-muted-foreground border border-border/60"
                }
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, subject..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs">
          <span className="font-semibold text-foreground">
            {selectedIds.length} {selectedIds.length === 1 ? "inquiry" : "inquiries"} selected
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkMarkReplied}
              disabled={isBulkOperating}
              className="h-7 text-xs font-semibold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <IconCheck size={13} />
              <span>Mark Replied</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkArchive}
              disabled={isBulkOperating}
              className="h-7 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
            >
              <IconArchive size={13} />
              <span>Archive</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isBulkOperating}
              className="h-7 text-xs font-semibold gap-1"
            >
              <IconTrash size={13} />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="min-w-[180px]">Sender</TableHead>
              <TableHead className="min-w-[130px]">Contact</TableHead>
              <TableHead className="min-w-[220px]">Subject & Snippet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-xs">Loading inquiries...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.inquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center p-6">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground mb-3">
                      <IconInbox size={24} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">No customer inquiries found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {searchQuery || statusFilter !== "all"
                        ? "Try clearing your search query or switching tabs."
                        : "Messages submitted via your public contact form will appear in this inbox."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.inquiries.map((inquiry) => {
                const isSelected = selectedIds.includes(inquiry.id);

                return (
                  <TableRow
                    key={inquiry.id}
                    onClick={() => {
                      setActiveInquiry(inquiry);
                      setIsDrawerOpen(true);
                    }}
                    className={
                      inquiry.status === "new"
                        ? "bg-primary/[0.03] dark:bg-primary/[0.05] hover:bg-muted/40 font-semibold cursor-pointer transition-colors"
                        : "hover:bg-muted/30 cursor-pointer transition-colors"
                    }
                  >
                    {/* Checkbox */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(inquiry.id, !!checked)}
                        aria-label={`Select ${inquiry.name}`}
                      />
                    </TableCell>

                    {/* Sender */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          {inquiry.name}
                          {inquiry.status === "new" && (
                            <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                          <IconMail size={12} className="shrink-0" />
                          <span>{inquiry.email}</span>
                        </p>
                      </div>
                    </TableCell>

                    {/* Contact Phone */}
                    <TableCell>
                      {inquiry.contact ? (
                        <div className="flex items-center gap-1 text-xs text-foreground">
                          <IconPhone size={13} className="text-muted-foreground shrink-0" />
                          <span>{inquiry.contact}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </TableCell>

                    {/* Subject & Message Snippet */}
                    <TableCell>
                      <div className="space-y-0.5 max-w-[280px]">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {inquiry.subject}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {inquiry.message}
                        </p>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          inquiry.status === "new"
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase text-[10px]"
                            : inquiry.status === "replied"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px]"
                              : inquiry.status === "archived"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase text-[10px]"
                                : "border-muted-foreground/30 bg-muted text-muted-foreground font-bold uppercase text-[10px]"
                        }
                      >
                        {inquiry.status}
                      </Badge>
                    </TableCell>

                    {/* Date */}
                    <TableCell>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <IconCalendar size={12} />
                        <span>
                          {new Date(inquiry.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setActiveInquiry(inquiry);
                            setIsDrawerOpen(true);
                          }}
                          className="size-7 text-muted-foreground hover:text-foreground"
                          title="View Inquiry"
                        >
                          <IconEye size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteSingle(e, inquiry.id)}
                          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete"
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border/60 bg-muted/10 text-xs">
            <span className="text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prev = Math.max(1, page - 1);
                  setPage(prev);
                  fetchInquiries(prev);
                }}
                disabled={page <= 1 || isLoading}
                className="h-7 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = Math.min(data.pagination.totalPages, page + 1);
                  setPage(next);
                  fetchInquiries(next);
                }}
                disabled={page >= data.pagination.totalPages || isLoading}
                className="h-7 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Detail Drawer */}
      <ContactDetailDrawer
        inquiry={activeInquiry}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onUpdated={fetchInquiries}
      />
    </div>
  );
}
