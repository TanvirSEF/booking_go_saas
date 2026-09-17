"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconPalette,
  IconPhoto,
  IconLayout,
  IconLoader2,
  IconDeviceFloppy,
  IconCheck,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateBusinessBrandingAction } from "@/actions/settings";
import type { BusinessSettingsDTO } from "@/types/settings";
import { cn } from "@/lib/utils";

interface BrandingSettingsFormProps {
  initialData: BusinessSettingsDTO;
}

const WIZARD_THEMES = [
  { id: "color1-Formlayout1", name: "Indigo Modern", hex: "#4F46E5" },
  { id: "color2-Formlayout1", name: "Emerald Pro", hex: "#10B981" },
  { id: "color3-Formlayout1", name: "Ocean Blue", hex: "#0284C7" },
  { id: "color4-Formlayout1", name: "Purple Luxe", hex: "#8B5CF6" },
  { id: "color5-Formlayout1", name: "Rose Ruby", hex: "#E11D48" },
  { id: "color6-Formlayout1", name: "Amber Gold", hex: "#D97706" },
  { id: "color7-Formlayout1", name: "Teal Mint", hex: "#0D9488" },
  { id: "color8-Formlayout1", name: "Slate Minimal", hex: "#475569" },
];

export function BrandingSettingsForm({ initialData }: BrandingSettingsFormProps) {
  const router = useRouter();
  const [themeColor, setThemeColor] = useState(initialData.themeColor || "color1-Formlayout1");
  const [layout, setLayout] = useState(initialData.layout || "Formlayout1");
  const [logoLight, setLogoLight] = useState(initialData.logoLight || "");
  const [logoDark, setLogoDark] = useState(initialData.logoDark || "");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsPending(true);
      const res = await updateBusinessBrandingAction({
        themeColor,
        layout,
        logoLight: logoLight.trim() || undefined,
        logoDark: logoDark.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message || "Branding settings saved successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update branding.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving branding.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card text-card-foreground shadow-xs">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <IconPalette className="w-5 h-5 text-primary" />
          Branding & Theme Customization
        </CardTitle>
        <CardDescription className="text-xs">
          Customize your public booking wizard layout templates, brand logos, and theme color palette.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Layout Template Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-2">
              <IconLayout className="w-4 h-4 text-primary" />
              Public Booking Wizard Layout
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLayout("Formlayout1")}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all relative",
                  layout === "Formlayout1"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                    : "border-border/60 bg-card hover:border-border"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-foreground">Formlayout1 (Standard Multi-Step)</span>
                  {layout === "Formlayout1" && <IconCheck className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Classic centered wizard with step progress indicators and smooth transitions.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLayout("Formlayout2")}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all relative",
                  layout === "Formlayout2"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                    : "border-border/60 bg-card hover:border-border"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-foreground">Formlayout2 (Split-Screen Modern)</span>
                  {layout === "Formlayout2" && <IconCheck className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  High-converting split layout with live sticky appointment receipt and details.
                </p>
              </button>
            </div>
          </div>

          {/* Theme Color Palette */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Wizard Theme Palette</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {WIZARD_THEMES.map((theme) => {
                const isSelected = themeColor === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setThemeColor(theme.id)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary text-foreground shadow-2xs"
                        : "border-border/60 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: theme.hex }}
                    />
                    <span className="truncate">{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logo Images */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            {/* Light Logo */}
            <div className="space-y-2">
              <Label htmlFor="logo-light" className="text-xs font-semibold">
                Light Mode Logo (URL)
              </Label>
              <div className="relative">
                <IconPhoto className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="logo-light"
                  value={logoLight}
                  onChange={(e) => setLogoLight(e.target.value)}
                  placeholder="https://example.com/logo-light.png"
                  className="pl-9 h-9 text-xs"
                  disabled={isPending}
                />
              </div>
              {logoLight && (
                <div className="p-3 border border-border/60 rounded-lg bg-slate-100 flex items-center justify-center h-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoLight} alt="Light Logo Preview" className="max-h-12 max-w-full object-contain" />
                </div>
              )}
            </div>

            {/* Dark Logo */}
            <div className="space-y-2">
              <Label htmlFor="logo-dark" className="text-xs font-semibold">
                Dark Mode Logo (URL)
              </Label>
              <div className="relative">
                <IconPhoto className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="logo-dark"
                  value={logoDark}
                  onChange={(e) => setLogoDark(e.target.value)}
                  placeholder="https://example.com/logo-dark.png"
                  className="pl-9 h-9 text-xs"
                  disabled={isPending}
                />
              </div>
              {logoDark && (
                <div className="p-3 border border-border/60 rounded-lg bg-zinc-950 flex items-center justify-center h-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoDark} alt="Dark Logo Preview" className="max-h-12 max-w-full object-contain" />
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="text-xs h-9 gap-1.5"
            >
              {isPending ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <IconDeviceFloppy className="w-4 h-4" />
              )}
              {isPending ? "Saving..." : "Save Branding & Theme"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
