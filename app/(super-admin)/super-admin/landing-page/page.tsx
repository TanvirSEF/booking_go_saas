import { Metadata } from "next";
import { IconBrowser } from "@tabler/icons-react";
import { requireRole } from "@/lib/guards";
import { ACCESS } from "@/lib/roles";
import { getAdminLandingPageSettingsAction } from "@/actions/landing-page";
import { PageHeader } from "@/components/dashboard/page-header";
import { LandingPageCmsHub } from "@/components/super-admin/landing-page/cms-hub";
import { DEFAULT_LANDING_PAGE_DATA } from "@/lib/landing-page";
import type { ILandingPageData } from "@/types/landing-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Landing Page CMS | Super Admin",
  description:
    "Customize landing page copy, hero banners, dedicated modules, screenshots, testimonials, FAQs, and custom CMS pages.",
};

export default async function LandingPageCmsPage() {
  await requireRole(ACCESS.superAdmin, "/super-admin/landing-page");

  const res = await getAdminLandingPageSettingsAction();
  const data: ILandingPageData = res.data || DEFAULT_LANDING_PAGE_DATA;

  return (
    <div className="min-h-screen pb-16">
      <PageHeader
        title="Landing Page CMS"
        description="Comprehensive 13-tab configuration dashboard replicating full WorkDo landing page customization capabilities."
        icon={<IconBrowser size={22} />}
        breadcrumbs={[
          { label: "Dashboard", href: "/super-admin" },
          { label: "Landing Page CMS" },
        ]}
      />

      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <LandingPageCmsHub initialData={data} />
      </main>
    </div>
  );
}
