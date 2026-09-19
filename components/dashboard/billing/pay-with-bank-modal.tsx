"use client";

import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  IconBuildingBank,
  IconCopy,
  IconCheck,
  IconLoader2,
  IconAlertCircle,
  IconShieldCheck,
  IconReceipt,
} from "@tabler/icons-react";
import { BankTransferUploader } from "@/components/wizard/bank-transfer-uploader";
import {
  submitPlanBankTransferAction,
  getBankTransferSettingsAction,
} from "@/actions/bank-transfer";
import type { BankTransferSettingsDTO } from "@/types/bank-transfer";

interface PlanSummary {
  id: string;
  name: string;
  packagePriceMonthly: number;
  packagePriceYearly: number;
  isFreePlan?: boolean;
}

interface PayWithBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanSummary | null;
  initialCycle?: "monthly" | "yearly";
  onSuccess?: () => void;
}

const DEFAULT_BANK_SETTINGS: BankTransferSettingsDTO = {
  bankTransferEnabled: true,
  bankName: "Silicon Valley Bank / First National",
  accountHolder: "BookingGo Technologies Inc.",
  accountNumber: "987654321098",
  routingNumber: "121000358",
  ibanSwift: "SVBUS6SXXX",
  instructions:
    "Please include your company name or account email in the wire transfer memo. Upload the confirmation receipt below once transferred.",
};

export function PayWithBankModal({
  isOpen,
  onClose,
  plan,
  initialCycle = "monthly",
  onSuccess,
}: PayWithBankModalProps) {
  const router = useRouter();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(initialCycle);
  const [transactionRef, setTransactionRef] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [notes, setNotes] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [bankSettings, setBankSettings] = useState<BankTransferSettingsDTO>(DEFAULT_BANK_SETTINGS);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    getBankTransferSettingsAction()
      .then((res) => {
        if (res.success && res.data) {
          setBankSettings(res.data);
        }
      })
      .catch(() => {
        // Fallback to default
      });
  }, []);

  const handleClose = () => {
    setTransactionRef("");
    setCouponCode("");
    setNotes("");
    setAttachmentUrl("");
    setErrorMessage(null);
    onClose();
  };

  if (!plan) return null;

  const currentPrice =
    billingCycle === "yearly" ? plan.packagePriceYearly : plan.packagePriceMonthly;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!attachmentUrl.trim()) {
      setErrorMessage("Please upload your bank transfer deposit slip or confirmation receipt.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await submitPlanBankTransferAction({
        planId: plan.id,
        billingCycle,
        attachment: attachmentUrl.trim(),
        transactionRef: transactionRef.trim(),
        couponCode: couponCode.trim(),
        notes: notes.trim(),
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to submit bank transfer.");
        return;
      }

      toast.success(
        res.message || "Payment submitted! Your subscription will activate upon administrator verification."
      );
      handleClose();
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && handleClose()}>
      <DialogContent className="sm:max-w-xl w-full max-h-[92vh] overflow-y-auto overflow-x-hidden border-border bg-card min-w-0">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <IconBuildingBank size={22} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Pay via Offline Bank Wire Transfer
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Transfer directly to our institutional account and upload your payment slip for instant verification.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-sm min-w-0 max-w-full">
          {/* Plan & Cycle Summary */}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">{plan.name}</span>
                <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                  {billingCycle}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {billingCycle === "yearly"
                  ? "Billed annually (365 days access)"
                  : "Billed monthly (30 days access)"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    billingCycle === "monthly"
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    billingCycle === "yearly"
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yearly
                </button>
              </div>

              <span className="text-base font-bold text-primary pl-2">
                ${currentPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Institutional Wire Deposit Instructions Card */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <IconShieldCheck size={16} className="text-primary" />
                <span>Official Bank Wire Details</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-background">
                Verified Institutional Account
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                <span className="text-[11px] text-muted-foreground block">Bank Name:</span>
                <span className="font-semibold text-foreground">{bankSettings.bankName}</span>
              </div>

              <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                <span className="text-[11px] text-muted-foreground block">Account Holder:</span>
                <span className="font-semibold text-foreground">{bankSettings.accountHolder}</span>
              </div>

              <div className="bg-background/80 p-2.5 rounded-lg border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Account Number:</span>
                  <span className="font-mono font-bold text-foreground">{bankSettings.accountNumber}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => copyToClipboard(bankSettings.accountNumber, "Account Number")}
                >
                  {copiedField === "Account Number" ? (
                    <IconCheck size={14} className="text-emerald-500" />
                  ) : (
                    <IconCopy size={14} />
                  )}
                </Button>
              </div>

              <div className="bg-background/80 p-2.5 rounded-lg border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Routing / SWIFT:</span>
                  <span className="font-mono font-bold text-foreground">
                    {bankSettings.routingNumber || bankSettings.ibanSwift || "N/A"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    copyToClipboard(
                      bankSettings.routingNumber || bankSettings.ibanSwift || "",
                      "Routing Code"
                    )
                  }
                >
                  {copiedField === "Routing Code" ? (
                    <IconCheck size={14} className="text-emerald-500" />
                  ) : (
                    <IconCopy size={14} />
                  )}
                </Button>
              </div>
            </div>

            {bankSettings.instructions && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                💡 <strong className="font-medium text-foreground">Instruction:</strong> {bankSettings.instructions}
              </p>
            )}
          </div>

          {/* Form Fields: Transaction Reference & Coupon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-ref" className="text-xs font-semibold text-foreground">
                Transaction Reference / Wire ID
              </Label>
              <Input
                id="tx-ref"
                placeholder="e.g. WT-9821839281"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coupon-code" className="text-xs font-semibold text-foreground">
                Discount Coupon (Optional)
              </Label>
              <Input
                id="coupon-code"
                placeholder="PROMO2026"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          {/* Attachment Upload Zone */}
          <div className="space-y-1.5 min-w-0 max-w-full overflow-hidden">
            <Label className="text-xs font-semibold text-foreground">
              Payment Deposit Slip / Receipt Proof <span className="text-destructive">*</span>
            </Label>
            <BankTransferUploader
              value={attachmentUrl}
              onChange={(url) => setAttachmentUrl(url)}
              disabled={isSubmitting}
            />
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="user-notes" className="text-xs font-semibold text-foreground">
              Additional Memo / Notes (Optional)
            </Label>
            <Textarea
              id="user-notes"
              rows={2}
              placeholder="Any additional information regarding your bank transfer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <IconAlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !attachmentUrl.trim()}
              className="cursor-pointer gap-1.5 font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" />
                  <span>Submitting Transfer...</span>
                </>
              ) : (
                <>
                  <IconReceipt size={14} />
                  <span>Submit Payment for Review</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
