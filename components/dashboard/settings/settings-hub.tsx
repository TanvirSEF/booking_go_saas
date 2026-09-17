"use client";

import { useState } from "react";
import {
  IconBuildingStore,
  IconPalette,
  IconCalendarTime,
  IconReceiptTax,
} from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettingsForm } from "@/components/dashboard/settings/general-settings-form";
import { BrandingSettingsForm } from "@/components/dashboard/settings/branding-settings-form";
import { PolicySettingsForm } from "@/components/dashboard/settings/policy-settings-form";
import { TaxInvoiceSettingsForm } from "@/components/dashboard/settings/tax-invoice-settings-form";
import type { BusinessSettingsDTO } from "@/types/settings";

interface SettingsHubProps {
  initialSettings: BusinessSettingsDTO;
}

export function SettingsHub({ initialSettings }: SettingsHubProps) {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
      <div className="border-b border-border/60 pb-3">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto h-auto p-1 bg-muted/50">
          <TabsTrigger value="general" className="gap-2 text-xs py-2">
            <IconBuildingStore className="w-4 h-4 text-primary" />
            <span>General Info</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 text-xs py-2">
            <IconPalette className="w-4 h-4 text-primary" />
            <span>Branding & Theme</span>
          </TabsTrigger>
          <TabsTrigger value="policy" className="gap-2 text-xs py-2">
            <IconCalendarTime className="w-4 h-4 text-primary" />
            <span>Booking Policies</span>
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-2 text-xs py-2">
            <IconReceiptTax className="w-4 h-4 text-primary" />
            <span>Tax & Invoicing</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="general" className="outline-none space-y-4">
        <GeneralSettingsForm initialData={initialSettings} />
      </TabsContent>

      <TabsContent value="branding" className="outline-none space-y-4">
        <BrandingSettingsForm initialData={initialSettings} />
      </TabsContent>

      <TabsContent value="policy" className="outline-none space-y-4">
        <PolicySettingsForm initialData={initialSettings} />
      </TabsContent>

      <TabsContent value="tax" className="outline-none space-y-4">
        <TaxInvoiceSettingsForm initialData={initialSettings} />
      </TabsContent>
    </Tabs>
  );
}
