"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import {
  IconCheck,
  IconX,
  IconLoader2,
  IconAlertTriangle,
  IconSparkles,
} from "@tabler/icons-react";
import {
  approveBankTransferPaymentAction,
  rejectBankTransferPaymentAction,
} from "@/actions/bank-transfer";
import type { BankTransferPaymentDTO } from "@/types/bank-transfer";

interface ReviewPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: BankTransferPaymentDTO | null;
  mode: "Approve" | "Reject";
  onSuccess?: () => void;
}

const REJECTION_PRESETS = [
  "Funds not received in institutional account.",
  "Blurry or unreadable deposit receipt slip.",
  "Wire transaction reference could not be verified.",
  "Payment amount does not match invoice total.",
  "Duplicate receipt submission.",
];

export function ReviewPaymentDialog({
  isOpen,
  onClose,
  payment,
  mode,
  onSuccess,
}: ReviewPaymentDialogProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = () => {
    setRejectionReason("");
    setErrorMessage(null);
    onClose();
  };

  if (!payment) return null;

  const isApprove = mode === "Approve";

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!isApprove && !rejectionReason.trim()) {
      setErrorMessage("Please enter a reason for rejecting this payment transfer.");
      return;
    }

    try {
      setIsPending(true);

      if (isApprove) {
        const res = await approveBankTransferPaymentAction(payment.id);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to approve bank transfer.");
          return;
        }

        toast.success(
          `Payment approved! ${payment.companyName || "Company"}'s account has been upgraded to ${payment.planName || "Plan"}.`
        );
      } else {
        const res = await rejectBankTransferPaymentAction({
          paymentId: payment.id,
          action: "Reject",
          rejectionReason: rejectionReason.trim(),
        });

        if (!res.success) {
          setErrorMessage(res.error || "Failed to reject bank transfer.");
          return;
        }

        toast.success(
          `Bank transfer request has been rejected. Notification sent to company.`
        );
      }

      handleClose();
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isPending && handleClose()}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${
                isApprove
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
              }`}
            >
              {isApprove ? <IconCheck size={20} stroke={2.5} /> : <IconX size={20} stroke={2.5} />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {isApprove ? "Approve Bank Transfer" : "Reject Bank Transfer"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Order <span className="font-mono font-semibold text-foreground">{payment.orderNumber || payment.orderId}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Summary Card */}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Company:</span>
              <span className="font-semibold text-foreground">{payment.companyName || "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Plan:</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[11px] font-medium capitalize">
                  {payment.planName || "SaaS Plan"}
                </Badge>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium text-foreground capitalize">{payment.billingCycle}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Transfer Amount:</span>
              <span className="text-sm font-bold text-primary">
                ${payment.price.toFixed(2)} {payment.currency}
              </span>
            </div>
            {payment.transactionRef && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Transaction Ref:</span>
                <span className="font-mono text-foreground">{payment.transactionRef}</span>
              </div>
            )}
          </div>

          {isApprove ? (
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <IconSparkles size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <p className="leading-relaxed">
                Are you sure you want to approve this transfer? The company&apos;s account will be immediately upgraded to{" "}
                <strong className="font-semibold text-foreground">{payment.planName || "Plan"}</strong> for{" "}
                <strong className="font-semibold text-foreground">{payment.billingCycle}</strong> billing and an instant confirmation notification will be sent.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rejection-reason" className="text-xs font-semibold text-foreground">
                  Reason for Rejection <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rejection-reason"
                  rows={3}
                  placeholder="Explain why this transfer cannot be approved..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="text-xs resize-none"
                  disabled={isPending}
                />
              </div>

              {/* Preset suggestion chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {REJECTION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <IconAlertTriangle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
            className="cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || (!isApprove && !rejectionReason.trim())}
            className={`cursor-pointer gap-1.5 font-medium ${
              isApprove
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            }`}
          >
            {isPending && <IconLoader2 size={14} className="animate-spin" />}
            {isApprove ? "Confirm Approval" : "Confirm Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
