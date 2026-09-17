import { Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BookingTabs } from "@/components/customer/booking-tabs";
import { getCustomerDashboardAction } from "@/actions/customer-appointment";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const dashboardData = await getCustomerDashboardAction();

  const metrics = dashboardData?.metrics || {
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
  };

  const upcomingBookings = dashboardData?.upcoming || [];
  const pastBookings = dashboardData?.past || [];

  const metricCards = [
    {
      title: "Total Bookings",
      value: metrics.total,
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      title: "Upcoming",
      value: metrics.upcoming,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      title: "Completed",
      value: metrics.completed,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      title: "Cancelled",
      value: metrics.cancelled,
      icon: XCircle,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/40",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          My Bookings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your scheduled appointments, view history, or reschedule services.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-border/80 bg-white dark:bg-zinc-900">
              <CardContent className="p-4 sm:p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
                    {card.value}
                  </p>
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl ${card.bgColor} ${card.color}`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <BookingTabs
        upcomingBookings={upcomingBookings}
        pastBookings={pastBookings}
      />
    </div>
  );
}
