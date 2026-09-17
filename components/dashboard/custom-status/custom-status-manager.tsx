"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconEdit,
  IconTrash,
  IconSparkles,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddEditStatusModal } from "@/components/dashboard/custom-status/add-edit-status-modal";
import { StatusBadgePreview } from "@/components/dashboard/custom-status/status-badge-preview";
import {
  getCustomStatusesAction,
  deleteCustomStatusAction,
  reorderCustomStatusesAction,
} from "@/actions/custom-status";
import type { CustomStatusDTO } from "@/types/custom-status";

interface CustomStatusManagerProps {
  initialStatuses: CustomStatusDTO[];
}

export function CustomStatusManager({ initialStatuses }: CustomStatusManagerProps) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<CustomStatusDTO[]>(initialStatuses);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusToEdit, setStatusToEdit] = useState<CustomStatusDTO | null>(null);
  const [statusToDelete, setStatusToDelete] = useState<CustomStatusDTO | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshStatuses = () => {
    startTransition(async () => {
      try {
        const res = await getCustomStatusesAction();
        if (res.success && res.data) {
          setStatuses(res.data);
          router.refresh();
        }
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleOpenCreate = () => {
    setStatusToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (status: CustomStatusDTO) => {
    setStatusToEdit(status);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!statusToDelete) return;

    try {
      const res = await deleteCustomStatusAction(statusToDelete.id);
      if (res.success) {
        toast.success(res.message || "Status deleted successfully.");
        setStatuses((prev) => prev.filter((s) => s.id !== statusToDelete.id));
        setStatusToDelete(null);
        router.refresh();
      } else {
        toast.error(res.error || "Cannot delete status.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete status.");
    }
  };

  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= statuses.length) return;

    const newStatuses = [...statuses];
    const temp = newStatuses[index];
    newStatuses[index] = newStatuses[targetIndex];
    newStatuses[targetIndex] = temp;

    setStatuses(newStatuses);

    try {
      const orderedIds = newStatuses.map((s) => s.id);
      const res = await reorderCustomStatusesAction({ orderedIds });
      if (res.success) {
        toast.success("Order updated!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update order.");
        refreshStatuses();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update order.");
      refreshStatuses();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Custom Pipeline Stages
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure custom appointment statuses, color tags, and pipeline sequence.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="gap-1.5 text-xs font-semibold h-9 shadow-xs"
        >
          <IconPlus className="w-4 h-4" />
          Create Status
        </Button>
      </div>

      {/* Status Table */}
      <Card className="border-border/60 bg-card text-card-foreground shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[80px] text-xs font-bold uppercase text-muted-foreground">
                  Order
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground">
                  Status Preview
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground">
                  Color Code
                </TableHead>
                <TableHead className="w-[120px] text-center text-xs font-bold uppercase text-muted-foreground">
                  Sequence
                </TableHead>
                <TableHead className="w-[120px] text-right text-xs font-bold uppercase text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {statuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                        <IconSparkles className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-foreground text-base">
                        No custom statuses configured yet
                      </p>
                      <p className="text-xs max-w-sm">
                        Add customized appointment statuses like &quot;In Inspection&quot; or &quot;Parts Ordered&quot; to manage your service workflow.
                      </p>
                      <Button
                        onClick={handleOpenCreate}
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1.5 text-xs"
                      >
                        <IconPlus className="w-3.5 h-3.5" />
                        Create First Status
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                statuses.map((status, index) => (
                  <TableRow key={status.id} className="hover:bg-muted/20 transition-colors">
                    {/* Position Number */}
                    <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                      #{index + 1}
                    </TableCell>

                    {/* Live Badge Preview */}
                    <TableCell>
                      <StatusBadgePreview
                        title={status.title}
                        statusColor={status.statusColor}
                        icon={status.icon}
                      />
                    </TableCell>

                    {/* Color Swatch & Hex */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-border shrink-0 shadow-2xs"
                          style={{ backgroundColor: status.statusColor }}
                        />
                        <span className="font-mono text-xs font-medium text-muted-foreground uppercase">
                          {status.statusColor}
                        </span>
                      </div>
                    </TableCell>

                    {/* Sequence Order Controls */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === 0 || isPending}
                          onClick={() => handleMoveOrder(index, "up")}
                          title="Move up"
                        >
                          <IconArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === statuses.length - 1 || isPending}
                          onClick={() => handleMoveOrder(index, "down")}
                          title="Move down"
                        >
                          <IconArrowDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(status)}
                          title="Edit status"
                        >
                          <IconEdit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setStatusToDelete(status)}
                          title="Delete status"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Status Modal */}
      <AddEditStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        statusToEdit={statusToEdit}
        onSuccess={refreshStatuses}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!statusToDelete}
        onOpenChange={(open: boolean) => !open && setStatusToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Delete Custom Status
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete status &quot;{statusToDelete?.title}&quot;? If this status is assigned to any active appointments, the action will be blocked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusToDelete(null)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="text-xs h-9"
            >
              Delete Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
