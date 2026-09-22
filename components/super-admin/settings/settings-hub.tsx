"use client";

import { useState } from "react";
import {
  IconPalette,
  IconWorld,
  IconCreditCard,
  IconMail,
  IconCloudUpload,
  IconShieldCheck,
  IconUserCheck,
} from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandTab } from "./brand-tab";
import { RegionalTab } from "./regional-tab";
import { PaymentsTab } from "./payments-tab";
import { EmailTab } from "./email-tab";
import { StorageTab } from "./storage-tab";
import { RecaptchaTab } from "./recaptcha-tab";
import { AuthTab } from "./auth-tab";
import type { AdminSystemSettingsDTO } from "@/types/system-setting";

interface SuperAdminSettingsHubProps {
  initialSettings: AdminSystemSettingsDTO;
}

export function SuperAdminSettingsHub({ initialSettings }: SuperAdminSettingsHubProps) {
  const [activeTab, setActiveTab] = useState("brand");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
      <div className="border-b border-border/60 pb-3">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 w-full h-auto p-1 bg-muted/50 gap-1">
          <TabsTrigger value="brand" className="gap-2 text-xs py-2">
            <IconPalette className="size-4 text-primary shrink-0" />
            <span className="truncate">Brand</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2 text-xs py-2">
            <IconWorld className="size-4 text-primary shrink-0" />
            <span className="truncate">Currency</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 text-xs py-2">
            <IconCreditCard className="size-4 text-primary shrink-0" />
            <span className="truncate">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2 text-xs py-2">
            <IconMail className="size-4 text-primary shrink-0" />
            <span className="truncate">Email / SMTP</span>
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2 text-xs py-2">
            <IconCloudUpload className="size-4 text-primary shrink-0" />
            <span className="truncate">Storage</span>
          </TabsTrigger>
          <TabsTrigger value="recaptcha" className="gap-2 text-xs py-2">
            <IconShieldCheck className="size-4 text-primary shrink-0" />
            <span className="truncate">reCAPTCHA</span>
          </TabsTrigger>
          <TabsTrigger value="auth" className="gap-2 text-xs py-2">
            <IconUserCheck className="size-4 text-primary shrink-0" />
            <span className="truncate">Auth & Access</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="brand" className="outline-none space-y-4">
        <BrandTab initialData={initialSettings.brand || {}} />
      </TabsContent>

      <TabsContent value="system" className="outline-none space-y-4">
        <RegionalTab initialData={initialSettings.system || {}} />
      </TabsContent>

      <TabsContent value="payments" className="outline-none space-y-4">
        <PaymentsTab
          stripeData={initialSettings.stripe || {}}
          paypalData={initialSettings.paypal || {}}
          bankData={initialSettings.bank_transfer || {}}
        />
      </TabsContent>

      <TabsContent value="email" className="outline-none space-y-4">
        <EmailTab initialData={initialSettings.email || {}} />
      </TabsContent>

      <TabsContent value="storage" className="outline-none space-y-4">
        <StorageTab initialData={initialSettings.storage || {}} />
      </TabsContent>

      <TabsContent value="recaptcha" className="outline-none space-y-4">
        <RecaptchaTab initialData={initialSettings.recaptcha || {}} />
      </TabsContent>

      <TabsContent value="auth" className="outline-none space-y-4">
        <AuthTab initialData={initialSettings.auth || {}} />
      </TabsContent>
    </Tabs>
  );
}
