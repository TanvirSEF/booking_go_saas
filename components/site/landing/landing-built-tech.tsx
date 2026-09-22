import {
  IconCpu,
  IconDatabase,
  IconShieldLock,
  IconCreditCard,
  IconCloudCheck,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import type { IBuiltTechSetting } from "@/types/landing-page";

interface LandingBuiltTechProps {
  data: IBuiltTechSetting;
}

function renderTechIcon(logo: string) {
  switch (logo.toLowerCase()) {
    case "nextjs":
      return <IconCpu className="size-6 text-primary" />;
    case "mongodb":
      return <IconDatabase className="size-6 text-primary" />;
    case "shield":
      return <IconShieldLock className="size-6 text-primary" />;
    case "credit-card":
      return <IconCreditCard className="size-6 text-primary" />;
    default:
      return <IconCloudCheck className="size-6 text-primary" />;
  }
}

export function LandingBuiltTech({ data }: LandingBuiltTechProps) {
  if (!data?.status) return null;

  return (
    <section id="built-tech" className="py-16 md:py-24 border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Architecture
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

        {/* Tech Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.cards.map((card, idx) => (
            <Card
              key={card.id || idx}
              className="rounded-xl border border-border bg-card p-5 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <CardContent className="p-0 space-y-3">
                <div className="size-11 rounded-lg bg-primary/10 flex items-center justify-center">
                  {renderTechIcon(card.logo)}
                </div>
                <h3 className="text-sm font-bold text-foreground">{card.heading}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
