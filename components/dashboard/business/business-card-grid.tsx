"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconBuildingStore,
  IconCalendarEvent,
  IconCheck,
  IconDotsVertical,
  IconEdit,
  IconExternalLink,
  IconMapPin,
  IconPlus,
  IconScissors,
  IconSwitchHorizontal,
  IconTrash,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreateBusinessDialog } from "@/components/dashboard/business/create-business-dialog";
import { EditBusinessSheet } from "@/components/dashboard/business/edit-business-sheet";
import {
  getCompanyBusinessesAction,
  switchActiveBusinessAction,
  deleteBusinessAction,
} from "@/actions/business";
import type { BusinessDTO } from "@/types/business";

interface BusinessCardGridProps {
  initialBusinesses: BusinessDTO[];
  activeBusinessId?: string;
}

export function BusinessCardGrid({
  initialBusinesses,
  activeBusinessId: initialActiveId,
}: BusinessCardGridProps) {
  const router = useRouter();
  const [businesses, setBusinesses] = React.useState<BusinessDTO[]>(initialBusinesses);
  const [activeId, setActiveId] = React.useState<string>(
    initialActiveId || (initialBusinesses.length > 0 ? initialBusinesses[0].id : "")
  );
  const [isLoading, setIsLoading] = React.useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingBusiness, setEditingBusiness] = React.useState<BusinessDTO | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  // Deletion modal state
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchBusinesses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getCompanyBusinessesAction();
      if (res.success && res.data) {
        setBusinesses(res.data);
      }
    } catch {
      toast.error("Failed to load businesses");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSwitchBranch = async (b: BusinessDTO) => {
    if (b.id === activeId) return;

    try {
      const res = await switchActiveBusinessAction(b.id);
      if (res.success) {
        setActiveId(b.id);
        toast.success(`Switched to ${b.name}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to switch active branch");
      }
    } catch {
      toast.error("Failed to switch branch");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);

    try {
      const res = await deleteBusinessAction(deletingId);
      if (res.success) {
        toast.success("Business branch removed successfully");
        setDeletingId(null);
        if (res.data?.activeBusinessId) {
          setActiveId(res.data.activeBusinessId);
        }
        fetchBusinesses();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete business branch");
      }
    } catch {
      toast.error("Failed to delete business branch");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">
            All Company Branches ({businesses.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Switch between business branches to manage isolated bookings, staff, and services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchBusinesses()}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="font-medium gap-1.5 shadow-2xs shrink-0 text-xs"
          >
            <IconRefresh size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="font-semibold gap-1.5 shadow-2xs shrink-0 text-xs"
          >
            <IconPlus size={15} />
            <span>Add New Branch</span>
          </Button>
        </div>
      </div>

      {/* Grid of Cards */}
      {businesses.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-12 text-center flex flex-col items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
            <IconBuildingStore size={28} />
          </div>
          <h3 className="font-bold text-base text-foreground">No Business Branches Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Create your primary branch to configure locations, staff members, and scheduling.
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="mt-4 gap-1.5 text-xs font-semibold"
          >
            <IconPlus size={14} />
            <span>Create First Branch</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {businesses.map((b) => {
            const isActive = b.id === activeId;
            const stats = b.stats || {
              locationsCount: 0,
              servicesCount: 0,
              staffCount: 0,
              appointmentsCount: 0,
            };

            return (
              <div
                key={b.id}
                className={`group relative rounded-2xl border bg-card p-5 shadow-2xs transition-all flex flex-col justify-between space-y-4 ${
                  isActive
                    ? "border-primary ring-1 ring-primary/20 shadow-sm"
                    : "border-border/70 hover:border-border hover:shadow-xs"
                }`}
              >
                {/* Card Header: Icon, Name, Active Badge & Menu */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      }`}
                    >
                      <IconBuildingStore size={20} />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-foreground truncate">
                          {b.name}
                        </h3>
                        {isActive && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] font-bold px-1.5 py-0 h-4">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground truncate">
                        /appointments/{b.slug}
                      </p>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
                      >
                        <IconDotsVertical size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-lg text-xs">
                      {!isActive && (
                        <DropdownMenuItem
                          onClick={() => handleSwitchBranch(b)}
                          className="cursor-pointer gap-2 font-semibold text-primary"
                        >
                          <IconSwitchHorizontal size={14} />
                          <span>Switch to This Branch</span>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => {
                          setEditingBusiness(b);
                          setIsEditOpen(true);
                        }}
                        className="cursor-pointer gap-2"
                      >
                        <IconEdit size={14} />
                        <span>Edit Settings</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild className="cursor-pointer gap-2">
                        <Link href={`/appointments/${b.slug}`} target="_blank">
                          <IconExternalLink size={14} />
                          <span>View Public Page</span>
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => setDeletingId(b.id)}
                        disabled={businesses.length <= 1}
                        className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                      >
                        <IconTrash size={14} />
                        <span>Delete Branch</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Configuration Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="outline" className="text-[10px] font-medium border-border/60">
                    Currency: <strong className="ml-1 text-foreground">{b.currencySymbol} {b.currency}</strong>
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-medium border-border/60">
                    Prefix: <strong className="ml-1 font-mono text-foreground">{b.appointmentPrefix}</strong>
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-medium border-border/60">
                    Max Slots: <strong className="ml-1 text-foreground">{b.maximumSlot}</strong>
                  </Badge>
                </div>

                {/* Branch Entity Stats */}
                <div className="grid grid-cols-4 gap-2 py-3 border-y border-border/50 text-center text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground text-sm">{stats.locationsCount}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                      <IconMapPin size={10} />
                      <span>Loc</span>
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground text-sm">{stats.servicesCount}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                      <IconScissors size={10} />
                      <span>Serv</span>
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground text-sm">{stats.staffCount}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                      <IconUsers size={10} />
                      <span>Staff</span>
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground text-sm">{stats.appointmentsCount}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                      <IconCalendarEvent size={10} />
                      <span>Appt</span>
                    </p>
                  </div>
                </div>

                {/* Bottom Card Action */}
                <div className="flex items-center justify-between pt-1">
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-primary gap-1 px-2">
                    <Link href={`/appointments/${b.slug}`} target="_blank">
                      <span>Public Storefront</span>
                      <IconExternalLink size={12} />
                    </Link>
                  </Button>

                  {isActive ? (
                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <IconCheck size={14} />
                      <span>Currently Active</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSwitchBranch(b)}
                      className="h-7 text-xs font-semibold gap-1 hover:bg-primary hover:text-primary-foreground shadow-2xs"
                    >
                      <IconSwitchHorizontal size={13} />
                      <span>Switch</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateBusinessDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={fetchBusinesses}
      />

      {/* Edit Sheet */}
      <EditBusinessSheet
        business={editingBusiness}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSaved={fetchBusinesses}
      />

      {/* Delete Confirmation Alert */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <IconTrash size={18} />
              Delete Business Branch
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure? All services, staff assignments, custom statuses, and booking records under this branch will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
