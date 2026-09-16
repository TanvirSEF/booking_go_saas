"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconDownload,
  IconRotate2,
  IconRefresh,
  IconSearch,
  IconUser,
  IconApps,
  IconSwitchHorizontal,
  IconTrendingUp,
  IconAdjustmentsHorizontal,
  IconPencil,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
  IconArrowsSort,
  IconPower,
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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompanyItem } from "./company-dialog";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<"name" | "role" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filtering
  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
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
  }, [companies, searchQuery, sortField, sortOrder]);

  // Pagination
  const pageSize = parseInt(entriesPerPage, 10) || 10;
  const totalEntries = filteredCompanies.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCompanies = filteredCompanies.slice(
    startIndex,
    startIndex + pageSize
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
    setSearchQuery("");
    setSortField(null);
    setCurrentPage(1);
    toast.info("Search and filters reset.");
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-4 shadow-xs">
      {/* Top Toolbar matching table-view.png */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Entries Per Page */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
            <SelectTrigger className="h-8 w-16 rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-16">
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

        {/* Right: Actions & Search */}
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

          {/* Search Input */}
          <div className="relative">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 w-44 rounded-lg pl-8 text-xs sm:w-56"
            />
            <IconSearch
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
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
                  className="h-28 text-center text-muted-foreground"
                >
                  No subscribers found.
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
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {totalEntries > 0 ? startIndex + 1 : 0} to{" "}
          {Math.min(startIndex + pageSize, totalEntries)} of {totalEntries} entries
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-xs"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="size-7 rounded-lg"
          >
            <IconChevronLeft size={14} />
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              size="icon-xs"
              variant={currentPage === page ? "default" : "outline"}
              onClick={() => setCurrentPage(page)}
              className={`size-7 rounded-lg text-xs ${
                currentPage === page
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground"
              }`}
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="icon-xs"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="size-7 rounded-lg"
          >
            <IconChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
