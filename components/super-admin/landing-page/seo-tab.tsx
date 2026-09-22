"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconSearch,
  IconPlus,
  IconTrash,
  IconLoader2,
  IconDeviceFloppy,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MediaUploader } from "@/components/shared/media-uploader";
import {
  updateSeoSectionAction,
  addPixelAction,
  deletePixelAction,
  resetLandingPageSectionAction,
} from "@/actions/landing-page";
import type { ISeoSetting, IPixelItem } from "@/types/landing-page";

interface SeoTabProps {
  initialSeo: ISeoSetting;
  initialPixels: IPixelItem[];
}

const SUPPORTED_PIXELS = [
  { value: "facebook", label: "Facebook Pixel" },
  { value: "google-analytics", label: "Google Analytics 4 (GA4)" },
  { value: "google-adwords", label: "Google Ads (AdWords)" },
  { value: "linkedin", label: "LinkedIn Insight Tag" },
  { value: "twitter", label: "Twitter / X Pixel" },
  { value: "tiktok", label: "TikTok Pixel" },
  { value: "pinterest", label: "Pinterest Tag" },
  { value: "quora", label: "Quora Pixel" },
  { value: "bing", label: "Microsoft / Bing Ads" },
  { value: "snapchat", label: "Snapchat Pixel" },
];

