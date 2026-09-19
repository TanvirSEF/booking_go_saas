"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconReceiptTax,
  IconPercentage,
  IconFileText,
  IconCode,
  IconLoader2,
  IconDeviceFloppy,
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
import { updateTaxInvoiceSettingsAction } from "@/actions/settings";
import type { BusinessSettingsDTO } from "@/types/settings";

interface TaxInvoiceSettingsFormProps {
  initialData: BusinessSettingsDTO;
}

export function TaxInvoiceSettingsForm({ initialData }: TaxInvoiceSettingsFormProps) {
  const router = useRouter();
  const [taxType, setTaxType] = useState(initialData.taxType || "VAT");
  const [taxNumber, setTaxNumber] = useState(initialData.taxNumber || "");
  const [taxPercentage, setTaxPercentage] = useState(initialData.taxPercentage ?? 0);
  const [invoiceFooterNotes, setInvoiceFooterNotes] = useState(
    initialData.invoiceFooterNotes || ""
  );
  const [customCss, setCustomCss] = useState(initialData.customCss || "");
  const [customJs, setCustomJs] = useState(initialData.customJs || "");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsPending(true);
      const res = await updateTaxInvoiceSettingsAction({
        taxType: taxType.trim(),
        taxNumber: taxNumber.trim() || undefined,
        taxPercentage: Number(taxPercentage) || 0,
        invoiceFooterNotes: invoiceFooterNotes.trim() || undefined,
        customCss: customCss.trim() || undefined,
        customJs: customJs.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message || "Tax & Invoicing settings saved successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update tax & invoice settings.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving tax & invoice settings.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card text-card-foreground shadow-xs">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <IconReceiptTax className="w-5 h-5 text-primary" />
          Tax, Invoicing & Custom Integrations
        </CardTitle>
        <CardDescription className="text-xs">
          Configure VAT/GST identification, customer invoice notes, and inject custom CSS/JS scripts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tax Type */}
            <div className="space-y-1.5">
              <Label htmlFor="tax-type" className="text-xs font-semibold">
                Tax Identification Type
              </Label>
              <Select value={taxType} onValueChange={setTaxType} disabled={isPending}>
                <SelectTrigger id="tax-type" className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VAT" className="text-xs">VAT (Value Added Tax)</SelectItem>
                  <SelectItem value="GST" className="text-xs">GST (Goods & Services Tax)</SelectItem>
                  <SelectItem value="SalesTax" className="text-xs">Sales Tax</SelectItem>
                  <SelectItem value="None" className="text-xs">None / Exempt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tax / VAT Number */}
            <div className="space-y-1.5">
              <Label htmlFor="tax-number" className="text-xs font-semibold">
                Tax / VAT Registration No.
              </Label>
              <Input
                id="tax-number"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="e.g. GB123456789"
                className="h-9 text-xs font-mono"
                disabled={isPending}
              />
            </div>

            {/* Tax Rate Percentage */}
            <div className="space-y-1.5">
              <Label htmlFor="tax-pct" className="text-xs font-semibold">
                Default Tax Rate (%)
              </Label>
              <div className="relative">
                <IconPercentage className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="tax-pct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(Number(e.target.value))}
                  className="pl-9 h-9 text-xs"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Invoice Footer Notes */}
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="invoice-footer" className="text-xs font-semibold flex items-center gap-1.5">
                <IconFileText className="w-3.5 h-3.5 text-primary" />
                Invoice & Receipt Footer Notes
              </Label>
              <Textarea
                id="invoice-footer"
                value={invoiceFooterNotes}
                onChange={(e) => setInvoiceFooterNotes(e.target.value)}
                placeholder="e.g. Thank you for your business! Bank Account: Apex Bank, Account: 12345678, Sort Code: 00-11-22"
                className="text-xs min-h-[70px] resize-none"
                disabled={isPending}
              />
            </div>

            {/* Custom CSS */}
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="custom-css" className="text-xs font-semibold flex items-center gap-1.5">
                <IconCode className="w-3.5 h-3.5 text-primary" />
                Custom CSS Injections
              </Label>
              <Textarea
                id="custom-css"
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                placeholder=".booking-wizard-custom { font-family: 'Inter', sans-serif; }"
                className="text-xs font-mono min-h-[70px] resize-none"
                disabled={isPending}
              />
            </div>

            {/* Custom JS */}
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="custom-js" className="text-xs font-semibold flex items-center gap-1.5">
                <IconCode className="w-3.5 h-3.5 text-primary" />
                Custom JavaScript Integrations (Analytics / Tracking)
              </Label>
              <Textarea
                id="custom-js"
                value={customJs}
                onChange={(e) => setCustomJs(e.target.value)}
                placeholder="console.log('Wizard loaded');"
                className="text-xs font-mono min-h-[70px] resize-none"
                disabled={isPending}
              />
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
              {isPending ? "Saving..." : "Save Tax & Invoice Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
