import Link from "next/link";
import { IconArrowRight, IconCheck, IconDiscount } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { IHeroSetting } from "@/types/landing-page";

interface LandingHeroProps {
  data: IHeroSetting;
}

export function LandingHero({ data }: LandingHeroProps) {
  if (!data?.status) return null;

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border/40">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl -z-10 pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 text-center max-w-4xl space-y-8">
        {/* Offer Tag Badge */}
        {data.offerText && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold shadow-xs">
            <IconDiscount className="size-3.5" />
            <span>{data.offerText}</span>
          </div>
        )}

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          {data.heading}
        </h1>

        {/* Subtitle / Value Proposition */}
        {data.description && (
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {data.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {data.buttonText && data.liveDemoLink && (
            <Link href={data.liveDemoLink}>
              <Button size="lg" className="h-11 px-6 text-sm font-semibold shadow-md gap-2">
                <span>{data.buttonText}</span>
                <IconArrowRight className="size-4" />
              </Button>
            </Link>
          )}

          <Link href="/register">
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-6 text-sm font-semibold border-border hover:bg-muted"
            >
              Start Free Trial
            </Button>
          </Link>
        </div>

        {/* Social Proof / Trusted By */}
        {data.trustedBy && (
          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <IconCheck className="size-3" />
            </span>
            <span>{data.trustedBy}</span>
          </div>
        )}

        {/* Hero Graphic / Preview */}
        {data.bannerImage && (
          <div className="pt-8 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-3 shadow-2xl overflow-hidden ring-1 ring-border/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.bannerImage}
                alt={data.heading}
                className="w-full h-auto rounded-xl object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
