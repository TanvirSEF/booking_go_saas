"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconWorld,
  IconLoader2,
  IconDeviceFloppy,
  IconClock,
  IconCalendar,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSystemSettingsGroupAction } from "@/actions/system-settings";
import { ResetGroupDialog } from "./reset-group-dialog";

interface RegionalTabProps {
  initialData: Record<string, string>;
}

const COMMON_CURRENCIES = [
  { code: "USD", symbol: "$", name: "USD - US Dollar ($)" },
  { code: "EUR", symbol: "€", name: "EUR - Euro (€)" },
  { code: "GBP", symbol: "£", name: "GBP - British Pound (£)" },
  { code: "CAD", symbol: "$", name: "CAD - Canadian Dollar ($)" },
  { code: "AUD", symbol: "$", name: "AUD - Australian Dollar ($)" },
  { code: "BDT", symbol: "৳", name: "BDT - Bangladeshi Taka (৳)" },
  { code: "INR", symbol: "₹", name: "INR - Indian Rupee (₹)" },
  { code: "AED", symbol: "د.إ", name: "AED - UAE Dirham" },
  { code: "JPY", symbol: "¥", name: "JPY - Japanese Yen (¥)" },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function RegionalTab({ initialData }: RegionalTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    default_currency: initialData.default_currency || "USD",
    default_currency_symbol: initialData.default_currency_symbol || "$",
    currency_symbol_position: (initialData.currency_symbol_position as "pre" | "post") || "pre",
    currency_format: (initialData.currency_format as "1" | "2" | "3") || "2",
    date_format: initialData.date_format || "YYYY-MM-DD",
    time_format: (initialData.time_format as "12" | "24") || "12",
    timezone: initialData.timezone || "UTC",
  });
  const [isPending, setIsPending] = useState(false);

  const handleCurrencyChange = (code: string) => {
    const found = COMMON_CURRENCIES.find((c) => c.code === code);
    setFormData({
      ...formData,
      default_currency: code,
      default_currency_symbol: found ? found.symbol : formData.default_currency_symbol,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsPending(true);
      const res = await updateSystemSettingsGroupAction("system", formData);

      if (res.success) {
        toast.success(res.message || "Regional & currency settings saved!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update regional settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving regional settings.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-xl border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <IconWorld className="size-5 text-primary" />
            System & Currency Configuration
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Global currency ISO codes, symbols, decimal positions, dates, and baseline server timezone.
          </CardDescription>
        </div>
        <ResetGroupDialog group="system" groupLabel="Currency & System" />
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Currency Code */}
            <div className="space-y-1.5">
              <Label htmlFor="default_currency" className="text-xs font-semibold">
                Default Currency Code
              </Label>
              <Select
                value={formData.default_currency}
                onValueChange={handleCurrencyChange}
                disabled={isPending}
              >
                <SelectTrigger id="default_currency" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency Symbol */}
            <div className="space-y-1.5">
              <Label htmlFor="default_currency_symbol" className="text-xs font-semibold">
                Currency Symbol
              </Label>
              <Input
                id="default_currency_symbol"
                value={formData.default_currency_symbol}
                onChange={(e) =>
                  setFormData({ ...formData, default_currency_symbol: e.target.value })
                }
                placeholder="$"
                maxLength={5}
                className="h-9 text-xs"
                disabled={isPending}
                required
              />
            </div>

            {/* Currency Symbol Position */}
            <div className="space-y-1.5">
              <Label htmlFor="currency_symbol_position" className="text-xs font-semibold">
                Symbol Position
              </Label>
              <Select
                value={formData.currency_symbol_position}
                onValueChange={(val: "pre" | "post") =>
                  setFormData({ ...formData, currency_symbol_position: val })
                }
                disabled={isPending}
              >
                <SelectTrigger id="currency_symbol_position" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre" className="text-xs">
                    Pre-amount ($100)
                  </SelectItem>
                  <SelectItem value="post" className="text-xs">
                    Post-amount (100$)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Decimal Precision */}
            <div className="space-y-1.5">
              <Label htmlFor="currency_format" className="text-xs font-semibold">
                Decimal Format
              </Label>
              <Select
                value={formData.currency_format}
                onValueChange={(val: "1" | "2" | "3") =>
                  setFormData({ ...formData, currency_format: val })
                }
                disabled={isPending}
              >
                <SelectTrigger id="currency_format" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Decimals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-xs">1 Decimal (0.0)</SelectItem>
                  <SelectItem value="2" className="text-xs">2 Decimals (0.00)</SelectItem>
                  <SelectItem value="3" className="text-xs">3 Decimals (0.000)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Format */}
            <div className="space-y-1.5">
              <Label htmlFor="date_format" className="text-xs font-semibold flex items-center gap-1.5">
                <IconCalendar className="size-3.5 text-muted-foreground" />
                Date Format
              </Label>
              <Select
                value={formData.date_format}
                onValueChange={(val) => setFormData({ ...formData, date_format: val })}
                disabled={isPending}
              >
                <SelectTrigger id="date_format" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Date Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YYYY-MM-DD" className="text-xs">YYYY-MM-DD (2026-09-22)</SelectItem>
                  <SelectItem value="DD-MM-YYYY" className="text-xs">DD-MM-YYYY (22-09-2026)</SelectItem>
                  <SelectItem value="MM/DD/YYYY" className="text-xs">MM/DD/YYYY (09/22/2026)</SelectItem>
                  <SelectItem value="DD/MM/YYYY" className="text-xs">DD/MM/YYYY (22/09/2026)</SelectItem>
                  <SelectItem value="MMM DD, YYYY" className="text-xs">MMM DD, YYYY (Sep 22, 2026)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Format */}
            <div className="space-y-1.5">
              <Label htmlFor="time_format" className="text-xs font-semibold flex items-center gap-1.5">
                <IconClock className="size-3.5 text-muted-foreground" />
                Time Format
              </Label>
              <Select
                value={formData.time_format}
                onValueChange={(val: "12" | "24") =>
                  setFormData({ ...formData, time_format: val })
                }
                disabled={isPending}
              >
                <SelectTrigger id="time_format" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Time Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12" className="text-xs">12 Hours (02:30 PM)</SelectItem>
                  <SelectItem value="24" className="text-xs">24 Hours (14:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="timezone" className="text-xs font-semibold">
                Default Platform Timezone
              </Label>
              <Select
                value={formData.timezone}
                onValueChange={(val) => setFormData({ ...formData, timezone: val })}
                disabled={isPending}
              >
                <SelectTrigger id="timezone" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Select Timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-xs">
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {isPending ? "Saving..." : "Save System Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
