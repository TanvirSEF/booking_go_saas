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
      cardBg: "bg-[#def4ec] dark:bg-emerald-950/40",
      iconColor: "text-[#0d9488]",
      dotColor: "bg-[#a7f3d0] dark:bg-emerald-800/60",
      titleColor: "text-[#0d9488]",
      cornerColor: "bg-[#10b981]/50",
    },
    {
      title: "Pending Confirmations",
      value: pendingAppointments,
      subtitle: "Action Required",
      subValue: `${pendingAppointments} awaiting`,
      icon: IconClockHour4,
      cardBg: "bg-[#fee9ee] dark:bg-rose-950/40",
      iconColor: "text-[#f43f5e]",
      dotColor: "bg-[#fbcfe8] dark:bg-rose-800/60",
      titleColor: "text-[#f43f5e]",
      cornerColor: "bg-[#f43f5e]/50",
    },
    {
      title: "Total Revenue",
      value: formattedRevenue,
      subtitle: "Cleared Payments",
      subValue: formattedRevenue,
      icon: IconReceipt2,
      cardBg: "bg-[#fff2e2] dark:bg-amber-950/40",
      iconColor: "text-[#ea580c]",
      dotColor: "bg-[#fed7aa] dark:bg-amber-800/60",
      titleColor: "text-[#ea580c]",
      cornerColor: "bg-[#f97316]/50",
    },
    {
      title: "Today's Bookings",
      value: todayAppointments,
      subtitle: "Scheduled Today",
      subValue: `${todayAppointments} slots`,
      icon: IconCalendarStar,
      cardBg: "bg-[#f3e8ff] dark:bg-purple-950/40",
      iconColor: "text-[#7c3aed]",
      dotColor: "bg-[#ddd6fe] dark:bg-purple-800/60",
      titleColor: "text-[#7c3aed]",
      cornerColor: "bg-[#8b5cf6]/50",
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
              "relative flex min-h-43.75 flex-col justify-between overflow-hidden rounded-2xl border-none p-5 shadow-xs transition-transform hover:-translate-y-0.5 hover:shadow-md",
              card.cardBg
            )}
          >
            {/* Top row: Icon container + two dots, and count on the right */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg bg-white shadow-2xs",
                    card.iconColor
                  )}
                >
                  <IconComponent size={18} stroke={2} />
                </div>
                <div className={cn("size-4 rounded-full", card.dotColor)} />
                <div className={cn("size-3 rounded-full", card.dotColor)} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-800">
                {card.value}
              </span>
            </div>

            {/* Bottom row: Title and subtitle/subvalue */}
            <div className="relative z-10 flex flex-col gap-1">
              <span className={cn("text-base font-bold", card.titleColor)}>
                {card.title}
              </span>
              <div className="flex flex-col">
                <span className={cn("text-xs font-medium opacity-80", card.titleColor)}>
                  {card.subtitle}
                </span>
                <span className="text-sm font-semibold text-slate-800">
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
