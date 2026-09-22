import Link from "next/link";
import { IconArrowRight, IconPackage, IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { IPackageDetailsSetting } from "@/types/landing-page";

interface LandingPackageDetailsProps {
  data: IPackageDetailsSetting;
}

export function LandingPackageDetails({ data }: LandingPackageDetailsProps) {
  if (!data?.status) return null;

  return (
    <section className="py-16 md:py-24 border-b border-border/40 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-xl relative overflow-hidden">
          {/* Subtle decorative background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="space-y-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <IconPackage className="size-3.5" />
              <span>Turnkey Solution</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {data.heading}
            </h2>

            {data.shortDescription && (
              <p className="text-base text-foreground/90 font-medium leading-relaxed">
                {data.shortDescription}
              </p>
            )}

            {data.longDescription && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.longDescription}
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link href={data.link || "/register"}>
                <Button size="lg" className="h-11 px-6 text-sm font-semibold shadow-md gap-2">
                  <span>{data.buttonText || "Get the Package"}</span>
                  <IconArrowRight className="size-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <IconCheck className="size-4 text-emerald-500" />
                <span>Instant Deployment Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
