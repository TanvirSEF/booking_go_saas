"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconPackage,
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
  updatePackageDetailsSectionAction,
  resetLandingPageSectionAction,
  toggleLandingPageSectionAction,
} from "@/actions/landing-page";
import type { IPackageDetailsSetting } from "@/types/landing-page";

interface PackageDetailsTabProps {
  initialData: IPackageDetailsSetting;
}

export function PackageDetailsTab({ initialData }: PackageDetailsTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<IPackageDetailsSetting>({
    status: initialData?.status ?? true,
    heading:
      initialData?.heading || "Start an Online Booking Business with a Complete SaaS Package",
    shortDescription:
      initialData?.shortDescription ||
      "Get a multi-tenant booking appointment SaaS with complete CRM, staff management, and automated payment gateways.",
    longDescription:
      initialData?.longDescription ||
      "An all-in-one software package designed for entrepreneurs, clinics, salons, fitness studios, and professional service providers.",
    link: initialData?.link || "/register",
    buttonText: initialData?.buttonText || "Get the Package",
  });

  const [isPending, setIsPending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async (newStatus: boolean) => {
    setFormData((prev) => ({ ...prev, status: newStatus }));
    try {
      setIsToggling(true);
      const res = await toggleLandingPageSectionAction("packageDetails", newStatus);
      if (res.success) {
        toast.success(`Package details section ${newStatus ? "enabled" : "disabled"} successfully.`);
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
      toast.error("Package details headline is required.");
      return;
    }

    try {
      setIsPending(true);
      const res = await updatePackageDetailsSectionAction(formData);
      if (res.success) {
        toast.success(res.message || "Package details section updated successfully.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update package details.");
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
      const res = await resetLandingPageSectionAction("packageDetails");
      if (res.success) {
        toast.success("Package details section restored to factory default.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reset package details.");
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
            <IconPackage className="size-5 text-primary" />
            <span>Package Details Section Setting</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure the turnkey SaaS package overview block and primary subscription call to action.
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
                Package Details Section Visibility
              </Label>
              <p className="text-xs text-muted-foreground">
                Display the complete software package feature overview on the landing page.
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
            <Label htmlFor="pkg-heading" className="text-xs font-semibold text-foreground">
              Main Headline <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pkg-heading"
              value={formData.heading}
              onChange={(e) => setFormData((prev) => ({ ...prev, heading: e.target.value }))}
              placeholder="Start an Online Booking Business with a Complete SaaS Package"
              className="text-xs h-9"
              required
              disabled={!formData.status || isPending}
            />
          </div>

          {/* Short Description */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-short-desc" className="text-xs font-semibold text-foreground">
              Short Description / Summary
            </Label>
            <Textarea
              id="pkg-short-desc"
              value={formData.shortDescription}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))
              }
              placeholder="Get a multi-tenant booking appointment SaaS with complete CRM..."
              rows={2}
              className="text-xs"
              disabled={!formData.status || isPending}
            />
          </div>

          {/* Long Description */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-long-desc" className="text-xs font-semibold text-foreground">
              Detailed Package Overview
            </Label>
            <Textarea
              id="pkg-long-desc"
              value={formData.longDescription}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, longDescription: e.target.value }))
              }
              placeholder="An all-in-one software package designed for entrepreneurs, clinics, salons..."
              rows={4}
              className="text-xs"
              disabled={!formData.status || isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Button Text */}
            <div className="space-y-1.5">
              <Label htmlFor="pkg-btn-text" className="text-xs font-semibold text-foreground">
                CTA Button Text
              </Label>
              <Input
                id="pkg-btn-text"
                value={formData.buttonText}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, buttonText: e.target.value }))
                }
                placeholder="Get the Package"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>

            {/* Button Link */}
            <div className="space-y-1.5">
              <Label htmlFor="pkg-btn-link" className="text-xs font-semibold text-foreground">
                Destination Link URL
              </Label>
              <Input
                id="pkg-btn-link"
                value={formData.link}
                onChange={(e) => setFormData((prev) => ({ ...prev, link: e.target.value }))}
                placeholder="/register or /pricing"
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
              <span>Save Package Details</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
