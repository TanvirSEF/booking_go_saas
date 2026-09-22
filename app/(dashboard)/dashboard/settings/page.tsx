import { Metadata } from "next";
import { IconSettings } from "@tabler/icons-react";
import { getBusinessSettingsAction } from "@/actions/settings";
import { SettingsHub } from "@/components/dashboard/settings/settings-hub";
import { PageHeader } from "@/components/dashboard/page-header";
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
    <div className="min-h-screen pb-16">
      <PageHeader
        title="Company Settings"
        description="Manage your organization's business profile, branding visuals, scheduling policies, and tax compliance."
        icon={<IconSettings size={22} />}
        breadcrumbs={[{ label: "Company Settings" }]}
      />

      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <SettingsHub initialSettings={settings} />
      </main>
    </div>
  );
}
