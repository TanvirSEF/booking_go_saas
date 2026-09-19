"use client";

import { useState, useMemo, useEffect, useTransition, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  IconDownload,
  IconRotate2,
  IconRefresh,
  IconSearch,
  IconX,
  IconUser,
  IconApps,
  IconSwitchHorizontal,
  IconTrendingUp,
  IconAdjustmentsHorizontal,
  IconPencil,
  IconTrash,
  IconArrowsSort,
  IconPower,
  IconRotateClockwise,
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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompanyItem } from "./company-dialog";
import { TablePaginationBar } from "@/components/shared/table-pagination-bar";

interface CompanyDataTableProps {
  companies: CompanyItem[];
  onEdit: (company: CompanyItem) => void;
  onDelete: (company: CompanyItem) => void;
  onResetPassword: (company: CompanyItem) => void;
  onToggleStatus: (companyId: string, currentStatus: boolean) => void;
}

export function CompanyDataTable({
  companies,
  onEdit,
  onDelete,
  onResetPassword,
  onToggleStatus,
}: CompanyDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlSearch = searchParams?.get("search") || "";
  const page = Math.max(1, parseInt(searchParams?.get("page") || "1", 10) || 1);
  const limit = Math.max(1, parseInt(searchParams?.get("limit") || "10", 10) || 10);

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [sortField, setSortField] = useState<"name" | "role" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

  // Filtering
  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    if (urlSearch.trim()) {
      const q = urlSearch.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.businessName && c.businessName.toLowerCase().includes(q))
      );
    }

    if (sortField) {
      result.sort((a, b) => {
        const valA = (a[sortField] || "").toLowerCase();
        const valB = (b[sortField] || "").toLowerCase();
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [companies, urlSearch, sortField, sortOrder]);

  // Pagination
  const totalEntries = filteredCompanies.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / limit));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * limit;
  const paginatedCompanies = filteredCompanies.slice(
    startIndex,
    startIndex + limit
  );

  function toggleSort(field: "name" | "role") {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  function handleExport() {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["No,Name,Email,Role,Status,Plan,Created"]
        .concat(
          filteredCompanies.map(
            (c, i) =>
              `${i + 1},"${c.name}","${c.email}","${c.role}","${
                c.isActive ? "Active" : "Disabled"
              }","${c.planName || "Basic"}","${c.createdAt}"`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `subscribers_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Subscribers list exported as CSV.");
  }

  function handleReset() {
    setSearchTerm("");
    setSortField(null);
    updateFilters({ search: null });
    toast.info("Search and filters reset.");
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-4 shadow-xs">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search with clear button */}
        <div className="relative flex-1 sm:max-w-xs">
          <IconSearch
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search subscribers..."
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

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Download Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleExport}
                className="size-8 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 hover:text-white border-none shadow-2xs"
              >
                <IconDownload size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>

          {/* Reset Filter Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleReset}
                className="size-8 rounded-lg bg-rose-500 text-white hover:bg-rose-600 hover:text-white border-none shadow-2xs"
              >
                <IconRotate2 size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset</TooltipContent>
          </Tooltip>

          {/* Refresh Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  toast.info("Refreshed list");
                }}
                className="size-8 rounded-lg bg-amber-500 text-white hover:bg-amber-600 hover:text-white border-none shadow-2xs"
              >
                <IconRefresh size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Table Area */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <TableRow>
              <TableHead className="w-12 text-center">NO</TableHead>
              <TableHead className="w-16">AVATAR</TableHead>
              <TableHead
                onClick={() => toggleSort("name")}
                className="cursor-pointer select-none hover:text-foreground"
              >
                <div className="flex items-center gap-1">
                  <span>NAME</span>
                  <IconArrowsSort size={12} className="opacity-60" />
                </div>
              </TableHead>
              <TableHead>EMAIL</TableHead>
              <TableHead
                onClick={() => toggleSort("role")}
                className="cursor-pointer select-none hover:text-foreground"
              >
                <div className="flex items-center gap-1">
                  <span>ROLE</span>
                  <IconArrowsSort size={12} className="opacity-60" />
                </div>
              </TableHead>
              <TableHead className="text-right pr-4">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {paginatedCompanies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-40 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                      <IconSearch size={22} />
                    </div>
                    <p className="text-sm font-medium text-foreground">No subscribers found</p>
                    <p className="text-xs text-muted-foreground">
                      {urlSearch
                        ? `No subscribers matching "${urlSearch}"`
                        : "No subscribers currently registered."}
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
              paginatedCompanies.map((c, idx) => (
                <TableRow key={c.id} className="hover:bg-muted/20">
                  <TableCell className="text-center font-medium text-muted-foreground">
                    {startIndex + idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                      <IconUser size={16} />
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {c.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell>
                    <Badge className="bg-primary text-[10px] font-semibold text-primary-foreground">
                      {c.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Row of colorful action buttons matching table-view.png */}
                    <div className="flex items-center justify-end gap-1">
                      {/* 1. AdminHub: Purple */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon-xs"
                            onClick={() => {
                              router.push(`/dashboard?tenant=${c.id}`);
                            }}
                            className="size-7 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                          >
                            <IconApps size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>AdminHub</TooltipContent>
                      </Tooltip>

                      {/* 2. Plan Switch: Dark Slate */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon-xs"
                            onClick={() => onEdit(c)}
                            className="size-7 rounded-md bg-slate-700 text-white hover:bg-slate-800 shadow-2xs"
                          >
                            <IconSwitchHorizontal size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Change Plan</TooltipContent>
                      </Tooltip>

                      {/* 3. Business Link: Cyan */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon-xs"
                            onClick={() => {
                              if (c.businessSlug) {
                                window.open(`/${c.businessSlug}`, "_blank");
                              } else {
                                toast.info("No business link configured");
                              }
                            }}
                            className="size-7 rounded-md bg-cyan-500 text-white hover:bg-cyan-600 shadow-2xs"
                          >
                            <IconTrendingUp size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Business Link</TooltipContent>
                      </Tooltip>

                      {/* 4. Reset Password: Amber */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon-xs"
                            onClick={() => onResetPassword(c)}
                            className="size-7 rounded-md bg-amber-500 text-white hover:bg-amber-600 shadow-2xs"
                          >
                            <IconAdjustmentsHorizontal size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reset Password</TooltipContent>
                      </Tooltip>

                      {/* 5. Login Disable / Enable: Rose/Red */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon-xs"
                            onClick={() => onToggleStatus(c.id, c.isActive)}
                            className={`size-7 rounded-md text-white shadow-2xs ${
                              c.isActive
                                ? "bg-rose-500 hover:bg-rose-600"
                                : "bg-emerald-500 hover:bg-emerald-600"
                            }`}
                          >
                            <IconPower size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {c.isActive ? "Disable Login" : "Enable Login"}
                        </TooltipContent>
                      </Tooltip>

                      {/* 6. Edit: Teal */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon-xs"
                            onClick={() => onEdit(c)}
                            className="size-7 rounded-md bg-teal-500 text-white hover:bg-teal-600 shadow-2xs"
                          >
                            <IconPencil size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>

                      {/* 7. Delete: Red */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon-xs"
                            onClick={() => onDelete(c)}
                            className="size-7 rounded-md bg-red-500 text-white hover:bg-red-600 shadow-2xs"
                          >
                            <IconTrash size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Table Footer: Pagination */}
      <TablePaginationBar
        total={totalEntries}
        page={safePage}
        limit={limit}
        noun="subscribers"
        syncToUrl={true}
      />
    </div>
  );
}
