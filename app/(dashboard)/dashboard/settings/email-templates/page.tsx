import { Metadata } from "next";
import { IconMail } from "@tabler/icons-react";
import { getEmailTemplatesAction } from "@/actions/email-template";
import { EmailTemplateList } from "@/components/dashboard/email-templates/email-template-list";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email Notifications & Templates | Dashboard",
  description: "Customize appointment notification emails, variable shortcodes, multi-language translations, and test delivery.",
};

export default async function EmailTemplatesDashboardPage() {
  const res = await getEmailTemplatesAction();
  const templates = res.data || [];

  return (
    <div className="min-h-screen pb-16">
      <PageHeader
        title="Email Notifications & Templates"
        description="Customize automated customer emails, manage multi-language translations, and test SMTP email delivery."
        icon={<IconMail size={22} />}
        breadcrumbs={[
          { label: "Settings", href: "/dashboard/settings" },
          { label: "Email Templates" },
        ]}
      />

      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <EmailTemplateList initialTemplates={templates} />
      </main>
    </div>
  );
}
