"use client";

import * as React from "react";
import {
  IconCheck,
  IconCheckbox,
  IconLoader2,
  IconSearch,
  IconShieldLock,
  IconSquare,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  createRoleAction,
  updateRoleAction,
} from "@/actions/role-permission";
import type {
  RoleDTO,
  PermissionModuleGroup,
} from "@/types/role-permission";

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: RoleDTO | null;
  moduleGroups: PermissionModuleGroup[];
  onSaved: () => void;
}

interface RoleFormInnerProps {
  role?: RoleDTO | null;
  moduleGroups: PermissionModuleGroup[];
  onClose: () => void;
  onSaved: () => void;
}

function RoleFormInner({
  role,
  moduleGroups,
  onClose,
  onSaved,
}: RoleFormInnerProps) {
  const isEditing = Boolean(role);

  const [name, setName] = React.useState(role?.name || "");
  const [description, setDescription] = React.useState(role?.description || "");
  const [selectedPermissions, setSelectedPermissions] = React.useState<Set<string>>(
    () => new Set(role?.permissions || [])
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const togglePermission = (permKey: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permKey)) {
        next.delete(permKey);
      } else {
        next.add(permKey);
      }
      return next;
    });
  };

  const toggleModuleAll = (moduleGroup: PermissionModuleGroup) => {
    const groupKeys = moduleGroup.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => selectedPermissions.has(k));

    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupKeys.forEach((k) => next.delete(k));
      } else {
        groupKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const handleSelectAllGlobal = () => {
    const allKeys = moduleGroups.flatMap((g) => g.permissions.map((p) => p.key));
    const allSelected = allKeys.every((k) => selectedPermissions.has(k));

    if (allSelected) {
      setSelectedPermissions(new Set());
    } else {
      setSelectedPermissions(new Set(allKeys));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Role name must be at least 2 characters.");
      return;
    }

    if (selectedPermissions.size === 0) {
      toast.error("Please select at least one permission for this role.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && role) {
        const res = await updateRoleAction({
          id: role.id,
          name: name.trim(),
          description: description.trim(),
          permissions: Array.from(selectedPermissions),
        });

        if (res.success) {
          toast.success(res.message || `Role "${name.trim()}" updated successfully!`);
          onSaved();
          onClose();
        } else {
          toast.error(res.error || "Failed to update role.");
        }
      } else {
        const res = await createRoleAction({
          name: name.trim(),
          description: description.trim(),
          permissions: Array.from(selectedPermissions),
        });

        if (res.success) {
          toast.success(res.message || `Custom role "${name.trim()}" created successfully!`);
          onSaved();
          onClose();
        } else {
          toast.error(res.error || "Failed to create role.");
        }
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredModuleGroups = React.useMemo(() => {
    if (!searchQuery.trim()) return moduleGroups;
    const q = searchQuery.toLowerCase().trim();

    return moduleGroups
      .map((g) => {
        const matchingPerms = g.permissions.filter(
          (p) =>
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.key.toLowerCase().includes(q) ||
            g.module.toLowerCase().includes(q)
        );
        return {
          ...g,
          permissions: matchingPerms,
        };
      })
      .filter((g) => g.permissions.length > 0);
  }, [moduleGroups, searchQuery]);

  const totalPossiblePerms = moduleGroups.reduce((acc, g) => acc + g.permissions.length, 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      <DialogHeader className="p-5 border-b border-border/60 bg-muted/20 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconShieldLock size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {isEditing ? `Edit Role: ${role?.name}` : "Create Custom Role"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Define role identity and configure granular module permissions across your business.
              </DialogDescription>
            </div>
          </div>

          <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
            {selectedPermissions.size} of {totalPossiblePerms} Perms Selected
          </Badge>
        </div>
      </DialogHeader>

      <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="role-name" className="text-xs font-semibold text-foreground">
              Role Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senior Specialist, Shift Lead"
              className="text-xs h-9 font-medium"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-description" className="text-xs font-semibold text-foreground">
              Description <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what this role is responsible for"
              className="text-xs h-9"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Module Permissions Matrix
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Select granular privileges granted to staff members assigned to this role.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <IconSearch size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Filter permissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-muted/30"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllGlobal}
                className="h-8 text-xs font-medium shrink-0 gap-1"
              >
                {selectedPermissions.size === totalPossiblePerms ? (
                  <>
                    <IconSquare size={13} />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <IconCheckbox size={13} />
                    <span>Select All</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredModuleGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
                No permissions match &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredModuleGroups.map((group) => {
                const groupKeys = group.permissions.map((p) => p.key);
                const selectedCount = groupKeys.filter((k) => selectedPermissions.has(k)).length;
                const isAllGroupSelected = selectedCount === groupKeys.length;

                return (
                  <div
                    key={group.module}
                    className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-2xs"
                  >
                    <div className="bg-muted/30 px-4 py-2.5 border-b border-border/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">
                          {group.label || group.module}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                          {selectedCount}/{group.permissions.length}
                        </Badge>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleModuleAll(group)}
                        className="h-6 px-2 text-[11px] font-semibold text-primary hover:text-primary"
                      >
                        {isAllGroupSelected ? "Deselect Group" : "Select All in Group"}
                      </Button>
                    </div>

                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {group.permissions.map((perm) => {
                        const isChecked = selectedPermissions.has(perm.key);

                        return (
                          <label
                            key={perm.key}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isChecked
                                ? "border-primary/50 bg-primary/5 shadow-2xs"
                                : "border-border/50 bg-background/50 hover:bg-muted/30 hover:border-border"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => togglePermission(perm.key)}
                              className="mt-0.5"
                            />
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-foreground leading-none">
                                  {perm.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-snug">
                                {perm.description}
                              </p>
                              <code className="text-[10px] font-mono text-muted-foreground/80 block pt-0.5">
                                {perm.key}
                              </code>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="font-semibold gap-1.5 shadow-2xs"
        >
          {isSubmitting ? (
            <>
              <IconLoader2 size={14} className="animate-spin" />
              <span>Saving Role...</span>
            </>
          ) : (
            <>
              <IconCheck size={14} />
              <span>{isEditing ? "Update Role" : "Create Role"}</span>
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RoleDialog({
  open,
  onOpenChange,
  role,
  moduleGroups,
  onSaved,
}: RoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border-border">
        {open && (
          <RoleFormInner
            key={role?.id || "new-role"}
            role={role}
            moduleGroups={moduleGroups}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
