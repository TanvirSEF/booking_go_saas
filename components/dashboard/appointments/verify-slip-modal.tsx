"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconCheck,
  IconX,
  IconBuildingBank,
  IconLoader2,
  IconFileText,
  IconDownload,
  IconUser,
  IconAlertCircle,
  IconExternalLink,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { verifyBankTransferSlipAction } from "@/actions/appointment-management";
import type { AdminAppointmentDTO } from "@/types/appointment-management";

interface VerifySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AdminAppointmentDTO | null;
  onSuccess?: () => void;
}

export function VerifySlipModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: VerifySlipModalProps) {
  const router = useRouter();
  const [adminNote, setAdminNote] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!appointment) return null;

  const isPdf = appointment.attachment?.toLowerCase().endsWith(".pdf");

  const handleDecision = async (decision: "approve" | "reject") => {
    if (decision === "reject" && !showRejectForm) {
      setShowRejectForm(true);
      return;
    }

    try {
      setIsPending(true);
      const res = await verifyBankTransferSlipAction({
        appointmentId: appointment._id,
        decision,
        adminNote: adminNote.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          decision === "approve"
            ? "Bank transfer approved and booking confirmed!"
            : "Bank transfer slip rejected."
        );
        onClose();
        setShowRejectForm(false);
        setAdminNote("");
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to process bank transfer verification.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <IconBuildingBank className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Verify Bank Transfer Slip
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Booking Reference: <span className="font-mono font-semibold text-foreground">{appointment.appointmentNumber}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Customer & Service Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3.5 rounded-lg border border-border/60 bg-muted/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <IconUser className="w-3.5 h-3.5" />
                Customer Info
              </div>
              <p className="font-medium text-foreground">{appointment.name}</p>
              <p className="text-xs text-muted-foreground truncate">{appointment.email}</p>
              {appointment.contact && (
                <p className="text-xs text-muted-foreground">{appointment.contact}</p>
              )}
            </div>

            <div className="p-3.5 rounded-lg border border-border/60 bg-muted/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <IconFileText className="w-3.5 h-3.5" />
                Service & Amount
              </div>
              <p className="font-medium text-foreground">{appointment.serviceName}</p>
              <p className="text-xs text-muted-foreground">
                Date: {appointment.date} ({appointment.time})
              </p>
              <p className="text-sm font-bold text-primary">
                Amount Due: ${Number(appointment.servicePrice || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Notes & Bank Details */}
          {appointment.notes && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold block mb-0.5">Customer / Bank Notes:</span>
              <p className="whitespace-pre-wrap">{appointment.notes}</p>
            </div>
          )}

          {/* Receipt Slip Previewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Deposit Slip Document</Label>
              {appointment.attachment && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-7 text-xs gap-1 text-primary"
                  >
                    <a href={appointment.attachment} target="_blank" rel="noopener noreferrer">
                      <IconExternalLink className="w-3.5 h-3.5" />
                      Open Full Screen
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-7 text-xs gap-1"
                  >
                    <a href={appointment.attachment} download>
                      <IconDownload className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </Button>
                </div>
              )}
            </div>

            {appointment.attachment ? (
              <div className="relative border border-border/80 rounded-xl overflow-hidden bg-muted/40 min-h-[220px] max-h-[380px] flex items-center justify-center">
                {isPdf ? (
                  <iframe
                    src={appointment.attachment}
                    className="w-full h-[360px] border-0"
                    title="Bank Receipt PDF"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={appointment.attachment}
                    alt="Bank Deposit Slip"
                    className="max-h-[360px] w-auto max-w-full object-contain rounded-lg p-2"
                  />
                )}
              </div>
            ) : (
              <div className="py-10 text-center border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                <IconAlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                No receipt file was attached to this booking.
              </div>
            )}
          </div>

          {/* Rejection / Verification Note Form */}
          {showRejectForm && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label htmlFor="admin-rejection-note" className="text-xs font-semibold text-destructive">
                Reason for Rejection (Recorded in appointment notes)
              </Label>
              <Textarea
                id="admin-rejection-note"
                placeholder="e.g. Transaction reference is invalid or amount does not match..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="resize-none text-sm min-h-[70px]"
                disabled={isPending}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
            <Button
              variant="destructive"
              onClick={() => handleDecision("reject")}
              disabled={isPending}
              className="gap-1.5 flex-1 sm:flex-initial"
            >
              {isPending ? <IconLoader2 className="w-4 h-4 animate-spin" /> : <IconX className="w-4 h-4" />}
              {showRejectForm ? "Confirm Rejection" : "Reject Slip"}
            </Button>

            {!showRejectForm && (
              <Button
                onClick={() => handleDecision("approve")}
                disabled={isPending || !appointment.attachment}
                className="gap-1.5 flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isPending ? <IconLoader2 className="w-4 h-4 animate-spin" /> : <IconCheck className="w-4 h-4" />}
                Approve & Mark Paid
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
