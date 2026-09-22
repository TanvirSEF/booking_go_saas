import Link from "next/link";
import { IconStarFilled, IconArrowRight } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import type { IReviewsSetting } from "@/types/landing-page";

interface LandingReviewsProps {
  data: IReviewsSetting;
}

export function LandingReviews({ data }: LandingReviewsProps) {
  if (!data?.status || !data?.items?.length) return null;

  return (
    <section id="reviews" className="py-16 md:py-24 border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Customer Testimonials
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Trusted by Thriving Service Businesses Worldwide
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Real experiences from clinics, salons, and consultants using BookingGo every day.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.items.map((item, idx) => (
            <Card
              key={item.id || idx}
              className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
            >
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                    {item.tag}
                  </span>
                  <div className="flex text-amber-500 gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <IconStarFilled key={s} className="size-3.5" />
                    ))}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-foreground">&ldquo;{item.heading}&rdquo;</h3>

                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  {item.description}
                </p>

                {item.image && (
                  <div className="flex items-center gap-3 pt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.heading}
                      className="size-9 rounded-full object-cover border border-border shrink-0"
                    />
                    <div className="text-xs min-w-0">
                      <p className="font-semibold text-foreground truncate">Verified Client</p>
                      <p className="text-[10px] text-muted-foreground truncate">BookingGo Customer</p>
                    </div>
                  </div>
                )}
              </CardContent>

              {item.buttonText && (
                <div className="pt-4 mt-4 border-t border-border/40">
                  <Link
                    href={item.link || "/login"}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>{item.buttonText}</span>
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
