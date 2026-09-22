"use client";

import { useState, useMemo, useEffect, useTransition, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import {
  IconDownload,
  IconRotate2,
  IconRefresh,
  IconSearch,
  IconX,
  IconUser,
  IconSwitchHorizontal,
  IconTrendingUp,
  IconAdjustmentsHorizontal,
  IconPencil,
  IconTrash,
  IconArrowsSort,
  IconPower,
  IconRotateClockwise,
  IconShieldCheck,
  IconUserX,
  IconUserCheck,
  IconKey,
  IconLoader2,
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
import { startImpersonationAction } from "@/actions/impersonation";

interface CompanyDataTableProps {
  companies: CompanyItem[];
  onEdit: (company: CompanyItem) => void;
  onDelete: (company: CompanyItem) => void;
  onResetPassword: (company: CompanyItem) => void;
  onToggleStatus: (companyId: string, currentStatus: boolean) => void;
  onSuspend?: (company: CompanyItem) => void;
  onReactivate?: (company: CompanyItem) => void;
  onViewSecurity?: (company: CompanyItem) => void;
}

export function CompanyDataTable({
  companies,
  onEdit,
  onDelete,
  onResetPassword,
  onToggleStatus,
  onSuspend,
  onReactivate,
  onViewSecurity,
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
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  async function handleImpersonate(company: CompanyItem) {
    if (company.isActive === false) {
      toast.error("Cannot impersonate a deactivated company.");
      return;
    }

    try {
      setImpersonatingId(company.id);
      toast.info(`Initiating impersonation session for ${company.name}...`);

      const res = await startImpersonationAction(company.id);
      if (res.success && res.ticket) {
        const authResult = await signIn("impersonate", {
          ticket: res.ticket,
          callbackUrl: res.redirectUrl || "/dashboard",
          redirect: false,
        });

        if (authResult?.error) {
          toast.error("Authentication failed during impersonation.");
          setImpersonatingId(null);
          return;
        }

        toast.success(`Logged in as ${company.name}`);
        const targetUrl = res.redirectUrl || "/dashboard";
        window.location.assign(targetUrl);
      } else {
        toast.error(res.message || res.error || "Failed to impersonate company.");
        setImpersonatingId(null);
      }
    } catch (err) {
      console.error("[handleImpersonate] Error:", err);
      toast.error("Failed to start impersonation.");
      setImpersonatingId(null);
    }
  }

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
      ["Name,Email,Role,Status,Login_Access,Plan,Created_At"]
        .concat(
          filteredCompanies.map(
            (c) =>
              `"${c.name}","${c.email}","${c.role}","${c.isActive ? "Active" : "Suspended"}","${c.isEnableLogin !== false ? "Allowed" : "Disabled"}","${c.planName || "Basic"}","${c.createdAt}"`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `subscribers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Subscribers exported successfully!");
  }

  function handleReset() {
    setSearchTerm("");
    setSortField(null);
    updateFilters({ search: null, page: "1" });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative w-full max-w-sm">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search subscribers by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-xl pl-9 pr-8 text-xs shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={handleReset}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <IconX size={14} />
            </button>
          )}
        </div>

        {/* Right: Export & Action Buttons */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleExport}
                className="size-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-none shadow-xs"
              >
                <IconDownload size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export Subscribers CSV</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleReset}
                className="size-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-none shadow-xs cursor-pointer"
              >
                <IconRotate2 size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset Filters</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.refresh()}
                className="size-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-none shadow-xs cursor-pointer"
              >
                <IconRefresh size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/40 bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-12 text-center text-xs font-semibold text-muted-foreground">
                #
              </TableHead>
              <TableHead className="w-12 text-center text-xs font-semibold text-muted-foreground">
                User
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-xs font-semibold text-foreground hover:text-primary"
                onClick={() => toggleSort("name")}
              >
                <div className="flex items-center gap-1.5">
                  Name
                  <IconArrowsSort size={14} className="text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-foreground">
                Email
              </TableHead>
              <TableHead className="text-xs font-semibold text-foreground">
                Login Access
              </TableHead>
              <TableHead className="text-xs font-semibold text-foreground">
                Account Status
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-foreground pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCompanies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
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
              paginatedCompanies.map((c, idx) => {
                const isSuspended = c.isActive === false;
                const isLoginAllowed = c.isEnableLogin !== false;

                return (
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
                      <div>
                        <span>{c.name}</span>
                        {c.businessName && (
                          <p className="text-[11px] font-normal text-muted-foreground">
                            {c.businessName}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>

                    {/* Login Access Badge */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          isLoginAllowed
                            ? "border-emerald-500/20 bg-emerald-500/10 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/20 bg-amber-500/10 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                        }
                      >
                        {isLoginAllowed ? "Login Allowed" : "Login Disabled"}
                      </Badge>
                    </TableCell>

                    {/* Account Status Badge with Tooltip */}
                    <TableCell>
                      {isSuspended ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="cursor-help border-destructive/30 bg-destructive/10 text-[10px] font-semibold text-destructive"
                            >
                              Suspended
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            <p className="font-semibold">Account Suspended</p>
                            {c.suspendedReason && (
                              <p className="mt-0.5 text-muted-foreground">
                                Reason: {c.suspendedReason}
                              </p>
                            )}
                            {c.suspendedAt && (
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                Date: {new Date(c.suspendedAt).toLocaleDateString()}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/20 bg-emerald-500/10 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                        >
                          Active
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-1">
                        {/* 1. Login as Company (Impersonation) */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-xs"
                              onClick={() => handleImpersonate(c)}
                              disabled={isSuspended || impersonatingId === c.id}
                              className="size-7 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {impersonatingId === c.id ? (
                                <IconLoader2 size={14} className="animate-spin" />
                              ) : (
                                <IconKey size={14} />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isSuspended
                              ? "Cannot impersonate a deactivated company."
                              : impersonatingId === c.id
                              ? "Logging In..."
                              : "Login As Company"}
                          </TooltipContent>
                        </Tooltip>

                        {/* 2. Plan Switch: Dark Slate */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-xs"
                              onClick={() => onEdit(c)}
                              className="size-7 rounded-md bg-slate-700 text-white hover:bg-slate-800 shadow-2xs cursor-pointer"
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
                              className="size-7 rounded-md bg-cyan-500 text-white hover:bg-cyan-600 shadow-2xs cursor-pointer"
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
                              className="size-7 rounded-md bg-amber-500 text-white hover:bg-amber-600 shadow-2xs cursor-pointer"
                            >
                              <IconAdjustmentsHorizontal size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reset Password</TooltipContent>
                        </Tooltip>

                        {/* 5. Security Telemetry */}
                        {onViewSecurity && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon-xs"
                                onClick={() => onViewSecurity(c)}
                                className="size-7 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs cursor-pointer"
                              >
                                <IconShieldCheck size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Security Telemetry</TooltipContent>
                          </Tooltip>
                        )}

                        {/* 6. Suspend / Reactivate Company */}
                        {isSuspended ? (
                          onReactivate && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon-xs"
                                  onClick={() => onReactivate(c)}
                                  className="size-7 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs cursor-pointer"
                                >
                                  <IconUserCheck size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reactivate Company</TooltipContent>
                            </Tooltip>
                          )
                        ) : (
                          onSuspend && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon-xs"
                                  onClick={() => onSuspend(c)}
                                  className="size-7 rounded-md bg-rose-600 text-white hover:bg-rose-700 shadow-2xs cursor-pointer"
                                >
                                  <IconUserX size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Suspend Company</TooltipContent>
                            </Tooltip>
                          )
                        )}

                        {/* 7. Login Disable / Enable: Power Icon */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-xs"
                              onClick={() => onToggleStatus(c.id, isLoginAllowed)}
                              className={
                                "size-7 rounded-md text-white shadow-2xs cursor-pointer " +
                                (isLoginAllowed
                                  ? "bg-amber-600 hover:bg-amber-700"
                                  : "bg-emerald-500 hover:bg-emerald-600")
                              }
                            >
                              <IconPower size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isLoginAllowed ? "Disable Login" : "Enable Login"}
                          </TooltipContent>
                        </Tooltip>

                        {/* 8. Edit: Teal */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-xs"
                              onClick={() => onEdit(c)}
                              className="size-7 rounded-md bg-teal-500 text-white hover:bg-teal-600 shadow-2xs cursor-pointer"
                            >
                              <IconPencil size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>

                        {/* 9. Delete: Red */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-xs"
                              onClick={() => onDelete(c)}
                              className="size-7 rounded-md bg-red-500 text-white hover:bg-red-600 shadow-2xs cursor-pointer"
                            >
                              <IconTrash size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
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
