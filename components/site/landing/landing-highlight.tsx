import Link from "next/link";
import {
  IconCamera,
  IconTool,
  IconTag,
  IconClock,
  IconSparkles,
  IconArrowRight,
} from "@tabler/icons-react";
import type { IHighlightSetting } from "@/types/landing-page";

interface LandingHighlightProps {
  data: IHighlightSetting;
}

function renderHighlightIcon(logo: string) {
  switch (logo.toLowerCase()) {
    case "camera":
      return <IconCamera className="size-5 text-primary" />;
    case "tool":
      return <IconTool className="size-5 text-primary" />;
    case "tag":
      return <IconTag className="size-5 text-primary" />;
    case "clock":
      return <IconClock className="size-5 text-primary" />;
    default:
      return <IconSparkles className="size-5 text-primary" />;
  }
}

export function LandingHighlight({ data }: LandingHighlightProps) {
  if (!data?.status) return null;

  return (
    <section id="highlight" className="py-16 md:py-24 border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Dedicated Modules
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {data.heading}
          </h2>
          {data.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          )}
        </div>

        {/* Highlight Content Grid: Graphic + Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Side Graphic / Illustration */}
          {data.image && (
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.image}
                  alt={data.heading}
                  className="w-full h-auto rounded-xl object-cover"
                />
              </div>
            </div>
          )}

          {/* Cards List */}
          <div className={data.image ? "lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4" : "col-span-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"}>
            {data.cards.map((card, idx) => (
              <div
                key={card.id || idx}
                className="rounded-xl border border-border/80 bg-card p-5 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {renderHighlightIcon(card.logo)}
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{card.heading}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {card.buttonText && (
                  <div className="pt-3 mt-3 border-t border-border/40">
                    <Link
                      href={card.link || "#"}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>{card.buttonText}</span>
                      <IconArrowRight className="size-3" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
