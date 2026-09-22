"use client";

import { useState } from "react";
import { IconChevronLeft, IconChevronRight, IconDeviceDesktop } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { IScreenshotsSetting } from "@/types/landing-page";

interface LandingScreenshotsProps {
  data: IScreenshotsSetting;
}

export function LandingScreenshots({ data }: LandingScreenshotsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!data?.status || !data?.items?.length) return null;

  const total = data.items.length;

  const prev = () => setCurrentIndex((idx) => (idx === 0 ? total - 1 : idx - 1));
  const next = () => setCurrentIndex((idx) => (idx === total - 1 ? 0 : idx + 1));

  const activeItem = data.items[currentIndex];

  return (
    <section id="screenshots" className="py-16 md:py-24 border-b border-border/40 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Platform Preview
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

        {/* Interactive Screenshot Showcase */}
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="relative rounded-2xl border border-border bg-card p-2 sm:p-4 shadow-2xl overflow-hidden ring-1 ring-border/50">
            <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-muted flex items-center justify-center">
              {activeItem?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeItem.image}
                  alt={activeItem.heading}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <IconDeviceDesktop className="size-12 opacity-40" />
                  <span className="text-xs">Preview Not Uploaded</span>
                </div>
              )}
            </div>

            {/* Navigation Overlay Buttons */}
            {total > 1 && (
              <div className="absolute inset-y-0 left-4 right-4 flex items-center justify-between pointer-events-none">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={prev}
                  className="pointer-events-auto size-9 rounded-full shadow-md bg-background/80 backdrop-blur-xs hover:bg-background"
                >
                  <IconChevronLeft className="size-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={next}
                  className="pointer-events-auto size-9 rounded-full shadow-md bg-background/80 backdrop-blur-xs hover:bg-background"
                >
                  <IconChevronRight className="size-5" />
                </Button>
              </div>
            )}
          </div>

          {/* Caption & Indicator Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {data.items.map((item, idx) => (
              <button
                key={item.id || idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  currentIndex === idx
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.heading}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
