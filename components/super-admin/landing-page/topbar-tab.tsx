"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconSpeakerphone,
  IconLoader2,
  IconDeviceFloppy,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  updateTopbarSectionAction,
  resetLandingPageSectionAction,
  toggleLandingPageSectionAction,
} from "@/actions/landing-page";
import type { ITopbarSetting } from "@/types/landing-page";

interface TopbarTabProps {
  initialData: ITopbarSetting;
}

export function TopbarTab({ initialData }: TopbarTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<ITopbarSetting>({
    status: initialData?.status ?? true,
    notificationMsg:
      initialData?.notificationMsg ||
      "70% Special Offer. Don’t Miss it. The offer ends in 72 hours.",
  });
  const [isPending, setIsPending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async (newStatus: boolean) => {
    setFormData((prev) => ({ ...prev, status: newStatus }));
    try {
      setIsToggling(true);
      const res = await toggleLandingPageSectionAction("topbar", newStatus);
      if (res.success) {
        toast.success(`Topbar section ${newStatus ? "enabled" : "disabled"} successfully.`);
        router.refresh();
      } else {
        toast.error(res.message || "Failed to toggle status.");
        setFormData((prev) => ({ ...prev, status: !newStatus }));
      }
    } catch {
      toast.error("Failed to update status.");
      setFormData((prev) => ({ ...prev, status: !newStatus }));
    } finally {
      setIsToggling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPending(true);
      const res = await updateTopbarSectionAction(formData);
      if (res.success) {
        toast.success(res.message || "Topbar configuration saved successfully.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update topbar.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      const res = await resetLandingPageSectionAction("topbar");
      if (res.success) {
        toast.success("Topbar restored to factory default.");
        setFormData({
          status: true,
          notificationMsg: "70% Special Offer. Don’t Miss it. The offer ends in 72 hours.",
        });
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reset topbar.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="rounded-xl border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <IconSpeakerphone className="size-5 text-primary" />
            <span>Topbar Announcement Setting</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure the sticky announcement message bar displayed at the very top of the public landing page.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isResetting || isPending}
          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40"
        >
          {isResetting ? (
            <IconLoader2 className="size-3.5 animate-spin" />
          ) : (
            <IconRotateClockwise className="size-3.5" />
          )}
          <span>Reset Default</span>
        </Button>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground">
                Announcement Bar Visibility
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, visitors will see the announcement banner pinned above the site navigation.
              </p>
            </div>
            <Switch
              checked={formData.status}
              onCheckedChange={handleToggleStatus}
              disabled={isToggling}
            />
          </div>

          {/* Notification Message */}
          <div className="space-y-2">
            <Label htmlFor="notification-msg" className="text-xs font-semibold text-foreground">
              Notification Message Text
            </Label>
            <Input
              id="notification-msg"
              value={formData.notificationMsg}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notificationMsg: e.target.value }))
              }
              placeholder="e.g. 70% Special Offer. Don't Miss it. The offer ends in 72 hours."
              className="text-xs h-9"
              disabled={!formData.status || isPending}
            />
            <p className="text-[11px] text-muted-foreground">
              Keep it punchy (under 120 characters) for optimal rendering on mobile viewports.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="gap-2 h-9 text-xs px-5 shadow-xs"
            >
              {isPending ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : (
                <IconDeviceFloppy className="size-3.5" />
              )}
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
