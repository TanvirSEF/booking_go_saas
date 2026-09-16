"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconPlus,
  IconDownload,
  IconRotate2,
  IconRefresh,
  IconSearch,
  IconPencil,
  IconTrash,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface CouponDataTableProps {
  initialCoupons: CouponItem[];
}

export function CouponDataTable({ initialCoupons }: CouponDataTableProps) {
  const router = useRouter();

  const [coupons, setCoupons] = useState<CouponItem[]>(initialCoupons);
  const [prevInitial, setPrevInitial] = useState<CouponItem[]>(initialCoupons);

  if (initialCoupons !== prevInitial) {
    setPrevInitial(initialCoupons);
    setCoupons(initialCoupons);
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
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

  const filteredCoupons = useMemo(() => {
    let result = [...coupons];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
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
  }, [coupons, searchQuery, sortField, sortOrder]);

  const pageSize = parseInt(entriesPerPage, 10) || 10;
  const totalPages = Math.ceil(filteredCoupons.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCoupons = filteredCoupons.slice(startIndex, startIndex + pageSize);

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
    setSearchQuery("");
    setSortField(null);
    setCurrentPage(1);
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
          {/* Entries selector */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Select
              value={entriesPerPage}
              onValueChange={(val) => {
                setEntriesPerPage(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-18 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-18">
                <SelectItem value="5" className="text-xs">
                  5
                </SelectItem>
                <SelectItem value="10" className="text-xs">
                  10
                </SelectItem>
                <SelectItem value="25" className="text-xs">
                  25
                </SelectItem>
                <SelectItem value="50" className="text-xs">
                  50
                </SelectItem>
              </SelectContent>
            </Select>
            <span className="font-medium text-foreground">Entries Per Page</span>
          </div>

          {/* Action buttons & Search */}
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

            <div className="relative">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-48 sm:w-60 pl-8 text-xs rounded-lg border-border"
              />
              <IconSearch
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-14 text-xs font-bold uppercase tracking-wider text-foreground">
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
                    className="h-36 text-center text-xs text-muted-foreground"
                  >
                    No entries found
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

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <div>
            Showing {filteredCoupons.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + pageSize, filteredCoupons.length)} of{" "}
            {filteredCoupons.length} entries
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="size-8 rounded-lg text-xs"
            >
              <IconChevronLeft size={14} />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="icon"
                onClick={() => setCurrentPage(page)}
                className={`size-8 rounded-lg text-xs font-semibold ${
                  currentPage === page
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : ""
                }`}
              >
                {page}
              </Button>
            ))}

            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="size-8 rounded-lg text-xs"
            >
              <IconChevronRight size={14} />
            </Button>
          </div>
        </div>
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
