"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconArrowsSort,
  IconArrowLeft,
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
import type { CouponRedemptionItem } from "@/actions/coupon";

interface CouponDetailsViewProps {
  coupon: {
    id: string;
    name: string;
    code: string;
    discount: number;
    limit: number;
    usedCount: number;
  };
  redemptions: CouponRedemptionItem[];
}

export function CouponDetailsView({
  coupon,
  redemptions,
}: CouponDetailsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<
    "userName" | "date" | "planName" | "paymentType" | null
  >(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const filteredItems = useMemo(() => {
    let result = [...redemptions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.userName.toLowerCase().includes(q) ||
          r.planName.toLowerCase().includes(q) ||
          r.paymentType.toLowerCase().includes(q) ||
          r.date.toLowerCase().includes(q)
      );
    }

    if (sortField) {
      result.sort((a, b) => {
        const valA = a[sortField].toLowerCase();
        const valB = b[sortField].toLowerCase();
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [redemptions, searchQuery, sortField, sortOrder]);

  const pageSize = parseInt(entriesPerPage, 10) || 10;
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  const handleSort = (
    field: "userName" | "date" | "planName" | "paymentType"
  ) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header section matching Manage Coupon Details screenshot */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Manage Coupon Details
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link
              href="/super-admin"
              className="text-primary hover:underline font-medium"
            >
              Dashboard
            </Link>
            <span>&gt;</span>
            <Link
              href="/super-admin/coupons"
              className="hover:underline text-muted-foreground"
            >
              Coupon
            </Link>
            <span>&gt;</span>
            <span className="text-muted-foreground">Coupon Details</span>
          </div>
        </div>

        <Link href="/super-admin/coupons">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <IconArrowLeft size={14} />
            Back to Coupons
          </Button>
        </Link>
      </div>

      {/* Main card matching screenshot */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-6 shadow-xs">
        {/* Top metadata info summary banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              {coupon.name}
            </span>
            <span className="rounded-md bg-muted px-2.5 py-0.5 font-mono text-xs font-semibold text-foreground">
              {coupon.code}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Discount:{" "}
              <strong className="text-foreground">{coupon.discount}%</strong>
            </span>
            <span>
              Usage:{" "}
              <strong className="text-foreground">
                {coupon.usedCount} / {coupon.limit}
              </strong>
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Entries per page */}
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
            <span className="text-muted-foreground">entries per page</span>
          </div>

          {/* Search input */}
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

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead
                  onClick={() => handleSort("userName")}
                  className="cursor-pointer select-none text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    USER
                    <IconArrowsSort size={13} className="text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("date")}
                  className="cursor-pointer select-none text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    DATE
                    <IconArrowsSort size={13} className="text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("planName")}
                  className="cursor-pointer select-none text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    PLAN NAME
                    <IconArrowsSort size={13} className="text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("paymentType")}
                  className="cursor-pointer select-none text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    PAYMENT TYPE
                    <IconArrowsSort size={13} className="text-muted-foreground" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-36 text-center text-xs text-muted-foreground"
                  >
                    No entries found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-border hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="text-xs font-medium text-foreground">
                      {item.userName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.date}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {item.planName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.paymentType}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <div>
            Showing {filteredItems.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + pageSize, filteredItems.length)} of{" "}
            {filteredItems.length} entries
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
    </div>
  );
}
