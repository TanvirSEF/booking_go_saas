"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RecentOrdersChartProps {
  chartDays: string[];
  ordersPerDay?: Record<string, number>;
}

export function RecentOrdersChart({
  chartDays,
  ordersPerDay = {},
}: RecentOrdersChartProps) {
  // Tooltip is hidden when mouse pointer is outside the chart component
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const activeDay = activeIdx !== null ? chartDays[activeIdx] : null;
  const activeCount = activeDay ? (ordersPerDay[activeDay] ?? 0) : 0;

  // Calculate horizontal percentage for positioning vertical guide and tooltip
  const stepPercent = chartDays.length > 1 ? 100 / (chartDays.length - 1) : 0;
  const activePercent = activeIdx !== null ? activeIdx * stepPercent : 0;

  // Dynamic translation to ensure tooltip never clips at chart boundaries
  const tooltipTranslateClass =
    activeIdx === 0
      ? "-translate-x-3"
      : activeIdx === chartDays.length - 1
        ? "-translate-x-[92%]"
        : "-translate-x-1/2";

  return (
    <Card
      onMouseLeave={() => setActiveIdx(null)}
      className="flex w-full max-w-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs"
    >
      {/* Scrollable container on small screens with momentum touch scrolling */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
        <div className="relative flex min-w-[640px] flex-col">
          {/* Main Chart Area */}
          <div className="relative flex h-72 w-full">
            {/* Left Y-axis label */}
            <div className="flex w-10 shrink-0 items-center justify-center">
              <span className="text-[11px] font-bold text-foreground -rotate-90 select-none">
                Order
              </span>
            </div>

            {/* Gridlines & Interactive Canvas */}
            <div className="relative flex flex-1 flex-col justify-between">
              {/* Horizontal dashed grid lines (5 to 0) */}
              {[5, 4, 3, 2, 1, 0].map((val) => (
                <div
                  key={val}
                  className="flex items-center gap-3 text-xs text-muted-foreground"
                >
                  <span className="w-3 text-right text-[11px] select-none">
                    {val}
                  </span>
                  <div className="h-px flex-1 border-b border-dashed border-border/50" />
                </div>
              ))}

              {/* Baseline solid green line on 0 */}
              <div className="absolute right-0 bottom-0 left-6 h-[3px] rounded-full bg-[#22c55e]" />

              {/* Active Vertical Guideline and Tooltip overlay area (only visible when hovered) */}
              {activeIdx !== null && activeDay && (
                <div className="pointer-events-none absolute inset-y-0 right-0 left-6">
                  {/* Vertical Dashed Line */}
                  <div
                    className="absolute top-0 bottom-0 w-px border-l border-dashed border-slate-300 dark:border-slate-600 transition-all duration-150"
                    style={{ left: `${activePercent}%` }}
                  />

                  {/* Data point dot on baseline */}
                  <div
                    className="absolute bottom-0 -translate-x-1/2 translate-y-1/2 size-2.5 rounded-full bg-[#22c55e] ring-2 ring-white dark:ring-slate-900 transition-all duration-150"
                    style={{ left: `${activePercent}%` }}
                  />

                  {/* Tooltip Card matching the design */}
                  <div
                    className={cn(
                      "absolute bottom-6 z-20 overflow-hidden whitespace-nowrap rounded-lg border border-slate-200 bg-white shadow-md transition-all duration-150 dark:border-slate-700 dark:bg-slate-900",
                      tooltipTranslateClass
                    )}
                    style={{ left: `${activePercent}%` }}
                  >
                    <div className="border-b border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {activeDay}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                      <span className="size-2 rounded-full bg-[#22c55e]" />
                      <span>
                        Order: <span className="font-bold">{activeCount}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Transparent hover detection columns across the chart */}
              <div className="absolute inset-y-0 right-0 left-6 flex">
                {chartDays.map((_, idx) => (
                  <div
                    key={idx}
                    className="flex-1 cursor-pointer"
                    onMouseEnter={() => setActiveIdx(idx)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* X-axis dates with active framed box */}
          <div className="mt-4 flex items-center justify-between pl-16 pr-2 text-[11px]">
            {chartDays.map((day, idx) => {
              const isActive = idx === activeIdx;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={cn(
                    "cursor-pointer whitespace-nowrap rounded px-1.5 sm:px-2 py-0.5 text-[11px] transition-colors select-none",
                    isActive
                      ? "border border-slate-400/80 bg-slate-100 font-semibold text-slate-900 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Bottom X-axis label */}
          <span className="mt-4 text-center text-xs font-bold text-foreground select-none">
            Months
          </span>
        </div>
      </div>
    </Card>
  );
}
