"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconPalette,
  IconLoader2,
  IconDeviceFloppy,
  IconPhoto,
  IconWorldWww,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSystemSettingsGroupAction } from "@/actions/system-settings";
import { ResetGroupDialog } from "./reset-group-dialog";

interface BrandTabProps {
  initialData: Record<string, string>;
}

export function BrandTab({ initialData }: BrandTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title_text: initialData.title_text || "BookingGo",
    footer_text: initialData.footer_text || "© 2026 BookingGo SaaS. All rights reserved.",
    logo_dark: initialData.logo_dark || "/images/logo-dark.png",
    logo_light: initialData.logo_light || "/images/logo-light.png",
    favicon: initialData.favicon || "/favicon.ico",
    default_language: initialData.default_language || "en",
    landing_page_is_on: initialData.landing_page_is_on === "off" ? "off" : "on",
  });
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title_text.trim()) {
      toast.error("Platform title is required.");
      return;
    }

    try {
      setIsPending(true);
      const res = await updateSystemSettingsGroupAction("brand", formData);

      if (res.success) {
        toast.success(res.message || "Brand settings saved successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update brand settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving brand settings.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-xl border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <IconPalette className="size-5 text-primary" />
            Brand Visuals & Public Identity
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Customize platform platform title, logos, favicon, and public landing page visibility.
          </CardDescription>
        </div>
        <ResetGroupDialog group="brand" groupLabel="Brand Settings" />
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title Text */}
            <div className="space-y-1.5">
              <Label htmlFor="title_text" className="text-xs font-semibold">
                Platform Title Name
              </Label>
              <Input
                id="title_text"
                value={formData.title_text}
                onChange={(e) => setFormData({ ...formData, title_text: e.target.value })}
                placeholder="BookingGo"
                className="h-9 text-xs"
                disabled={isPending}
                required
              />
            </div>

            {/* Default Language */}
            <div className="space-y-1.5">
              <Label htmlFor="default_language" className="text-xs font-semibold">
                Default Language
              </Label>
              <Select
                value={formData.default_language}
                onValueChange={(val) => setFormData({ ...formData, default_language: val })}
                disabled={isPending}
              >
                <SelectTrigger id="default_language" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en" className="text-xs">English (en)</SelectItem>
                  <SelectItem value="es" className="text-xs">Spanish (es)</SelectItem>
                  <SelectItem value="fr" className="text-xs">French (fr)</SelectItem>
                  <SelectItem value="de" className="text-xs">German (de)</SelectItem>
                  <SelectItem value="ar" className="text-xs">Arabic (ar - RTL)</SelectItem>
                  <SelectItem value="bn" className="text-xs">Bengali (bn)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Footer Text */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="footer_text" className="text-xs font-semibold">
                Footer Copyright Text
              </Label>
              <Input
                id="footer_text"
                value={formData.footer_text}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                placeholder="© 2026 BookingGo SaaS. All rights reserved."
                className="h-9 text-xs"
                disabled={isPending}
              />
            </div>

            {/* Dark Logo */}
            <div className="space-y-1.5">
              <Label htmlFor="logo_dark" className="text-xs font-semibold flex items-center gap-1.5">
                <IconPhoto className="size-3.5 text-muted-foreground" />
                Dark Theme Logo URL
              </Label>
              <Input
                id="logo_dark"
                value={formData.logo_dark}
                onChange={(e) => setFormData({ ...formData, logo_dark: e.target.value })}
                placeholder="/images/logo-dark.png"
                className="h-9 text-xs"
                disabled={isPending}
              />
            </div>

            {/* Light Logo */}
            <div className="space-y-1.5">
              <Label htmlFor="logo_light" className="text-xs font-semibold flex items-center gap-1.5">
                <IconPhoto className="size-3.5 text-muted-foreground" />
                Light Theme Logo URL
              </Label>
              <Input
                id="logo_light"
                value={formData.logo_light}
                onChange={(e) => setFormData({ ...formData, logo_light: e.target.value })}
                placeholder="/images/logo-light.png"
                className="h-9 text-xs"
                disabled={isPending}
              />
            </div>

            {/* Favicon */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="favicon" className="text-xs font-semibold">
                Favicon URL
              </Label>
              <Input
                id="favicon"
                value={formData.favicon}
                onChange={(e) => setFormData({ ...formData, favicon: e.target.value })}
                placeholder="/favicon.ico"
                className="h-9 text-xs"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Landing Page Switch */}
          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-4">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <IconWorldWww className="size-4 text-primary" />
                Public SaaS Landing Page
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When enabled, visitors to the root URL see the public marketing landing page.
              </p>
            </div>
            <Switch
              checked={formData.landing_page_is_on === "on"}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  landing_page_is_on: checked ? "on" : "off",
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
              {isPending ? "Saving..." : "Save Brand Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
