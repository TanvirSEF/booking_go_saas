import Link from "next/link";
import { IconArrowRight, IconSparkles } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { IJoinUsSetting } from "@/types/landing-page";

interface LandingJoinUsProps {
  data: IJoinUsSetting;
}

export function LandingJoinUs({ data }: LandingJoinUsProps) {
  if (!data?.status) return null;

  return (
    <section className="py-16 md:py-24 border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <div className="rounded-3xl bg-gradient-to-r from-primary/95 to-primary p-8 sm:p-14 text-center text-primary-foreground shadow-2xl relative overflow-hidden space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-semibold">
            <IconSparkles className="size-3.5" />
            <span>Scale With BookingGo</span>
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-primary-foreground max-w-2xl mx-auto leading-tight">
            {data.heading}
          </h2>

          {data.description && (
            <p className="text-sm sm:text-base text-primary-foreground/80 max-w-xl mx-auto leading-relaxed">
              {data.description}
            </p>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href={data.buttonLink || "/register"}>
              <Button
                size="lg"
                variant="secondary"
                className="h-11 px-7 text-sm font-bold shadow-md gap-2 text-foreground"
              >
                <span>{data.buttonText || "Get Started for Free"}</span>
                <IconArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
