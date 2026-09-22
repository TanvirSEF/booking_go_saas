"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  IconMail,
  IconSend,
  IconLoader2,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendTestSmtpEmailAction } from "@/actions/system-settings";

interface SmtpTestDialogProps {
  senderEmail?: string;
  senderHost?: string;
}

export function SmtpTestDialog({ senderEmail, senderHost }: SmtpTestDialogProps) {
  const [open, setOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!testEmail || !testEmail.includes("@")) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    try {
      setIsSending(true);
      setLastResult(null);

      const res = await sendTestSmtpEmailAction({ testEmail: testEmail.trim() });

      if (res.success) {
        toast.success(res.message || "Test email sent successfully!");
        setLastResult({
          success: true,
          message: res.message || "Email delivered successfully.",
        });
      } else {
        toast.error(res.error || "Failed to send test email.");
        setLastResult({
          success: false,
          message: res.error || "Failed to connect to SMTP server.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "SMTP communication error";
      toast.error(msg);
      setLastResult({ success: false, message: msg });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
          <IconMail className="size-4 text-primary" />
          <span>Send Test Email</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-1">
            <IconSend className="size-5" />
          </div>
          <DialogTitle>Test SMTP Configuration</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Send a live verification email to test connectivity with host{" "}
            <span className="font-semibold text-foreground">
              {senderHost || "configured host"}
            </span>{" "}
            from{" "}
            <span className="font-semibold text-foreground">
              {senderEmail || "default sender"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="smtp-test-email" className="text-xs font-semibold">
              Recipient Email Address
            </Label>
            <Input
              id="smtp-test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="admin@yourdomain.com"
              className="h-9 text-xs"
              required
              disabled={isSending}
            />
          </div>

          {lastResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                lastResult.success
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
            >
              {lastResult.success ? (
                <IconCheck className="size-4 shrink-0 mt-0.5" />
              ) : (
                <IconAlertTriangle className="size-4 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="font-semibold">
                  {lastResult.success ? "Connection Verified" : "Delivery Error"}
                </p>
                <p className="text-[11px] opacity-90">{lastResult.message}</p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSending}
              className="text-xs gap-1.5"
            >
              {isSending ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : (
                <IconSend className="size-3.5" />
              )}
              {isSending ? "Dispatching..." : "Send Test Mail"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
