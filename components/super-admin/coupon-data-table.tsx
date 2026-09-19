"use client";

import { useState, useMemo, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  IconPlus,
  IconDownload,
  IconRotate2,
  IconRefresh,
  IconSearch,
  IconX,
  IconRotateClockwise,
  IconPencil,
  IconTrash,
  IconEye,
  IconArrowsSort,
} from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type CouponItem,
  getCouponsAction,
} from "@/actions/coupon";
import {
  CreateCouponDialog,
  EditCouponDialog,
  DeleteCouponDialog,
} from "./coupon-dialog";
import { TablePaginationBar } from "@/components/shared/table-pagination-bar";

interface CouponDataTableProps {
  initialCoupons: CouponItem[];
}

export function CouponDataTable({ initialCoupons }: CouponDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [coupons, setCoupons] = useState<CouponItem[]>(initialCoupons);
  const [prevInitial, setPrevInitial] = useState<CouponItem[]>(initialCoupons);

  if (initialCoupons !== prevInitial) {
    setPrevInitial(initialCoupons);
    setCoupons(initialCoupons);
  }

  const urlSearch = searchParams?.get("search") || "";
  const page = Math.max(1, parseInt(searchParams?.get("page") || "1", 10) || 1);
  const limit = Math.max(1, parseInt(searchParams?.get("limit") || "10", 10) || 10);

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [sortField, setSortField] = useState<"name" | "discount" | "limit" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<CouponItem | null>(null);
  const [deleteCoupon, setDeleteCoupon] = useState<CouponItem | null>(null);

  const refreshData = async () => {
    try {
      const data = await getCouponsAction();
      setCoupons(data);
    } catch {
      router.refresh();
    }
  };

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : "");

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value.trim() !== "") {
          params.set(key, value.trim());
        } else {
          params.delete(key);
        }
      });

      params.set("page", "1");

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  // Debounce search input
  useEffect(() => {
    if (searchTerm === urlSearch) return;

    const timeout = setTimeout(() => {
      updateFilters({ search: searchTerm.trim() || null });
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchTerm, urlSearch, updateFilters]);

  const filteredCoupons = useMemo(() => {
    let result = [...coupons];

    if (urlSearch.trim()) {
      const q = urlSearch.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          String(c.discount).includes(q) ||
          String(c.limit).includes(q)
      );
    }

    if (sortField) {
      result.sort((a, b) => {
        let valA: string | number = a[sortField];
        let valB: string | number = b[sortField];

        if (typeof valA === "string") {
          valA = valA.toLowerCase();
          valB = (valB as string).toLowerCase();
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [coupons, urlSearch, sortField, sortOrder]);

  const totalEntries = filteredCoupons.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / limit));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * limit;
  const paginatedCoupons = filteredCoupons.slice(startIndex, startIndex + limit);

  const handleSort = (field: "name" | "discount" | "limit") => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleExport = () => {
    if (filteredCoupons.length === 0) {
      toast.error("No coupons available to export.");
      return;
    }

    const headers = ["NO", "NAME", "CODE", "DISCOUNT (%)", "LIMIT", "USED"];
    const rows = filteredCoupons.map((c, i) => [
      i + 1,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.code}"`,
      c.discount,
      c.limit,
      c.usedCount,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `coupons_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Coupons exported as CSV.");
  };

  const handleReset = () => {
    setSearchTerm("");
    setSortField(null);
    updateFilters({ search: null });
    toast.info("Search and filters reset.");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header section matching Manage Coupon screenshot */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Manage Coupon
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link
              href="/super-admin"
              className="text-primary hover:underline font-medium"
            >
              Dashboard
            </Link>
            <span>&gt;</span>
            <span className="text-muted-foreground">Coupon</span>
          </div>
        </div>

        {/* Create button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={() => setIsCreateOpen(true)}
              className="size-9 rounded-xl bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              <IconPlus size={18} stroke={2.5} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create New Coupon</TooltipContent>
        </Tooltip>
      </div>

      {/* Main card matching screenshot */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-6 shadow-xs">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Search with clear button */}
          <div className="relative flex-1 sm:max-w-xs">
            <IconSearch
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search coupons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-lg pl-9 pr-8 text-xs sm:text-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  updateFilters({ search: null });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExport}
                  className="size-8 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 hover:text-white border-none shadow-2xs"
                >
                  <IconDownload size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download CSV</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleReset}
                  className="size-8 rounded-lg bg-rose-500 text-white hover:bg-rose-600 hover:text-white border-none shadow-2xs"
                >
                  <IconRotate2 size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset Filter</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    refreshData();
                    toast.info("Coupons list refreshed.");
                  }}
                  className="size-8 rounded-lg bg-amber-500 text-white hover:bg-amber-600 hover:text-white border-none shadow-2xs"
                >
                  <IconRefresh size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Data</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Table Area */}
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-12 text-xs font-bold uppercase tracking-wider text-foreground">
                  NO
                </TableHead>
                <TableHead
                  onClick={() => handleSort("name")}
                  className="cursor-pointer select-none text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    NAME
                    <IconArrowsSort size={13} className="text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">
                  CODE
                </TableHead>
                <TableHead
                  onClick={() => handleSort("discount")}
                  className="cursor-pointer select-none text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    DISCOUNT (%)
                    <IconArrowsSort size={13} className="text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("limit")}
                  className="cursor-pointer select-none text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    LIMIT
                    <IconArrowsSort size={13} className="text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">
                  USED
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground pr-4">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCoupons.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-40 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 py-6">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                        <IconSearch size={22} />
                      </div>
                      <p className="text-sm font-medium text-foreground">No coupons found</p>
                      <p className="text-xs text-muted-foreground">
                        {urlSearch
                          ? `No coupons matching "${urlSearch}"`
                          : "No coupons currently available."}
                      </p>
                      {urlSearch && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleReset}
                          className="mt-2 h-8 text-xs"
                        >
                          <IconRotateClockwise size={13} className="mr-1.5" />
                          Reset Search
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCoupons.map((coupon, index) => {
                  const rowNumber = startIndex + index + 1;
                  return (
                    <TableRow
                      key={coupon.id}
                      className="border-border hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {rowNumber}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {coupon.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium tracking-wider text-foreground">
                        {coupon.code}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {coupon.discount}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {coupon.limit}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {coupon.usedCount}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details button (amber) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                onClick={() =>
                                  router.push(`/super-admin/coupons/${coupon.id}`)
                                }
                                className="size-8 rounded-lg bg-amber-500 text-white hover:bg-amber-600 border-none shadow-2xs"
                              >
                                <IconEye size={15} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>

                          {/* Edit button (cyan/teal) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                onClick={() => setEditCoupon(coupon)}
                                className="size-8 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 border-none shadow-2xs"
                              >
                                <IconPencil size={15} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Coupon</TooltipContent>
                          </Tooltip>

                          {/* Delete button (rose/pink) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                onClick={() => setDeleteCoupon(coupon)}
                                className="size-8 rounded-lg bg-rose-500 text-white hover:bg-rose-600 border-none shadow-2xs"
                              >
                                <IconTrash size={15} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Coupon</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Unified Pagination Footer */}
        <TablePaginationBar
          total={totalEntries}
          page={safePage}
          limit={limit}
          noun="coupons"
          syncToUrl={true}
        />
      </div>

      {/* Dialogs */}
      <CreateCouponDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={refreshData}
      />

      <EditCouponDialog
        coupon={editCoupon}
        open={!!editCoupon}
        onOpenChange={(open) => {
          if (!open) setEditCoupon(null);
        }}
        onSuccess={refreshData}
      />

      <DeleteCouponDialog
        coupon={deleteCoupon}
        open={!!deleteCoupon}
        onOpenChange={(open) => {
          if (!open) setDeleteCoupon(null);
        }}
        onSuccess={refreshData}
      />
    </div>
  );
}
