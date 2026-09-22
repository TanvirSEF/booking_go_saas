import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getSession } from "@/lib/guards";
import { getCustomPageBySlug, getPublicLandingPageData } from "@/lib/landing-page";
import { getPublicSystemSettings } from "@/lib/system-settings";
import { LandingNavbar } from "@/components/site/landing/landing-navbar";
import { LandingFooter } from "@/components/site/landing/landing-footer";
import { LandingTopbar } from "@/components/site/landing/landing-topbar";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCustomPageBySlug(slug);
  const system = await getPublicSystemSettings();

  if (!page) {
    return {
      title: "Page Not Found",
    };
  }

  return {
    title: `${page.name} | ${system.titleText}`,
    description: page.shortDescription || `${page.name} on ${system.titleText}`,
  };
}

export default async function DynamicCustomPage({ params }: PageProps) {
  const { slug } = await params;
  const [page, landingData, systemSettings, session] = await Promise.all([
    getCustomPageBySlug(slug),
    getPublicLandingPageData(),
    getPublicSystemSettings(),
    getSession(),
  ]);

  if (!page) {
    notFound();
  }

  // If page requires login and visitor is unauthenticated
  if (page.loginRequired && !session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/pages/${slug}`)}`);
  }

  // If template type is external URL forwarding
  if (page.templateType === "url" && page.pageUrl) {
    redirect(page.pageUrl);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Topbar if page.header is true */}
      {page.header && <LandingTopbar data={landingData.topbar} />}

      {/* Navbar if page.header is true */}
      {page.header && (
        <LandingNavbar
          customPages={landingData.customPages}
          brandTitle={systemSettings.titleText}
          brandLogo={systemSettings.logoDark || systemSettings.logoLight}
        />
      )}

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
              <IconArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Button>
          </Link>
        </div>

        {/* Page Header Header */}
        <div className="space-y-3 pb-8 border-b border-border/60">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            {page.name}
          </h1>
          {page.shortDescription && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {page.shortDescription}
            </p>
          )}
        </div>

        {/* Formatted Content */}
        <article className="prose dark:prose-invert max-w-none pt-8 text-foreground/90 leading-relaxed">
          <div
            dangerouslySetInnerHTML={{
              __html: page.content || "<p>No content has been published yet.</p>",
            }}
          />
        </article>
      </main>

      {/* Footer if page.footer is true */}
      {page.footer && (
        <LandingFooter
          data={landingData.footer}
          customPages={landingData.customPages}
        />
      )}
    </div>
  );
}
