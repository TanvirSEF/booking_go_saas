"use client";

import { useState } from "react";
import {
  IconSpeakerphone,
  IconHome,
  IconListDetails,
  IconSparkles,
  IconDeviceDesktop,
  IconCpu,
  IconPackage,
  IconStar,
  IconHelp,
  IconUsersGroup,
  IconLayoutNavbarCollapse,
  IconSearch,
  IconFileText,
} from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopbarTab } from "./topbar-tab";
import { HeroTab } from "./hero-tab";
import { FeaturesTab } from "./features-tab";
import { HighlightTab } from "./highlight-tab";
import { ScreenshotsTab } from "./screenshots-tab";
import { BuiltTechTab } from "./built-tech-tab";
import { PackageDetailsTab } from "./package-details-tab";
import { ReviewsTab } from "./reviews-tab";
import { FaqTab } from "./faq-tab";
import { JoinUsTab } from "./join-us-tab";
import { FooterTab } from "./footer-tab";
import { SeoTab } from "./seo-tab";
import { CustomPagesTab } from "./custom-pages-tab";
import type { ILandingPageData } from "@/types/landing-page";

interface LandingPageCmsHubProps {
  initialData: ILandingPageData;
}

export function LandingPageCmsHub({ initialData }: LandingPageCmsHubProps) {
  const [activeTab, setActiveTab] = useState("hero");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
      {/* 13-Tab Horizontal Scroll Navigation */}
      <div className="border-b border-border/60 pb-3">
        <div className="overflow-x-auto pb-1 scrollbar-thin">
          <TabsList className="inline-flex h-auto p-1 bg-muted/50 gap-1 min-w-full justify-start">
            <TabsTrigger value="topbar" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconSpeakerphone className="size-4 text-primary shrink-0" />
              <span>1. Topbar</span>
            </TabsTrigger>

            <TabsTrigger value="hero" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconHome className="size-4 text-primary shrink-0" />
              <span>2. Home / Hero</span>
            </TabsTrigger>

            <TabsTrigger value="features" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconListDetails className="size-4 text-primary shrink-0" />
              <span>3. Features</span>
            </TabsTrigger>

            <TabsTrigger value="highlight" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconSparkles className="size-4 text-primary shrink-0" />
              <span>4. Highlights</span>
            </TabsTrigger>

            <TabsTrigger value="screenshots" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconDeviceDesktop className="size-4 text-primary shrink-0" />
              <span>5. Screenshots</span>
            </TabsTrigger>

            <TabsTrigger value="builtTech" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconCpu className="size-4 text-primary shrink-0" />
              <span>6. BuiltTech</span>
            </TabsTrigger>

            <TabsTrigger value="packageDetails" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconPackage className="size-4 text-primary shrink-0" />
              <span>7. Package</span>
            </TabsTrigger>

            <TabsTrigger value="reviews" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconStar className="size-4 text-primary shrink-0" />
              <span>8. Reviews</span>
            </TabsTrigger>

            <TabsTrigger value="faq" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconHelp className="size-4 text-primary shrink-0" />
              <span>9. FAQ</span>
            </TabsTrigger>

            <TabsTrigger value="joinUs" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconUsersGroup className="size-4 text-primary shrink-0" />
              <span>10. Join Us</span>
            </TabsTrigger>

            <TabsTrigger value="footer" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconLayoutNavbarCollapse className="size-4 text-primary shrink-0" />
              <span>11. Footer</span>
            </TabsTrigger>

            <TabsTrigger value="seo" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconSearch className="size-4 text-primary shrink-0" />
              <span>12. SEO & Pixels</span>
            </TabsTrigger>

            <TabsTrigger value="customPages" className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap">
              <IconFileText className="size-4 text-primary shrink-0" />
              <span>13. Custom Pages</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      {/* 13 Tab Contents */}
      <TabsContent value="topbar" className="outline-none space-y-4">
        <TopbarTab initialData={initialData.topbar} />
      </TabsContent>

      <TabsContent value="hero" className="outline-none space-y-4">
        <HeroTab initialData={initialData.hero} />
      </TabsContent>

      <TabsContent value="features" className="outline-none space-y-4">
        <FeaturesTab initialData={initialData.features} />
      </TabsContent>

      <TabsContent value="highlight" className="outline-none space-y-4">
        <HighlightTab initialData={initialData.highlight} />
      </TabsContent>

      <TabsContent value="screenshots" className="outline-none space-y-4">
        <ScreenshotsTab initialData={initialData.screenshots} />
      </TabsContent>

      <TabsContent value="builtTech" className="outline-none space-y-4">
        <BuiltTechTab initialData={initialData.builtTech} />
      </TabsContent>

      <TabsContent value="packageDetails" className="outline-none space-y-4">
        <PackageDetailsTab initialData={initialData.packageDetails} />
      </TabsContent>

      <TabsContent value="reviews" className="outline-none space-y-4">
        <ReviewsTab initialData={initialData.reviews} />
      </TabsContent>

      <TabsContent value="faq" className="outline-none space-y-4">
        <FaqTab initialData={initialData.faq} />
      </TabsContent>

      <TabsContent value="joinUs" className="outline-none space-y-4">
        <JoinUsTab initialData={initialData.joinUs} />
      </TabsContent>

      <TabsContent value="footer" className="outline-none space-y-4">
        <FooterTab initialData={initialData.footer} />
      </TabsContent>

      <TabsContent value="seo" className="outline-none space-y-4">
        <SeoTab initialSeo={initialData.seo} initialPixels={initialData.pixels} />
      </TabsContent>

      <TabsContent value="customPages" className="outline-none space-y-4">
        <CustomPagesTab initialPages={initialData.customPages} />
      </TabsContent>
    </Tabs>
  );
}
