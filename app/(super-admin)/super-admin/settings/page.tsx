import { Metadata } from "next";
import { IconSettings } from "@tabler/icons-react";
import { requireRole } from "@/lib/guards";
import { ACCESS } from "@/lib/roles";
import { getAllSystemSettingsAction } from "@/actions/system-settings";
import { PageHeader } from "@/components/dashboard/page-header";
import { SuperAdminSettingsHub } from "@/components/super-admin/settings/settings-hub";
import type { AdminSystemSettingsDTO } from "@/types/system-setting";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Global System Settings | Super Admin",
  description:
    "System-wide brand configuration, payment gateway keys, SMTP email, and platform defaults.",
};

const defaultSettings: AdminSystemSettingsDTO = {
  brand: {},
  system: {},
  stripe: {},
  paypal: {},
  bank_transfer: {},
  email: {},
  storage: {},
  recaptcha: {},
  auth: {},
};

export default async function SettingsPage() {
  await requireRole(ACCESS.superAdmin, "/super-admin/settings");

  const res = await getAllSystemSettingsAction();
  const settings: AdminSystemSettingsDTO = res.data || defaultSettings;

  return (
    <div className="min-h-screen pb-16">
      <PageHeader
        title="Global System Settings"
        description="Configure platform brand assets, currencies, payment gateways, SMTP mailer, cloud storage, and security."
        icon={<IconSettings size={22} />}
        breadcrumbs={[
          { label: "Dashboard", href: "/super-admin" },
          { label: "Settings" },
        ]}
      />

      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <SuperAdminSettingsHub initialSettings={settings} />
      </main>
    </div>
  );
}