export function SeoTab({ initialSeo, initialPixels }: SeoTabProps) {
  const router = useRouter();
  const [seoData, setSeoData] = useState<ISeoSetting>({
    metaTitle: initialSeo?.metaTitle || "BookingGo - Modern Appointment & SaaS Management",
    metaKeywords:
      initialSeo?.metaKeywords ||
      "appointment booking, scheduling saas, workdo, nextjs booking engine",
    metaDescription:
      initialSeo?.metaDescription ||
      "All-in-one booking and appointment management platform for businesses, clinics, salons, and consultants.",
    metaImage: initialSeo?.metaImage || "/images/landing/og-cover.png",
    googleAnalyticsId: initialSeo?.googleAnalyticsId || "",
    facebookPixelId: initialSeo?.facebookPixelId || "",
  });

  const [pixels, setPixels] = useState<IPixelItem[]>(initialPixels || []);
  const [newPlatform, setNewPlatform] = useState<string>("facebook");
  const [newPixelId, setNewPixelId] = useState<string>("");

  const [isPending, setIsPending] = useState(false);
  const [isAddingPixel, setIsAddingPixel] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPending(true);
      const res = await updateSeoSectionAction(seoData);
      if (res.success) {
        toast.success(res.message || "SEO parameters saved successfully.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update SEO.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  const handleAddPixel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPixelId.trim()) {
      toast.error("Pixel ID or Measurement Tag is required.");
      return;
    }

    try {
      setIsAddingPixel(true);
      const res = await addPixelAction({
        platform: newPlatform,
        pixelId: newPixelId.trim(),
      });

      if (res.success && res.data) {
        toast.success(res.message || "Tracking pixel added.");
        setPixels((prev) => [...prev, res.data as IPixelItem]);
        setNewPixelId("");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to add tracking pixel.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add pixel.");
    } finally {
      setIsAddingPixel(false);
    }
  };

  const handleDeletePixel = async (pixelId: string) => {
    try {
      const res = await deletePixelAction(pixelId);
      if (res.success) {
        toast.success("Pixel removed.");
        setPixels((prev) => prev.filter((p) => p.id !== pixelId));
        router.refresh();
      } else {
        toast.error(res.message || "Failed to remove pixel.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete pixel.");
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      const res = await resetLandingPageSectionAction("seo");
      if (res.success) {
        toast.success("SEO settings restored to factory default.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reset SEO.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Primary Meta & OpenGraph Card */}
      <Card className="rounded-xl border border-border bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IconSearch className="size-5 text-primary" />
              <span>Search Engine Optimization (SEO) Setting</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Define meta titles, search descriptions, keywords, and OpenGraph social preview images.
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
          <form onSubmit={handleSaveSeo} className="space-y-5">
            {/* Meta Title */}
            <div className="space-y-1.5">
              <Label htmlFor="meta-title" className="text-xs font-semibold text-foreground">
                Meta Title
              </Label>
              <Input
                id="meta-title"
                value={seoData.metaTitle}
                onChange={(e) => setSeoData((prev) => ({ ...prev, metaTitle: e.target.value }))}
                placeholder="BookingGo - Modern Appointment & SaaS Management"
                className="text-xs h-9"
              />
            </div>

            {/* Meta Keywords */}
            <div className="space-y-1.5">
              <Label htmlFor="meta-keywords" className="text-xs font-semibold text-foreground">
                Meta Keywords
              </Label>
              <Input
                id="meta-keywords"
                value={seoData.metaKeywords}
                onChange={(e) =>
                  setSeoData((prev) => ({ ...prev, metaKeywords: e.target.value }))
                }
                placeholder="appointment booking, scheduling saas, workdo"
                className="text-xs h-9"
              />
            </div>

            {/* Meta Description */}
            <div className="space-y-1.5">
              <Label htmlFor="meta-desc" className="text-xs font-semibold text-foreground">
                Meta Description
              </Label>
              <Textarea
                id="meta-desc"
                value={seoData.metaDescription}
                onChange={(e) =>
                  setSeoData((prev) => ({ ...prev, metaDescription: e.target.value }))
                }
                placeholder="A high-conversion summary shown in search results..."
                rows={3}
                className="text-xs"
              />
            </div>

            {/* OpenGraph Image */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Social Share Image (OpenGraph 1200x630)
              </Label>
              <MediaUploader
                value={seoData.metaImage}
                onChange={(url) => setSeoData((prev) => ({ ...prev, metaImage: url }))}
                folder="meta"
                placeholder="Upload OG preview banner or enter URL"
                aspectRatio="banner"
              />
            </div>

            {/* Quick Analytics IDs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="ga-id" className="text-xs font-semibold text-foreground">
                  Google Analytics 4 Measurement ID
                </Label>
                <Input
                  id="ga-id"
                  value={seoData.googleAnalyticsId}
                  onChange={(e) =>
                    setSeoData((prev) => ({ ...prev, googleAnalyticsId: e.target.value }))
                  }
                  placeholder="G-XXXXXXXXXX"
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fb-id" className="text-xs font-semibold text-foreground">
                  Facebook Pixel ID
                </Label>
                <Input
                  id="fb-id"
                  value={seoData.facebookPixelId}
                  onChange={(e) =>
                    setSeoData((prev) => ({ ...prev, facebookPixelId: e.target.value }))
                  }
                  placeholder="123456789012345"
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

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
                <span>Save SEO Parameters</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Multi-Platform Pixel Manager Card */}
      <Card className="rounded-xl border border-border bg-card shadow-xs">
        <CardHeader className="pb-4 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Multi-Platform Tracking Pixels</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Connect ad conversion pixels and analytics tags across Facebook, Google Ads, LinkedIn, Twitter, and TikTok.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Add Pixel Form */}
          <form onSubmit={handleAddPixel} className="flex flex-wrap items-end gap-3 p-4 rounded-xl border border-border bg-muted/20">
            <div className="w-48 space-y-1.5">
              <Label className="text-xs font-semibold">Platform</Label>
              <Select value={newPlatform} onValueChange={setNewPlatform}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_PIXELS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px] space-y-1.5">
              <Label className="text-xs font-semibold">Pixel ID / Measurement Tag</Label>
              <Input
                value={newPixelId}
                onChange={(e) => setNewPixelId(e.target.value)}
                placeholder="e.g. AW-123456789 or 987654321"
                className="text-xs h-9 font-mono"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={isAddingPixel}
              className="gap-1.5 h-9 text-xs"
            >
              {isAddingPixel ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : (
                <IconPlus className="size-3.5" />
              )}
              <span>Add Pixel</span>
            </Button>
          </form>

          {/* Pixels Table */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-semibold text-xs text-foreground">Platform</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground">Pixel Identifier</TableHead>
                  <TableHead className="text-right w-20 font-semibold text-xs text-foreground">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pixels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                      No ad tracking pixels connected. Use the form above to add one.
                    </TableCell>
                  </TableRow>
                ) : (
                  pixels.map((pix) => (
                    <TableRow key={pix.id}>
                      <TableCell className="font-medium text-xs text-foreground capitalize">
                        {pix.platform.replace(/-/g, " ")}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-primary">{pix.pixelId}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePixel(pix.id || "")}
                          className="size-7 text-destructive hover:bg-destructive/10"
                        >
                          <IconTrash className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
