import { Metadata } from "next";
import { getEmailTemplatesAction } from "@/actions/email-template";
import { EmailTemplateList } from "@/components/dashboard/email-templates/email-template-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email Notifications & Templates | Dashboard",
  description: "Customize appointment notification emails, variable shortcodes, multi-language translations, and test delivery.",
};

export default async function EmailTemplatesDashboardPage() {
  const res = await getEmailTemplatesAction();
  const templates = res.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Email Notifications & Templates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize automated customer emails, manage multi-language translations, and test SMTP email delivery.
        </p>
      </div>

      <EmailTemplateList initialTemplates={templates} />
    </div>
  );
}
