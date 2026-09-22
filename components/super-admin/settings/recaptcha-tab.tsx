"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconShieldCheck,
  IconLoader2,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
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

interface RecaptchaTabProps {
  initialData: Record<string, string>;
}

export function RecaptchaTab({ initialData }: RecaptchaTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    recaptcha_is_on: initialData.recaptcha_is_on === "on" ? "on" : "off",
    recaptcha_version: (initialData.recaptcha_version as "v2" | "v3") || "v2",
    recaptcha_site_key: initialData.recaptcha_site_key || "",
    recaptcha_secret_key: initialData.recaptcha_secret_key || "",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsPending(true);
      const res = await updateSystemSettingsGroupAction("recaptcha", formData);

      if (res.success) {
        toast.success(res.message || "reCAPTCHA settings saved successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update reCAPTCHA settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving reCAPTCHA settings.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-xl border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <IconShieldCheck className="size-5 text-primary" />
            Security & Google reCAPTCHA
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Prevent automated bots and spam on public appointment booking and registration forms.
          </CardDescription>
        </div>
        <ResetGroupDialog group="recaptcha" groupLabel="reCAPTCHA" />
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-4">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold">Enable Google reCAPTCHA</Label>
              <p className="text-[11px] text-muted-foreground">
                Challenge public submissions before booking confirmations and logins.
              </p>
            </div>
            <Switch
              checked={formData.recaptcha_is_on === "on"}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  recaptcha_is_on: checked ? "on" : "off",
                })
              }
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Version */}
            <div className="space-y-1.5">
              <Label htmlFor="recaptcha_version" className="text-xs font-semibold">
                reCAPTCHA Version
              </Label>
              <Select
                value={formData.recaptcha_version}
                onValueChange={(val: "v2" | "v3") =>
                  setFormData({ ...formData, recaptcha_version: val })
                }
                disabled={isPending}
              >
                <SelectTrigger id="recaptcha_version" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v2" className="text-xs">
                    reCAPTCHA v2 (Checkbox &quot;I&apos;m not a robot&quot;)
                  </SelectItem>
                  <SelectItem value="v3" className="text-xs">
                    reCAPTCHA v3 (Invisible Score-based)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Site Key */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="recaptcha_site_key" className="text-xs font-semibold">
                Google reCAPTCHA Site Key
              </Label>
              <Input
                id="recaptcha_site_key"
                value={formData.recaptcha_site_key}
                onChange={(e) =>
                  setFormData({ ...formData, recaptcha_site_key: e.target.value })
                }
                placeholder="6Le..."
                className="h-9 text-xs font-mono"
                disabled={isPending}
              />
            </div>

            {/* Secret Key */}
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="recaptcha_secret_key" className="text-xs font-semibold">
                Google reCAPTCHA Secret Key
              </Label>
              <div className="relative">
                <Input
                  id="recaptcha_secret_key"
                  type={showSecret ? "text" : "password"}
                  value={formData.recaptcha_secret_key}
                  onChange={(e) =>
                    setFormData({ ...formData, recaptcha_secret_key: e.target.value })
                  }
                  placeholder="••••••••"
                  className="h-9 text-xs font-mono pr-9"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? (
                    <IconEyeOff className="size-4" />
                  ) : (
                    <IconEye className="size-4" />
                  )}
                </button>
              </div>
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
              {isPending ? "Saving..." : "Save Security Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
