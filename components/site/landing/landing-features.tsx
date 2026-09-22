import Link from "next/link";
import {
  IconCalendar,
  IconUsers,
  IconChartBar,
  IconClock,
  IconShield,
  IconArrowRight,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import type { IFeaturesSetting } from "@/types/landing-page";

interface LandingFeaturesProps {
  data: IFeaturesSetting;
}

function renderFeatureIcon(logo: string) {
  switch (logo.toLowerCase()) {
    case "calendar":
      return <IconCalendar className="size-6 text-primary" />;
    case "users":
      return <IconUsers className="size-6 text-primary" />;
    case "chart":
      return <IconChartBar className="size-6 text-primary" />;
    case "clock":
      return <IconClock className="size-6 text-primary" />;
    default:
      return <IconShield className="size-6 text-primary" />;
  }
}

export function LandingFeatures({ data }: LandingFeaturesProps) {
  if (!data?.status) return null;

  return (
    <section id="features" className="py-16 md:py-24 border-b border-border/40 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          {data.title && (
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {data.title}
            </span>
          )}
          {data.heading && (
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {data.heading}
            </h2>
          )}
          {data.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          )}
        </div>

        {/* Features Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.cards.map((card, idx) => (
            <Card
              key={card.id || idx}
              className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs hover:shadow-md transition-all hover:border-primary/40 flex flex-col justify-between"
            >
              <CardContent className="p-0 space-y-4">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  {renderFeatureIcon(card.logo)}
                </div>
                <h3 className="text-base font-bold text-foreground">{card.heading}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </CardContent>

              {card.buttonText && (
                <div className="pt-4 border-t border-border/40 mt-4">
                  <Link
                    href={card.link || "#"}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>{card.buttonText}</span>
                    <IconArrowRight className="size-3.5" />
                  </Link>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
