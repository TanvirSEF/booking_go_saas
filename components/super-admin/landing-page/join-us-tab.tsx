"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconUsersGroup,
  IconLoader2,
  IconDeviceFloppy,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  updateJoinUsSectionAction,
  resetLandingPageSectionAction,
  toggleLandingPageSectionAction,
} from "@/actions/landing-page";
import type { IJoinUsSetting } from "@/types/landing-page";

interface JoinUsTabProps {
  initialData: IJoinUsSetting;
}

export function JoinUsTab({ initialData }: JoinUsTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<IJoinUsSetting>({
    status: initialData?.status ?? true,
    heading: initialData?.heading || "Join Thousands of Satisfied Businesses Today",
    description:
      initialData?.description ||
      "Start accepting bookings online with the ultimate scheduling platform. Create your free account in less than 2 minutes.",
    buttonText: initialData?.buttonText || "Get Started for Free",
    buttonLink: initialData?.buttonLink || "/register",
  });

  const [isPending, setIsPending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async (newStatus: boolean) => {
    setFormData((prev) => ({ ...prev, status: newStatus }));
    try {
      setIsToggling(true);
      const res = await toggleLandingPageSectionAction("joinUs", newStatus);
      if (res.success) {
        toast.success(`Join Us section ${newStatus ? "enabled" : "disabled"} successfully.`);
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
    if (!formData.heading.trim()) {
      toast.error("Heading is required.");
      return;
    }

    try {
      setIsPending(true);
      const res = await updateJoinUsSectionAction(formData);
      if (res.success) {
        toast.success(res.message || "Join Us section updated successfully.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update Join Us section.");
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
      const res = await resetLandingPageSectionAction("joinUs");
      if (res.success) {
        toast.success("Join Us section restored to factory default.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reset Join Us section.");
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
            <IconUsersGroup className="size-5 text-primary" />
            <span>Join Us (Call to Action Banner) Setting</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure the bottom high-conversion call-to-action banner driving trial registrations.
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
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground">
                Join Us Banner Visibility
              </Label>
              <p className="text-xs text-muted-foreground">
                Display the bottom CTA signup ribbon right before the footer.
              </p>
            </div>
            <Switch
              checked={formData.status}
              onCheckedChange={handleToggleStatus}
              disabled={isToggling}
            />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <Label htmlFor="join-heading" className="text-xs font-semibold text-foreground">
              Main Headline <span className="text-destructive">*</span>
            </Label>
            <Input
              id="join-heading"
              value={formData.heading}
              onChange={(e) => setFormData((prev) => ({ ...prev, heading: e.target.value }))}
              placeholder="Join Thousands of Satisfied Businesses Today"
              className="text-xs h-9"
              required
              disabled={!formData.status || isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="join-desc" className="text-xs font-semibold text-foreground">
              Description
            </Label>
            <Textarea
              id="join-desc"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Start accepting bookings online with the ultimate scheduling platform..."
              rows={3}
              className="text-xs"
              disabled={!formData.status || isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Button Text */}
            <div className="space-y-1.5">
              <Label htmlFor="join-btn-text" className="text-xs font-semibold text-foreground">
                CTA Button Text
              </Label>
              <Input
                id="join-btn-text"
                value={formData.buttonText}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, buttonText: e.target.value }))
                }
                placeholder="Get Started for Free"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>

            {/* Button Link */}
            <div className="space-y-1.5">
              <Label htmlFor="join-btn-link" className="text-xs font-semibold text-foreground">
                Destination Link URL
              </Label>
              <Input
                id="join-btn-link"
                value={formData.buttonLink}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, buttonLink: e.target.value }))
                }
                placeholder="/register"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>
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
              <span>Save Join Us Section</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
