"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconMail,
  IconLoader2,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconServer,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSystemSettingsGroupAction } from "@/actions/system-settings";
import { ResetGroupDialog } from "./reset-group-dialog";
import { SmtpTestDialog } from "./smtp-test-dialog";

interface EmailTabProps {
  initialData: Record<string, string>;
}

export function EmailTab({ initialData }: EmailTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    mail_driver: initialData.mail_driver || "smtp",
    mail_host: initialData.mail_host || "smtp.mailtrap.io",
    mail_port: initialData.mail_port || "587",
    mail_username: initialData.mail_username || "",
    mail_password: initialData.mail_password || "",
    mail_encryption: (initialData.mail_encryption as "tls" | "ssl" | "none") || "tls",
    mail_from_address: initialData.mail_from_address || "notifications@bookinggo.saas",
    mail_from_name: initialData.mail_from_name || "BookingGo Platform",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsPending(true);
      const res = await updateSystemSettingsGroupAction("email", formData);

      if (res.success) {
        toast.success(res.message || "Email / SMTP settings saved successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update email settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving email configuration.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-xl border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <IconMail className="size-5 text-primary" />
            Email / SMTP Server Configuration
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Configure system outbound mail transport for verification codes, password resets, and alerts.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <SmtpTestDialog
            senderEmail={formData.mail_from_address}
            senderHost={formData.mail_host}
          />
          <ResetGroupDialog group="email" groupLabel="Email / SMTP" />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mail Host */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="mail_host" className="text-xs font-semibold flex items-center gap-1.5">
                <IconServer className="size-3.5 text-muted-foreground" />
                SMTP Host Server
              </Label>
              <Input
                id="mail_host"
                value={formData.mail_host}
                onChange={(e) => setFormData({ ...formData, mail_host: e.target.value })}
                placeholder="smtp.mailtrap.io or smtp.sendgrid.net"
                className="h-9 text-xs font-mono"
                disabled={isPending}
                required
              />
            </div>

            {/* Mail Port */}
            <div className="space-y-1.5">
              <Label htmlFor="mail_port" className="text-xs font-semibold">
                Port
              </Label>
              <Input
                id="mail_port"
                value={formData.mail_port}
                onChange={(e) => setFormData({ ...formData, mail_port: e.target.value })}
                placeholder="587"
                className="h-9 text-xs font-mono"
                disabled={isPending}
                required
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="mail_username" className="text-xs font-semibold">
                SMTP Username
              </Label>
              <Input
                id="mail_username"
                value={formData.mail_username}
                onChange={(e) => setFormData({ ...formData, mail_username: e.target.value })}
                placeholder="apikey or username"
                className="h-9 text-xs"
                disabled={isPending}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="mail_password" className="text-xs font-semibold">
                SMTP Password / API Key
              </Label>
              <div className="relative">
                <Input
                  id="mail_password"
                  type={showPassword ? "text" : "password"}
                  value={formData.mail_password}
                  onChange={(e) => setFormData({ ...formData, mail_password: e.target.value })}
                  placeholder="••••••••"
                  className="h-9 text-xs font-mono pr-9"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <IconEyeOff className="size-4" />
                  ) : (
                    <IconEye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Encryption */}
            <div className="space-y-1.5">
              <Label htmlFor="mail_encryption" className="text-xs font-semibold">
                Encryption Protocol
              </Label>
              <Select
                value={formData.mail_encryption}
                onValueChange={(val: "tls" | "ssl" | "none") =>
                  setFormData({ ...formData, mail_encryption: val })
                }
                disabled={isPending}
              >
                <SelectTrigger id="mail_encryption" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls" className="text-xs">TLS (Recommended - 587)</SelectItem>
                  <SelectItem value="ssl" className="text-xs">SSL (465)</SelectItem>
                  <SelectItem value="none" className="text-xs">None / Unencrypted (25)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From Address */}
            <div className="space-y-1.5">
              <Label htmlFor="mail_from_address" className="text-xs font-semibold">
                Sender From Address
              </Label>
              <Input
                id="mail_from_address"
                type="email"
                value={formData.mail_from_address}
                onChange={(e) =>
                  setFormData({ ...formData, mail_from_address: e.target.value })
                }
                placeholder="notifications@bookinggo.saas"
                className="h-9 text-xs"
                disabled={isPending}
                required
              />
            </div>

            {/* From Name */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="mail_from_name" className="text-xs font-semibold">
                Sender Display Name
              </Label>
              <Input
                id="mail_from_name"
                value={formData.mail_from_name}
                onChange={(e) => setFormData({ ...formData, mail_from_name: e.target.value })}
                placeholder="BookingGo Notifications"
                className="h-9 text-xs"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="text-xs h-9 gap-1.5"
            >
              {isPending ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconDeviceFloppy className="size-4" />
              )}
              {isPending ? "Saving..." : "Save Email Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
