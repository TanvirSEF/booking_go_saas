"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconHome,
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
import { MediaUploader } from "@/components/shared/media-uploader";
import {
  updateHeroSectionAction,
  resetLandingPageSectionAction,
  toggleLandingPageSectionAction,
} from "@/actions/landing-page";
import type { IHeroSetting } from "@/types/landing-page";

interface HeroTabProps {
  initialData: IHeroSetting;
}

export function HeroTab({ initialData }: HeroTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<IHeroSetting>({
    status: initialData?.status ?? true,
    offerText: initialData?.offerText || "70% Special Offer",
    title: initialData?.title || "Home",
    heading:
      initialData?.heading ||
      "Empowering Businesses with Seamless Booking Management Solutions and Enhanced Customer Experiences.",
    description:
      initialData?.description ||
      "Simplify your booking processes with BookingGo SaaS, the ultimate solution for efficient and hassle-free booking management.",
    trustedBy:
      initialData?.trustedBy ||
      "Our best partners and +11,000 customers worldwide satisfied with our services.",
    liveDemoLink: initialData?.liveDemoLink || "/login",
    buyNowLink: initialData?.buyNowLink || "",
    bannerImage: initialData?.bannerImage || "/images/landing/hero-banner.png",
    buttonText: initialData?.buttonText || "View Live Demo",
    partnerLogos: initialData?.partnerLogos || [],
  });
  const [isPending, setIsPending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async (newStatus: boolean) => {
    setFormData((prev) => ({ ...prev, status: newStatus }));
    try {
      setIsToggling(true);
      const res = await toggleLandingPageSectionAction("hero", newStatus);
      if (res.success) {
        toast.success(`Hero section ${newStatus ? "enabled" : "disabled"} successfully.`);
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
      toast.error("Main hero headline is required.");
      return;
    }

    try {
      setIsPending(true);
      const res = await updateHeroSectionAction(formData);
      if (res.success) {
        toast.success(res.message || "Hero section updated successfully.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update hero banner.");
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
      const res = await resetLandingPageSectionAction("hero");
      if (res.success) {
        toast.success("Hero section restored to factory default.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reset hero.");
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
            <IconHome className="size-5 text-primary" />
            <span>Hero / Home Banner Setting</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Customize the prominent above-the-fold hero section, main value proposition, CTA buttons, and preview illustration.
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
                Hero Section Visibility
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable or disable the primary Hero banner on the public marketing page.
              </p>
            </div>
            <Switch
              checked={formData.status}
              onCheckedChange={handleToggleStatus}
              disabled={isToggling}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Offer Text */}
            <div className="space-y-1.5">
              <Label htmlFor="offer-text" className="text-xs font-semibold text-foreground">
                Offer Badge Text
              </Label>
              <Input
                id="offer-text"
                value={formData.offerText}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, offerText: e.target.value }))
                }
                placeholder="70% Special Offer"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>

            {/* Page Title */}
            <div className="space-y-1.5">
              <Label htmlFor="hero-title" className="text-xs font-semibold text-foreground">
                Section Label / Category
              </Label>
              <Input
                id="hero-title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Home"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <Label htmlFor="hero-heading" className="text-xs font-semibold text-foreground">
              Main Headline <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="hero-heading"
              value={formData.heading}
              onChange={(e) => setFormData((prev) => ({ ...prev, heading: e.target.value }))}
              placeholder="Empowering Businesses with Seamless Booking Management Solutions..."
              rows={3}
              className="text-xs"
              required
              disabled={!formData.status || isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="hero-desc" className="text-xs font-semibold text-foreground">
              Subtitle / Description
            </Label>
            <Textarea
              id="hero-desc"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Simplify your booking processes with BookingGo SaaS..."
              rows={3}
              className="text-xs"
              disabled={!formData.status || isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Button Text */}
            <div className="space-y-1.5">
              <Label htmlFor="btn-text" className="text-xs font-semibold text-foreground">
                Primary CTA Button Text
              </Label>
              <Input
                id="btn-text"
                value={formData.buttonText}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, buttonText: e.target.value }))
                }
                placeholder="View Live Demo"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>

            {/* Live Demo Link */}
            <div className="space-y-1.5">
              <Label htmlFor="demo-link" className="text-xs font-semibold text-foreground">
                Primary Button Link
              </Label>
              <Input
                id="demo-link"
                value={formData.liveDemoLink}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, liveDemoLink: e.target.value }))
                }
                placeholder="/login or https://demo.bookinggo.io"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>
          </div>

          {/* Trusted By Badge */}
          <div className="space-y-1.5">
            <Label htmlFor="trusted-by" className="text-xs font-semibold text-foreground">
              Social Proof / Trusted By Tagline
            </Label>
            <Input
              id="trusted-by"
              value={formData.trustedBy}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, trustedBy: e.target.value }))
              }
              placeholder="Our best partners and +11,000 customers worldwide satisfied with our services."
              className="text-xs h-9"
              disabled={!formData.status || isPending}
            />
          </div>

          {/* Hero Banner Image */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Hero Graphic / Banner Image
            </Label>
            <MediaUploader
              value={formData.bannerImage}
              onChange={(url) => setFormData((prev) => ({ ...prev, bannerImage: url }))}
              folder="general"
              placeholder="Upload hero illustration or enter image URL"
              disabled={!formData.status || isPending}
              aspectRatio="banner"
            />
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
              <span>Save Hero Banner</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
