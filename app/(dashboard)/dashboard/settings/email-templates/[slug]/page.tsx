import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEmailTemplateDetailsAction } from "@/actions/email-template";
import { TemplateEditor } from "@/components/dashboard/email-templates/template-editor";

export const dynamic = "force-dynamic";

interface TemplateEditorPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: TemplateEditorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const res = await getEmailTemplateDetailsAction(slug, "en");

  if (!res.success || !res.data) {
    return {
      title: "Edit Email Template | Dashboard",
    };
  }

  return {
    title: `Edit ${res.data.name} | Email Templates | Dashboard`,
    description: `Customize email content, shortcode variables, and multi-language translations for ${res.data.name}.`,
  };
}

export default async function EmailTemplateEditorPage({
  params,
}: TemplateEditorPageProps) {
  const { slug } = await params;
  const res = await getEmailTemplateDetailsAction(slug, "en");

  if (!res.success || !res.data) {
    notFound();
  }

  return <TemplateEditor initialTemplate={res.data} initialLang="en" />;
}
