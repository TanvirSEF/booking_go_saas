"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import type { IFaqSetting } from "@/types/landing-page";

interface LandingFaqProps {
  data: IFaqSetting;
}

export function LandingFaq({ data }: LandingFaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!data?.status || !data?.items?.length) return null;

  const toggle = (idx: number) => {
    setOpenIndex((curr) => (curr === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-16 md:py-24 border-b border-border/40 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          {data.title && (
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {data.title}
            </span>
          )}
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {data.heading || "Frequently Asked Questions"}
          </h2>
          {data.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          )}
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {data.items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.id || idx}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-muted/40 cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-semibold text-foreground">
                    {item.question}
                  </span>
                  <IconChevronDown
                    className={`size-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
