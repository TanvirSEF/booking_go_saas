"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconSearch,
  IconX,
  IconDotsVertical,
  IconCheck,
  IconBuildingBank,
  IconFileText,
  IconReceipt,
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconEye,
  IconLoader2,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { TablePaginationBar } from "@/components/shared/table-pagination-bar";
import { ReceiptLightbox } from "./receipt-lightbox";
import { ReviewPaymentDialog } from "./review-payment-dialog";
import type {
  BankTransferPaymentDTO,
  BankTransferStatus,
} from "@/types/bank-transfer";

interface BankTransfersTableProps {
  items: BankTransferPaymentDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  currentStatus: BankTransferStatus | "all";
  currentSearch?: string;
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

export function BankTransfersTable({
  items,
  total,
  page,
  limit,
  totalPages,
  pendingCount,
  approvedCount,
  rejectedCount,
  currentStatus,
  currentSearch = "",
}: BankTransfersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [prevSearch, setPrevSearch] = useState(currentSearch);

  if (currentSearch !== prevSearch) {
    setPrevSearch(currentSearch);
    setSearchTerm(currentSearch);
  }

  // Lightbox state
  const [activeReceipt, setActiveReceipt] = useState<BankTransferPaymentDTO | null>(null);

  // Review modal state
  const [reviewTarget, setReviewTarget] = useState<{
    payment: BankTransferPaymentDTO;
    mode: "Approve" | "Reject";
  } | null>(null);

  const updateUrlParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === "" || (key === "status" && val === "all")) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  // Debounce search update
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== currentSearch) {
        updateUrlParams({ search: searchTerm.trim() || null, page: "1" });
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm, currentSearch, updateUrlParams]);

  const handleStatusChange = (status: BankTransferStatus | "all") => {
    updateUrlParams({ status, page: "1" });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const statusTabs: Array<{
    id: BankTransferStatus | "all";
    label: string;
    count?: number;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    { id: "all", label: "All Requests", count: pendingCount + approvedCount + rejectedCount, icon: IconReceipt },
    { id: "Pending", label: "Pending Verification", count: pendingCount, icon: IconClock },
    { id: "Approved", label: "Approved", count: approvedCount, icon: IconCircleCheck },
    { id: "Rejected", label: "Rejected", count: rejectedCount, icon: IconCircleX },
  ];

  return (
    <div className="space-y-4">
      {/* Top Filter Bar: Status Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl border border-border bg-card shadow-2xs">
          {statusTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = currentStatus === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order, company, memo..."
            className="h-9 pl-9 pr-8 text-xs rounded-xl bg-card border-border"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                updateUrlParams({ search: null, page: "1" });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Standard Table Shell */}
      <div className="relative rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {isPending && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-2xs">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-card px-3 py-1.5 rounded-lg shadow-sm border border-border">
              <IconLoader2 size={16} className="animate-spin text-primary" />
              <span>Updating requests...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-xs text-foreground w-36">Order No.</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">Company</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">Plan & Cycle</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">Amount</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">Transaction Ref</TableHead>
                <TableHead className="font-semibold text-xs text-foreground text-center">Receipt</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">Status</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">Submitted</TableHead>
                <TableHead className="font-semibold text-xs text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                        <IconBuildingBank size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          No Bank Transfer Requests Found
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          {currentSearch || currentStatus !== "all"
                            ? "No transfer records match your current search or status filter criteria."
                            : "Offline wire transfer requests submitted by companies will appear here for verification."}
                        </p>
                      </div>
                      {(currentSearch || currentStatus !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="h-8 gap-1.5 text-xs rounded-lg cursor-pointer"
                        >
                          <IconRotateClockwise size={14} />
                          <span>Reset Filters</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const isPendingStatus = item.status === "Pending";
                  const isPdf =
                    item.attachment.toLowerCase().endsWith(".pdf") ||
                    item.attachment.includes("application/pdf");

                  return (
                    <TableRow key={item.id} className="border-border hover:bg-muted/30">
                      {/* Order No. */}
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        {item.orderNumber || item.orderId || "—"}
                      </TableCell>

                      {/* Company Info */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground">
                            {item.companyName || "Unknown Company"}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate max-w-44">
                            {item.companyEmail || "—"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Plan & Cycle */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {item.planName || "SaaS Plan"}
                          </Badge>
                          <span className="text-muted-foreground text-xs">•</span>
                          <span className="text-xs font-medium text-foreground capitalize">
                            {item.billingCycle}
                          </span>
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell>
                        <span className="text-xs font-bold text-foreground">
                          ${item.price.toFixed(2)}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            {item.currency}
                          </span>
                        </span>
                      </TableCell>

                      {/* Transaction Ref / Memo */}
                      <TableCell>
                        {item.transactionRef ? (
                          <span className="font-mono text-xs text-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                            {item.transactionRef}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Receipt Preview Button */}
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveReceipt(item)}
                          className="h-8 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer px-2"
                        >
                          {isPdf ? (
                            <IconFileText size={15} />
                          ) : (
                            <IconEye size={15} />
                          )}
                          <span>View Slip</span>
                        </Button>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-medium gap-1.5 px-2 py-0.5 ${
                            item.status === "Pending"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                              : item.status === "Approved"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              item.status === "Pending"
                                ? "bg-amber-500 animate-pulse"
                                : item.status === "Approved"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />
                          <span>{item.status}</span>
                        </Badge>
                      </TableCell>

                      {/* Submission Date */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        {isPendingStatus ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setReviewTarget({ payment: item, mode: "Approve" })}
                              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg cursor-pointer gap-1"
                            >
                              <IconCheck size={13} stroke={2.5} />
                              <span>Approve</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setReviewTarget({ payment: item, mode: "Reject" })}
                              className="h-7 px-2.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer gap-1"
                            >
                              <IconX size={13} stroke={2.5} />
                              <span>Reject</span>
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 cursor-pointer text-muted-foreground hover:text-foreground"
                              >
                                <IconDotsVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl">
                              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                                Transfer Details
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setActiveReceipt(item)}
                                className="cursor-pointer gap-2 text-xs"
                              >
                                <IconEye size={14} />
                                <span>Inspect Receipt</span>
                              </DropdownMenuItem>
                              {item.reviewedByName && (
                                <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                                  <span>Reviewed by: </span>
                                  <strong className="text-foreground font-semibold">
                                    {item.reviewedByName}
                                  </strong>
                                </div>
                              )}
                              {item.rejectionReason && (
                                <div className="px-2 py-1.5 text-[11px] text-destructive bg-destructive/10 rounded-md mx-1 my-0.5">
                                  <span className="font-semibold block mb-0.5">Reason:</span>
                                  <span>{item.rejectionReason}</span>
                                </div>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Standard Table Pagination Bar */}
        <TablePaginationBar
          total={total}
          page={page}
          limit={limit}
          totalPages={totalPages}
          noun="requests"
          pageSizeOptions={[10, 25, 50]}
          syncToUrl={true}
        />
      </div>

      {/* Lightbox Modal */}
      {activeReceipt && (
        <ReceiptLightbox
          isOpen={Boolean(activeReceipt)}
          onClose={() => setActiveReceipt(null)}
          receiptUrl={activeReceipt.attachment}
          orderNumber={activeReceipt.orderNumber}
          companyName={activeReceipt.companyName}
          amount={activeReceipt.price}
          currency={activeReceipt.currency}
          transactionRef={activeReceipt.transactionRef}
          status={activeReceipt.status}
        />
      )}

      {/* Review Confirmation Dialog */}
      {reviewTarget && (
        <ReviewPaymentDialog
          isOpen={Boolean(reviewTarget)}
          onClose={() => setReviewTarget(null)}
          payment={reviewTarget.payment}
          mode={reviewTarget.mode}
        />
      )}
    </div>
  );
}
