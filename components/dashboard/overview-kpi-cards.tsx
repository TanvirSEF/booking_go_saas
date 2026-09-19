import {
  IconCalendar,
  IconCalendarStar,
  IconClockHour4,
  IconReceipt2,
} from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TenantDashboardMetrics } from "@/types/appointment-query";

interface OverviewKpiCardsProps {
  metrics?: TenantDashboardMetrics;
  currencySymbol?: string;
}

export function OverviewKpiCards({
  metrics,
  currencySymbol = "$",
}: OverviewKpiCardsProps) {
  const totalAppointments = metrics?.totalAppointments ?? 0;
  const pendingAppointments = metrics?.pendingAppointments ?? 0;
  const totalRevenue = metrics?.totalRevenue ?? 0;
  const todayAppointments = metrics?.todayAppointmentsCount ?? 0;

  const formattedRevenue = `${currencySymbol}${totalRevenue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const cards = [
    {
      title: "Total Appointments",
      value: totalAppointments,
      subtitle: "Lifetime Booked",
      subValue: `${totalAppointments} slots`,
      icon: IconCalendar,
      cardBg: "bg-[#def4ec] dark:bg-emerald-950/25 border-emerald-200/60 dark:border-emerald-500/20",
      iconColor: "text-emerald-700 dark:text-emerald-400",
      dotColor: "bg-emerald-200 dark:bg-emerald-500/30",
      titleColor: "text-emerald-800 dark:text-emerald-400",
      cornerColor: "bg-emerald-400/40 dark:bg-emerald-500/15",
    },
    {
      title: "Pending Confirmations",
      value: pendingAppointments,
      subtitle: "Action Required",
      subValue: `${pendingAppointments} awaiting`,
      icon: IconClockHour4,
      cardBg: "bg-[#fee9ee] dark:bg-rose-950/25 border-rose-200/60 dark:border-rose-500/20",
      iconColor: "text-rose-600 dark:text-rose-400",
      dotColor: "bg-rose-200 dark:bg-rose-500/30",
      titleColor: "text-rose-800 dark:text-rose-400",
      cornerColor: "bg-rose-400/40 dark:bg-rose-500/15",
    },
    {
      title: "Total Revenue",
      value: formattedRevenue,
      subtitle: "Cleared Payments",
      subValue: formattedRevenue,
      icon: IconReceipt2,
      cardBg: "bg-[#fff2e2] dark:bg-amber-950/25 border-amber-200/60 dark:border-amber-500/20",
      iconColor: "text-amber-700 dark:text-amber-400",
      dotColor: "bg-amber-200 dark:bg-amber-500/30",
      titleColor: "text-amber-800 dark:text-amber-400",
      cornerColor: "bg-amber-400/40 dark:bg-amber-500/15",
    },
    {
      title: "Today's Bookings",
      value: todayAppointments,
      subtitle: "Scheduled Today",
      subValue: `${todayAppointments} slots`,
      icon: IconCalendarStar,
      cardBg: "bg-[#f3e8ff] dark:bg-purple-950/25 border-purple-200/60 dark:border-purple-500/20",
      iconColor: "text-purple-700 dark:text-purple-400",
      dotColor: "bg-purple-200 dark:bg-purple-500/30",
      titleColor: "text-purple-800 dark:text-purple-400",
      cornerColor: "bg-purple-400/40 dark:bg-purple-500/15",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const IconComponent = card.icon;

        return (
          <Card
            key={card.title}
            className={cn(
              "relative flex min-h-43.75 flex-col justify-between overflow-hidden rounded-2xl border p-5 shadow-xs transition-transform hover:-translate-y-0.5 hover:shadow-md",
              card.cardBg
            )}
          >
            {/* Top row: Icon container + two dots, and count on the right */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg bg-white shadow-2xs dark:bg-white/10 dark:border dark:border-white/10",
                    card.iconColor
                  )}
                >
                  <IconComponent size={18} stroke={2} />
                </div>
                <div className={cn("size-4 rounded-full", card.dotColor)} />
                <div className={cn("size-3 rounded-full", card.dotColor)} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
                {card.value}
              </span>
            </div>

            {/* Bottom row: Title and subtitle/subvalue */}
            <div className="relative z-10 flex flex-col gap-1">
              <span className={cn("text-base font-bold", card.titleColor)}>
                {card.title}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-600 dark:text-muted-foreground">
                  {card.subtitle}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-foreground">
                  {card.subValue}
                </span>
              </div>
            </div>

            {/* Bottom-right circular decoration */}
            <div
              className={cn(
                "pointer-events-none absolute -right-6 -bottom-6 size-20 rounded-full",
                card.cornerColor
              )}
            />
          </Card>
        );
      })}
    </div>
  );
}
