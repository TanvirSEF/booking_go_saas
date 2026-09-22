"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconUserCheck,
  IconLoader2,
  IconDeviceFloppy,
  IconMailCheck,
  IconAlertTriangle,
  IconBuildingStore,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateSystemSettingsGroupAction } from "@/actions/system-settings";
import { ResetGroupDialog } from "./reset-group-dialog";

interface AuthTabProps {
  initialData: Record<string, string>;
}

export function AuthTab({ initialData }: AuthTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    signup_is_on: initialData.signup_is_on === "off" ? "off" : "on",
    email_verification_is_on:
      initialData.email_verification_is_on === "on" ? "on" : "off",
    maintenance_mode_is_on:
      initialData.maintenance_mode_is_on === "on" ? "on" : "off",
  });
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsPending(true);
      const res = await updateSystemSettingsGroupAction("auth", formData);

      if (res.success) {
        toast.success(res.message || "Authentication & access settings saved!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update auth settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving auth configuration.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-xl border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <IconUserCheck className="size-5 text-primary" />
            Authentication & Platform Access Gates
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Control company self-serve sign-ups, mandatory email confirmation, and platform maintenance mode.
          </CardDescription>
        </div>
        <ResetGroupDialog group="auth" groupLabel="Auth & Access" />
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Public Company Registration */}
          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-4">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold flex items-center gap-2 text-foreground">
                <IconBuildingStore className="size-4 text-primary" />
                Public Company Self-Registration
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When enabled, new business organizations can register through the public /register page.
              </p>
            </div>
            <Switch
              checked={formData.signup_is_on === "on"}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  signup_is_on: checked ? "on" : "off",
                })
              }
              disabled={isPending}
            />
          </div>

          {/* Email Verification Requirement */}
          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-4">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold flex items-center gap-2 text-foreground">
                <IconMailCheck className="size-4 text-primary" />
                Mandatory Email Verification
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Require company admins to verify their email address before accessing their business dashboard.
              </p>
            </div>
            <Switch
              checked={formData.email_verification_is_on === "on"}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  email_verification_is_on: checked ? "on" : "off",
                })
              }
              disabled={isPending}
            />
          </div>

          {/* Platform Maintenance Mode */}
          <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <IconAlertTriangle className="size-4" />
                Platform Maintenance Mode
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Temporarily lock public booking pages and company portals. Only Super Admin can log in.
              </p>
            </div>
            <Switch
              checked={formData.maintenance_mode_is_on === "on"}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  maintenance_mode_is_on: checked ? "on" : "off",
                })
              }
              disabled={isPending}
            />
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
              {isPending ? "Saving..." : "Save Auth Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
