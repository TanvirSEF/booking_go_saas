"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconUserCheck,
  IconLayoutList,
  IconLayoutGrid,
  IconPlus,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { getCompaniesAction } from "@/actions/admin-company";
import {
  toggleUserLoginAccessAction,
  reactivateUserAction,
} from "@/actions/user-management";
import { SuspendUserModal } from "@/components/modals/suspend-user-modal";
import { UserStatusDetailsModal } from "@/components/modals/user-status-details-modal";

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
  const [isPending, startTransition] = useTransition();

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

  // Security / Suspension State
  const [suspendTarget, setSuspendTarget] = useState<CompanyItem | null>(null);
  const [securityDetailsTarget, setSecurityDetailsTarget] = useState<{
    userId: string;
    userName: string;
    email: string;
    role: string;
  } | null>(null);
  const [confirmLoginTarget, setConfirmLoginTarget] = useState<{
    company: CompanyItem;
    currentAllowed: boolean;
  } | null>(null);

  // Refetch companies immediately upon changes
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

  function handleInitiateToggleLogin(companyId: string, currentAllowed: boolean) {
    const target = companies.find((c) => c.id === companyId);
    if (!target) return;

    if (currentAllowed) {
      // Disabling login -> show warning confirmation dialog
      setConfirmLoginTarget({ company: target, currentAllowed: true });
    } else {
      // Enabling login -> run immediately
      executeToggleLogin(target);
    }
  }

  function executeToggleLogin(company: CompanyItem) {
    startTransition(async () => {
      const res = await toggleUserLoginAccessAction({ userId: company.id });
      if (res.success) {
        toast.success(res.message || "Login access updated successfully.");
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === company.id
              ? { ...c, isEnableLogin: res.isEnableLogin }
              : c
          )
        );
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update login access.");
      }
    });
  }

  function handleReactivate(company: CompanyItem) {
    startTransition(async () => {
      const res = await reactivateUserAction({ userId: company.id });
      if (res.success) {
        toast.success(res.message || "Company reactivated successfully.");
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === company.id
              ? {
                  ...c,
                  isActive: true,
                  isEnableLogin: true,
                  suspendedReason: null,
                  suspendedAt: null,
                }
              : c
          )
        );
        router.refresh();
      } else {
        toast.error(res.error || "Failed to reactivate company.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
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

        {/* Right 3 action buttons */}
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
              onToggleStatus={handleInitiateToggleLogin}
              onSuspend={setSuspendTarget}
              onReactivate={handleReactivate}
              onViewSecurity={(c) =>
                setSecurityDetailsTarget({
                  userId: c.id,
                  userName: c.name,
                  email: c.email,
                  role: c.role,
                })
              }
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
          onToggleStatus={handleInitiateToggleLogin}
          onSuspend={setSuspendTarget}
          onReactivate={handleReactivate}
          onViewSecurity={(c) =>
            setSecurityDetailsTarget({
              userId: c.id,
              userName: c.name,
              email: c.email,
              role: c.role,
            })
          }
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

      {/* Suspension Modal */}
      {suspendTarget && (
        <SuspendUserModal
          open={!!suspendTarget}
          onOpenChange={(open) => !open && setSuspendTarget(null)}
          userId={suspendTarget.id}
          userName={suspendTarget.name}
          userEmail={suspendTarget.email}
          userRole={suspendTarget.role}
          onSuccess={() => {
            handleCompaniesChanged();
          }}
        />
      )}

      {/* Security Telemetry Details Modal */}
      {securityDetailsTarget && (
        <UserStatusDetailsModal
          key={securityDetailsTarget.userId}
          open={!!securityDetailsTarget}
          onOpenChange={(open) => !open && setSecurityDetailsTarget(null)}
          userId={securityDetailsTarget.userId}
          userName={securityDetailsTarget.userName}
          email={securityDetailsTarget.email}
          role={securityDetailsTarget.role}
        />
      )}

      {/* Confirm Disable Login Dialog */}
      <Dialog
        open={!!confirmLoginTarget}
        onOpenChange={(open: boolean) => !open && setConfirmLoginTarget(null)}
      >
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <IconAlertTriangle size={20} />
              <DialogTitle className="text-base font-bold text-foreground">
                Disable Login Access?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              Are you sure you want to disable login for{" "}
              <strong className="text-foreground">{confirmLoginTarget?.company.name}</strong>?
              This will immediately terminate all active sessions and block further sign-ins.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setConfirmLoginTarget(null)}
              className="rounded-lg text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (confirmLoginTarget) {
                  executeToggleLogin(confirmLoginTarget.company);
                  setConfirmLoginTarget(null);
                }
              }}
              className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
            >
              {isPending ? "Disabling..." : "Disable Login"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
