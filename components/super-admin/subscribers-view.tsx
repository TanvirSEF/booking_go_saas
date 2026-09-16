"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconUserCheck,
  IconLayoutList,
  IconLayoutGrid,
  IconPlus,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CompanyItem,
  PlanOption,
  CreateSubscriberDialog,
  EditSubscriberDialog,
  ResetPasswordDialog,
  DeleteSubscriberDialog,
} from "./company-dialog";
import { CompanyCard } from "./company-card";
import { NewSubscriberCard } from "./new-subscriber-card";
import { CompanyDataTable } from "./company-data-table";
import {
  toggleCompanyStatusAction,
  getCompaniesAction,
} from "@/actions/admin-company";

interface SubscribersViewProps {
  initialCompanies: CompanyItem[];
  plans: PlanOption[];
}

export function SubscribersView({
  initialCompanies,
  plans,
}: SubscribersViewProps) {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyItem[]>(initialCompanies);
  const [prevInitialCompanies, setPrevInitialCompanies] = useState(initialCompanies);

  // Sync state during render when initialCompanies changes without cascading renders
  if (initialCompanies !== prevInitialCompanies) {
    setPrevInitialCompanies(initialCompanies);
    setCompanies(initialCompanies);
  }

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<CompanyItem | null>(null);
  const [resetCompany, setResetCompany] = useState<CompanyItem | null>(null);
  const [deleteCompany, setDeleteCompany] = useState<CompanyItem | null>(null);

  // Refetch companies immediately upon create/edit/delete/reset
  async function handleCompaniesChanged() {
    try {
      const updated = await getCompaniesAction();
      if (Array.isArray(updated)) {
        setCompanies(updated);
      }
    } catch {
      // fallback to router refresh
    }
    router.refresh();
  }

  async function handleToggleStatus(companyId: string, currentStatus: boolean) {
    const nextStatus = !currentStatus;
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, isActive: nextStatus } : c))
    );

    const res = await toggleCompanyStatusAction(companyId, nextStatus);
    if (res.success) {
      toast.success(
        `Subscriber is now ${nextStatus ? "Active" : "Disabled"}`
      );
      router.refresh();
    } else {
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, isActive: currentStatus } : c))
      );
      toast.error(res.error || "Failed to update subscriber status");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header matching screenshots */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Title & Breadcrumbs */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Subscribers
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link
              href="/super-admin"
              className="text-primary hover:underline font-medium"
            >
              Dashboard
            </Link>
            <span>&gt;</span>
            <span className="text-muted-foreground font-medium">
              Subscribers
            </span>
          </div>
        </div>

        {/* Right 3 action buttons matching screenshot */}
        <div className="flex items-center gap-2">
          {/* Staff Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => toast.info("Staff management view")}
                className="size-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-none shadow-xs"
              >
                <IconUserCheck size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Staff Management</TooltipContent>
          </Tooltip>

          {/* View Switcher Button (Grid <-> Table) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setViewMode((prev) => (prev === "grid" ? "table" : "grid"))
                }
                className="size-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-none shadow-xs cursor-pointer"
              >
                {viewMode === "grid" ? (
                  <IconLayoutList size={18} />
                ) : (
                  <IconLayoutGrid size={18} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {viewMode === "grid" ? "Switch to Table View" : "Switch to Grid View"}
            </TooltipContent>
          </Tooltip>

          {/* + Add New Subscriber Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsCreateOpen(true)}
                className="size-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-none shadow-xs cursor-pointer"
              >
                <IconPlus size={18} stroke={2.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create New Subscriber</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onEdit={setEditCompany}
              onDelete={setDeleteCompany}
              onResetPassword={setResetCompany}
              onToggleStatus={handleToggleStatus}
            />
          ))}

          {/* Add New Subscriber Card */}
          <NewSubscriberCard onClick={() => setIsCreateOpen(true)} />
        </div>
      ) : (
        <CompanyDataTable
          companies={companies}
          onEdit={setEditCompany}
          onDelete={setDeleteCompany}
          onResetPassword={setResetCompany}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* Modals */}
      <CreateSubscriberDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        plans={plans}
        onSuccess={handleCompaniesChanged}
      />

      <EditSubscriberDialog
        open={!!editCompany}
        onOpenChange={(open) => !open && setEditCompany(null)}
        company={editCompany}
        plans={plans}
        onSuccess={handleCompaniesChanged}
      />

      <ResetPasswordDialog
        open={!!resetCompany}
        onOpenChange={(open) => !open && setResetCompany(null)}
        company={resetCompany}
        onSuccess={handleCompaniesChanged}
      />

      <DeleteSubscriberDialog
        open={!!deleteCompany}
        onOpenChange={(open) => !open && setDeleteCompany(null)}
        company={deleteCompany}
        onSuccess={handleCompaniesChanged}
      />
    </div>
  );
}
