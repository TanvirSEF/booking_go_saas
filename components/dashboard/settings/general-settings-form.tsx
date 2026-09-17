"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconBuildingStore,
  IconCurrencyDollar,
  IconWorld,
  IconLoader2,
  IconDeviceFloppy,
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
import { updateBusinessGeneralSettingsAction } from "@/actions/settings";
import type { BusinessSettingsDTO } from "@/types/settings";

interface GeneralSettingsFormProps {
  initialData: BusinessSettingsDTO;
}

const COMMON_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar ($)" },
  { code: "EUR", symbol: "€", name: "Euro (€)" },
  { code: "GBP", symbol: "£", name: "British Pound (£)" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar ($)" },
  { code: "AUD", symbol: "$", name: "Australian Dollar ($)" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka (৳)" },
  { code: "INR", symbol: "₹", name: "Indian Rupee (₹)" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham (AED)" },
];

export function GeneralSettingsForm({ initialData }: GeneralSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData.name || "");
  const [currency, setCurrency] = useState(initialData.currency || "USD");
  const [currencySymbol, setCurrencySymbol] = useState(initialData.currencySymbol || "$");
  const [domain, setDomain] = useState(initialData.domain || "");
  const [isPending, setIsPending] = useState(false);

  const handleCurrencySelect = (code: string) => {
    setCurrency(code);
    const found = COMMON_CURRENCIES.find((c) => c.code === code);
    if (found) {
      setCurrencySymbol(found.symbol);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Business name is required.");
      return;
    }

    try {
      setIsPending(true);
      const res = await updateBusinessGeneralSettingsAction({
        name: name.trim(),
        currency: currency.trim(),
        currencySymbol: currencySymbol.trim(),
        domain: domain.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message || "General settings saved successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update general settings.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving general settings.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card text-card-foreground shadow-xs">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <IconBuildingStore className="w-5 h-5 text-primary" />
          General Business Information
        </CardTitle>
        <CardDescription className="text-xs">
          Configure your core company profile, currency preferences, and custom domain routing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Business Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="biz-name" className="text-xs font-semibold">
                Business / Company Name
              </Label>
              <div className="relative">
                <IconBuildingStore className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="biz-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Auto Care & Detailing"
                  className="pl-9 h-9 text-xs"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Currency Code */}
            <div className="space-y-1.5">
              <Label htmlFor="biz-currency" className="text-xs font-semibold">
                Primary Currency
              </Label>
              <Select
                value={currency}
                onValueChange={handleCurrencySelect}
                disabled={isPending}
              >
                <SelectTrigger id="biz-currency" className="h-9 text-xs">
                  <SelectValue placeholder="Select currency" />
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
              <Label htmlFor="biz-symbol" className="text-xs font-semibold">
                Currency Symbol
              </Label>
              <div className="relative">
                <IconCurrencyDollar className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="biz-symbol"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="$"
                  maxLength={5}
                  className="pl-9 h-9 text-xs"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Custom Domain */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="biz-domain" className="text-xs font-semibold">
                Custom Domain (Optional)
              </Label>
              <div className="relative">
                <IconWorld className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="biz-domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. booking.mycompany.com"
                  className="pl-9 h-9 text-xs"
                  disabled={isPending}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Point a CNAME record from your DNS provider to link a custom subdomain.
              </p>
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
              {isPending ? "Saving..." : "Save General Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
