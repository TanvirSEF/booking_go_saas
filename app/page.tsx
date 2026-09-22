import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/guards";
import { ROLE_HOME, isRole } from "@/lib/roles";
import { getPublicLandingPageData } from "@/lib/landing-page";
import { getPublicSystemSettings } from "@/lib/system-settings";
import { LandingTopbar } from "@/components/site/landing/landing-topbar";
import { LandingNavbar } from "@/components/site/landing/landing-navbar";
import { LandingHero } from "@/components/site/landing/landing-hero";
import { LandingFeatures } from "@/components/site/landing/landing-features";
import { LandingHighlight } from "@/components/site/landing/landing-highlight";
import { LandingScreenshots } from "@/components/site/landing/landing-screenshots";
import { LandingBuiltTech } from "@/components/site/landing/landing-built-tech";
import { LandingPackageDetails } from "@/components/site/landing/landing-package-details";
import { LandingReviews } from "@/components/site/landing/landing-reviews";
import { LandingFaq } from "@/components/site/landing/landing-faq";
import { LandingJoinUs } from "@/components/site/landing/landing-join-us";
import { LandingFooter } from "@/components/site/landing/landing-footer";
import { LandingScripts } from "@/components/site/landing/landing-scripts";

export const revalidate = 300; // Next.js ISR 5-minute cache

export async function generateMetadata(): Promise<Metadata> {
  const landingData = await getPublicLandingPageData();
  const system = await getPublicSystemSettings();

  const title = landingData?.seo?.metaTitle || `${system.titleText} - Modern Appointment & SaaS Scheduling`;
  const description =
    landingData?.seo?.metaDescription ||
    "Simplify your booking lifecycle with our complete multi-tenant scheduling platform.";

  return {
    title,
    description,
    keywords: landingData?.seo?.metaKeywords?.split(",").map((k) => k.trim()),
    openGraph: {
      title,
      description,
      images: landingData?.seo?.metaImage ? [{ url: landingData.seo.metaImage }] : [],
    },
  };
}

export default async function RootPage() {
  const [session, systemSettings, landingData] = await Promise.all([
    getSession(),
    getPublicSystemSettings(),
    getPublicLandingPageData(),
  ]);

  // If the Super Admin toggled off the public marketing landing page:
  if (!systemSettings.landingPageIsOn) {
    if (!session?.user) {
      redirect("/login");
    }
    const role = session.user.role;
    redirect(isRole(role) ? ROLE_HOME[role] : "/unauthorized");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* 1. Top Announcement Bar */}
      <LandingTopbar data={landingData.topbar} />

      {/* 2. Floating Navbar */}
      <LandingNavbar
        customPages={landingData.customPages}
        brandTitle={systemSettings.titleText}
        brandLogo={systemSettings.logoDark || systemSettings.logoLight}
      />

      {/* Main Content Sections */}
      <main className="flex-1">
        <LandingHero data={landingData.hero} />
        <LandingFeatures data={landingData.features} />
        <LandingHighlight data={landingData.highlight} />
        <LandingScreenshots data={landingData.screenshots} />
        <LandingBuiltTech data={landingData.builtTech} />
        <LandingPackageDetails data={landingData.packageDetails} />
        <LandingReviews data={landingData.reviews} />
        <LandingFaq data={landingData.faq} />
        <LandingJoinUs data={landingData.joinUs} />
      </main>

      {/* Footer */}
      <LandingFooter
        data={landingData.footer}
        customPages={landingData.customPages}
      />

      {/* Analytics, Tracking Pixels & Custom Scripts */}
      <LandingScripts
        seo={landingData.seo}
        pixels={landingData.pixels}
        customCode={landingData.customCode}
      />
    </div>
  );
}
