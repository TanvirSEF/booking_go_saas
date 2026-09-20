"use client";

import * as React from "react";
import {
  IconCheck,
  IconDotsVertical,
  IconEdit,
  IconLock,
  IconPlus,
  IconRefresh,
  IconShieldLock,
  IconTrash,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  getCompanyRolesAction,
  deleteRoleAction,
} from "@/actions/role-permission";
import { RoleDialog } from "@/components/dashboard/roles/role-dialog";
import type {
  RoleDTO,
  PermissionModuleGroup,
} from "@/types/role-permission";

interface RolesTableProps {
  initialRoles: RoleDTO[];
  moduleGroups: PermissionModuleGroup[];
}

export function RolesTable({
  initialRoles,
  moduleGroups,
}: RolesTableProps) {
  const [roles, setRoles] = React.useState<RoleDTO[]>(initialRoles);
  const [isLoading, setIsLoading] = React.useState(false);

  // Create / Edit Modal State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<RoleDTO | null>(null);

  // Delete State
  const [deletingRole, setDeletingRole] = React.useState<RoleDTO | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await getCompanyRolesAction();
      if (res.success && res.data) {
        setRoles(res.data);
      }
    } catch {
      toast.error("Failed to load roles.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    setIsDeleting(true);

    try {
      const res = await deleteRoleAction(deletingRole.id);
      if (res.success) {
        toast.success(res.message || `Role "${deletingRole.name}" deleted successfully!`);
        setDeletingRole(null);
        fetchRoles();
      } else {
        toast.error(res.error || "Failed to delete role.");
      }
    } catch {
      toast.error("An error occurred while deleting role.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingRole(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (r: RoleDTO) => {
    setEditingRole(r);
    setIsDialogOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Top Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Configured Roles ({roles.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage system permissions, access scopes, and role assignments for all company staff.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={fetchRoles}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="h-8 text-xs font-medium gap-1.5 shadow-2xs shrink-0"
            >
              <IconRefresh size={14} className={isLoading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5 shadow-2xs shrink-0"
            >
              <IconPlus size={15} />
              <span>Create New Role</span>
            </Button>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((r) => {
            const isSystemDefault = r.isDefault;

            return (
              <div
                key={r.id}
                className="group relative rounded-2xl border border-border/70 bg-card p-5 shadow-2xs hover:border-border hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header: Icon, Name & Status Badges */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-2xs">
                        <IconShieldLock size={20} />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-foreground truncate">
                            {r.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {r.description || "No description provided"}
                        </p>
                      </div>
                    </div>

                    {/* Actions Menu */}
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
                      <DropdownMenuContent align="end" className="w-44 rounded-xl p-1 shadow-lg text-xs">
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(r)}
                          className="cursor-pointer gap-2"
                        >
                          <IconEdit size={14} />
                          <span>Edit Permissions</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {isSystemDefault ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <DropdownMenuItem
                                  disabled
                                  className="cursor-not-allowed gap-2 text-muted-foreground opacity-50"
                                >
                                  <IconLock size={14} />
                                  <span>Delete Role</span>
                                </DropdownMenuItem>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              Default system roles cannot be deleted.
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setDeletingRole(r)}
                            className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                          >
                            <IconTrash size={14} />
                            <span>Delete Role</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badges: Default Status & Scope */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {isSystemDefault ? (
                      <Badge variant="secondary" className="text-[10px] font-semibold gap-1">
                        <IconLock size={10} />
                        <span>System Default</span>
                      </Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
                        Custom Role
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Role Metrics Bar */}
                <div className="grid grid-cols-2 gap-2 py-3 border-y border-border/50 text-center text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground text-sm flex items-center justify-center gap-1">
                      <IconUsers size={14} className="text-muted-foreground" />
                      <span>{r.staffCount}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">Assigned Staff</p>
                  </div>

                  <div className="space-y-0.5 border-l border-border/50">
                    <p className="font-bold text-foreground text-sm flex items-center justify-center gap-1">
                      <IconCheck size={14} className="text-primary" />
                      <span>{r.permissions?.length || 0}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">Permissions</p>
                  </div>
                </div>

                {/* Bottom Quick Action */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    {isSystemDefault ? "Protected platform role" : "Customizable privileges"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(r)}
                    className="h-7 text-xs font-semibold gap-1 shadow-2xs"
                  >
                    <IconEdit size={12} />
                    <span>Configure</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create / Edit Dialog */}
        <RoleDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          role={editingRole}
          moduleGroups={moduleGroups}
          onSaved={fetchRoles}
        />

        {/* Delete Confirmation Alert */}
        <Dialog open={Boolean(deletingRole)} onOpenChange={(open) => !open && setDeletingRole(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <IconTrash size={18} />
                Delete Custom Role
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Are you sure you want to permanently delete the role <strong>&quot;{deletingRole?.name}&quot;</strong>?
                {deletingRole && deletingRole.staffCount > 0 && (
                  <span className="block mt-2 font-semibold text-amber-600 dark:text-amber-400">
                    ⚠️ Warning: {deletingRole.staffCount} staff member(s) are currently assigned to this role and will fallback to standard default access.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingRole(null)}
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
                {isDeleting ? "Deleting..." : "Delete Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
