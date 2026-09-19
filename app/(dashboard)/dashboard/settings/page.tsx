import { Metadata } from "next";
import { getBusinessSettingsAction } from "@/actions/settings";
import { SettingsHub } from "@/components/dashboard/settings/settings-hub";
import type { BusinessSettingsDTO } from "@/types/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Company Settings | Dashboard",
  description: "Configure general business information, branding themes, booking policies, and tax invoicing details.",
};

const defaultSettings: BusinessSettingsDTO = {
  id: "",
  name: "",
  slug: "",
  formType: "form-layout",
  layout: "Formlayout1",
  themeColor: "#3B82F6",
  logoDark: "",
  logoLight: "",
  currency: "USD",
  currencySymbol: "$",
  appointmentPrefix: "#APP000",
  maximumSlot: 1,
  appointmentReminderHours: 24,
  domain: "",
  taxType: "VAT",
  taxNumber: "",
  taxPercentage: 0,
  invoiceFooterNotes: "",
  customCss: "",
  customJs: "",
  settings: {},
};

export default async function SettingsPage() {
  const res = await getBusinessSettingsAction();
  const settings: BusinessSettingsDTO = res.data || defaultSettings;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Company Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization&apos;s business profile, branding visuals, scheduling policies, and tax compliance.
        </p>
      </div>

      <SettingsHub initialSettings={settings} />
    </div>
  );
}
