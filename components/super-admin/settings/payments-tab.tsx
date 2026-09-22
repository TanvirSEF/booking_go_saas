"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconBrandStripe,
  IconBrandPaypal,
  IconBuildingBank,
  IconLoader2,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSystemSettingsGroupAction } from "@/actions/system-settings";
import { ResetGroupDialog } from "./reset-group-dialog";

interface PaymentsTabProps {
  stripeData: Record<string, string>;
  paypalData: Record<string, string>;
  bankData: Record<string, string>;
}

export function PaymentsTab({ stripeData, paypalData, bankData }: PaymentsTabProps) {
  const router = useRouter();

  // Stripe state
  const [stripeForm, setStripeForm] = useState({
    stripe_is_on: stripeData.stripe_is_on === "on" ? "on" : "off",
    stripe_key: stripeData.stripe_key || "",
    stripe_secret: stripeData.stripe_secret || "",
    stripe_webhook_secret: stripeData.stripe_webhook_secret || "",
  });
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showStripeWebhook, setShowStripeWebhook] = useState(false);
  const [isStripePending, setIsStripePending] = useState(false);

  // PayPal state
  const [paypalForm, setPaypalForm] = useState({
    paypal_is_on: paypalData.paypal_is_on === "on" ? "on" : "off",
    paypal_client_id: paypalData.paypal_client_id || "",
    paypal_secret_key: paypalData.paypal_secret_key || "",
    paypal_mode: (paypalData.paypal_mode as "sandbox" | "live") || "sandbox",
  });
  const [showPaypalSecret, setShowPaypalSecret] = useState(false);
  const [isPaypalPending, setIsPaypalPending] = useState(false);

  // Bank Transfer state
  const [bankForm, setBankForm] = useState({
    bank_transfer_is_on: bankData.bank_transfer_is_on === "on" ? "on" : "off",
    bank_name: bankData.bank_name || "",
    account_number: bankData.account_number || "",
    routing_number: bankData.routing_number || "",
    swift_code: bankData.swift_code || "",
    bank_guidelines:
      bankData.bank_guidelines ||
      "Please transfer the plan total and upload your transaction receipt.",
  });
  const [isBankPending, setIsBankPending] = useState(false);

  // Save Stripe
  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsStripePending(true);
      const res = await updateSystemSettingsGroupAction("stripe", stripeForm);
      if (res.success) {
        toast.success(res.message || "Stripe settings updated successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update Stripe settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating Stripe configuration.");
    } finally {
      setIsStripePending(false);
    }
  };

  // Save PayPal
  const handlePaypalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPaypalPending(true);
      const res = await updateSystemSettingsGroupAction("paypal", paypalForm);
      if (res.success) {
        toast.success(res.message || "PayPal settings updated successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update PayPal settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating PayPal configuration.");
    } finally {
      setIsPaypalPending(false);
    }
  };

  // Save Bank Transfer
  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsBankPending(true);
      const res = await updateSystemSettingsGroupAction("bank_transfer", bankForm);
      if (res.success) {
        toast.success(res.message || "Bank transfer settings updated successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update Bank transfer settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating Bank Transfer configuration.");
    } finally {
      setIsBankPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stripe Payment Gateway */}
      <Card className="rounded-xl border-border bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <IconBrandStripe className="size-6" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Stripe Payment Gateway
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Credit card and automatic recurring subscription billing.
              </CardDescription>
            </div>
          </div>
          <ResetGroupDialog group="stripe" groupLabel="Stripe" />
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleStripeSubmit} className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Enable Stripe</Label>
                <p className="text-[11px] text-muted-foreground">
                  Accept customer and company credit cards through Stripe checkout.
                </p>
              </div>
              <Switch
                checked={stripeForm.stripe_is_on === "on"}
                onCheckedChange={(checked) =>
                  setStripeForm({ ...stripeForm, stripe_is_on: checked ? "on" : "off" })
                }
                disabled={isStripePending}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="stripe_key" className="text-xs font-semibold">
                  Publishable Key
                </Label>
                <Input
                  id="stripe_key"
                  value={stripeForm.stripe_key}
                  onChange={(e) => setStripeForm({ ...stripeForm, stripe_key: e.target.value })}
                  placeholder="pk_test_..."
                  className="h-9 text-xs font-mono"
                  disabled={isStripePending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stripe_secret" className="text-xs font-semibold">
                  Secret Key
                </Label>
                <div className="relative">
                  <Input
                    id="stripe_secret"
                    type={showStripeSecret ? "text" : "password"}
                    value={stripeForm.stripe_secret}
                    onChange={(e) =>
                      setStripeForm({ ...stripeForm, stripe_secret: e.target.value })
                    }
                    placeholder="sk_test_..."
                    className="h-9 text-xs font-mono pr-9"
                    disabled={isStripePending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowStripeSecret(!showStripeSecret)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showStripeSecret ? (
                      <IconEyeOff className="size-4" />
                    ) : (
                      <IconEye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stripe_webhook_secret" className="text-xs font-semibold">
                  Webhook Secret
                </Label>
                <div className="relative">
                  <Input
                    id="stripe_webhook_secret"
                    type={showStripeWebhook ? "text" : "password"}
                    value={stripeForm.stripe_webhook_secret}
                    onChange={(e) =>
                      setStripeForm({
                        ...stripeForm,
                        stripe_webhook_secret: e.target.value,
                      })
                    }
                    placeholder="whsec_..."
                    className="h-9 text-xs font-mono pr-9"
                    disabled={isStripePending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowStripeWebhook(!showStripeWebhook)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showStripeWebhook ? (
                      <IconEyeOff className="size-4" />
                    ) : (
                      <IconEye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isStripePending} className="text-xs h-9 gap-1.5">
                {isStripePending ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconDeviceFloppy className="size-4" />
                )}
                {isStripePending ? "Saving..." : "Save Stripe Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* PayPal Payment Gateway */}
      <Card className="rounded-xl border-border bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <IconBrandPaypal className="size-6" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                PayPal Express Gateway
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Standard PayPal payments and digital wallet checkouts.
              </CardDescription>
            </div>
          </div>
          <ResetGroupDialog group="paypal" groupLabel="PayPal" />
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handlePaypalSubmit} className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Enable PayPal</Label>
                <p className="text-[11px] text-muted-foreground">
                  Allow payments using PayPal balance and cards.
                </p>
              </div>
              <Switch
                checked={paypalForm.paypal_is_on === "on"}
                onCheckedChange={(checked) =>
                  setPaypalForm({ ...paypalForm, paypal_is_on: checked ? "on" : "off" })
                }
                disabled={isPaypalPending}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="paypal_client_id" className="text-xs font-semibold">
                  Client ID
                </Label>
                <Input
                  id="paypal_client_id"
                  value={paypalForm.paypal_client_id}
                  onChange={(e) =>
                    setPaypalForm({ ...paypalForm, paypal_client_id: e.target.value })
                  }
                  placeholder="A..."
                  className="h-9 text-xs font-mono"
                  disabled={isPaypalPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paypal_mode" className="text-xs font-semibold">
                  Execution Mode
                </Label>
                <Select
                  value={paypalForm.paypal_mode}
                  onValueChange={(val: "sandbox" | "live") =>
                    setPaypalForm({ ...paypalForm, paypal_mode: val })
                  }
                  disabled={isPaypalPending}
                >
                  <SelectTrigger id="paypal_mode" className="h-9 text-xs w-full">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox" className="text-xs">
                      Sandbox (Testing)
                    </SelectItem>
                    <SelectItem value="live" className="text-xs">
                      Live (Production)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="paypal_secret_key" className="text-xs font-semibold">
                  Secret Key
                </Label>
                <div className="relative">
                  <Input
                    id="paypal_secret_key"
                    type={showPaypalSecret ? "text" : "password"}
                    value={paypalForm.paypal_secret_key}
                    onChange={(e) =>
                      setPaypalForm({ ...paypalForm, paypal_secret_key: e.target.value })
                    }
                    placeholder="E..."
                    className="h-9 text-xs font-mono pr-9"
                    disabled={isPaypalPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPaypalSecret(!showPaypalSecret)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPaypalSecret ? (
                      <IconEyeOff className="size-4" />
                    ) : (
                      <IconEye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isPaypalPending} className="text-xs h-9 gap-1.5">
                {isPaypalPending ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconDeviceFloppy className="size-4" />
                )}
                {isPaypalPending ? "Saving..." : "Save PayPal Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bank Transfer */}
      <Card className="rounded-xl border-border bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <IconBuildingBank className="size-6" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Bank Transfer / Manual Wire
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Offline bank account transfers with manual receipt verification.
              </CardDescription>
            </div>
          </div>
          <ResetGroupDialog group="bank_transfer" groupLabel="Bank Transfer" />
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleBankSubmit} className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Enable Bank Transfer</Label>
                <p className="text-[11px] text-muted-foreground">
                  Allows companies to upgrade plans via direct wire transfer.
                </p>
              </div>
              <Switch
                checked={bankForm.bank_transfer_is_on === "on"}
                onCheckedChange={(checked) =>
                  setBankForm({
                    ...bankForm,
                    bank_transfer_is_on: checked ? "on" : "off",
                  })
                }
                disabled={isBankPending}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bank_name" className="text-xs font-semibold">
                  Bank Name
                </Label>
                <Input
                  id="bank_name"
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  placeholder="e.g. JPMorgan Chase"
                  className="h-9 text-xs"
                  disabled={isBankPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="account_number" className="text-xs font-semibold">
                  Account Number / IBAN
                </Label>
                <Input
                  id="account_number"
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                  placeholder="1234567890"
                  className="h-9 text-xs font-mono"
                  disabled={isBankPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="routing_number" className="text-xs font-semibold">
                  Routing / Sort Code
                </Label>
                <Input
                  id="routing_number"
                  value={bankForm.routing_number}
                  onChange={(e) => setBankForm({ ...bankForm, routing_number: e.target.value })}
                  placeholder="021000021"
                  className="h-9 text-xs font-mono"
                  disabled={isBankPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="swift_code" className="text-xs font-semibold">
                  SWIFT / BIC Code
                </Label>
                <Input
                  id="swift_code"
                  value={bankForm.swift_code}
                  onChange={(e) => setBankForm({ ...bankForm, swift_code: e.target.value })}
                  placeholder="CHASUS33"
                  className="h-9 text-xs font-mono"
                  disabled={isBankPending}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="bank_guidelines" className="text-xs font-semibold">
                  Payment Instructions
                </Label>
                <Textarea
                  id="bank_guidelines"
                  value={bankForm.bank_guidelines}
                  onChange={(e) => setBankForm({ ...bankForm, bank_guidelines: e.target.value })}
                  placeholder="Instructions presented to subscribers during checkout..."
                  rows={3}
                  className="text-xs"
                  disabled={isBankPending}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isBankPending} className="text-xs h-9 gap-1.5">
                {isBankPending ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconDeviceFloppy className="size-4" />
                )}
                {isBankPending ? "Saving..." : "Save Bank Transfer Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
