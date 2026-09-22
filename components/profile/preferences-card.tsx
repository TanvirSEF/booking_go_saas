"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  IconAdjustments,
  IconMoon,
  IconSun,
  IconWorld,
  IconLoader2,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { updateUserPreferencesAction } from "@/actions/user-profile";

interface PreferencesCardProps {
  initialDarkMode: boolean;
  initialLang: string;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish (Español)" },
  { code: "fr", label: "French (Français)" },
  { code: "de", label: "German (Deutsch)" },
  { code: "ar", label: "Arabic (العربية - RTL)" },
  { code: "bn", label: "Bengali (বাংলা)" },
];

export function PreferencesCard({ initialDarkMode, initialLang }: PreferencesCardProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [darkMode, setDarkMode] = useState(
    theme ? theme === "dark" : initialDarkMode
  );
  const [lang, setLang] = useState(initialLang || "en");
  const [isPending, setIsPending] = useState(false);

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    setTheme(checked ? "dark" : "light");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsPending(true);
      const res = await updateUserPreferencesAction({
        darkMode,
        lang,
      });

      if (res.success) {
        toast.success(res.message || "Preferences saved successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update preferences.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving preferences.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-xl border-border bg-card shadow-xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <IconAdjustments className="size-5" />
          <CardTitle className="text-base font-bold text-foreground">
            Preferences & Appearance
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          Customize your dashboard appearance and localization language preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-4">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold flex items-center gap-2 text-foreground">
                {darkMode ? (
                  <IconMoon className="size-4 text-primary" />
                ) : (
                  <IconSun className="size-4 text-amber-500" />
                )}
                Dark Mode Theme
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Toggle between light and sleek dark mode across the administration interface.
              </p>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={handleDarkModeToggle}
              disabled={isPending}
            />
          </div>

          {/* Interface Language */}
          <div className="space-y-1.5">
            <Label htmlFor="pref-lang" className="text-xs font-semibold flex items-center gap-1.5">
              <IconWorld className="size-4 text-muted-foreground" />
              Interface Language
            </Label>
            <Select value={lang} onValueChange={setLang} disabled={isPending}>
              <SelectTrigger id="pref-lang" className="h-9 text-xs w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-xs">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
