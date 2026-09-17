import {
  IconCalendar,
  IconClock,
  IconCircleCheck,
  IconCircleX,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { BookingTabs } from "@/components/customer/booking-tabs";
import { getCustomerDashboardAction } from "@/actions/customer-appointment";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const dashboardRes = await getCustomerDashboardAction();
  const data = dashboardRes?.data;

  const total = data?.totalBookings || 0;
  const upcoming = data?.upcomingAppointments?.length || 0;
  const completed = data?.completedBookings || 0;
  const cancelled = data?.cancelledBookings || 0;

  const upcomingBookings = data?.upcomingAppointments || [];
  const pastBookings = data?.pastAppointments || [];

  const metricCards = [
    {
      title: "Total Bookings",
      value: total,
      icon: IconCalendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Upcoming",
      value: upcoming,
      icon: IconClock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Completed",
      value: completed,
      icon: IconCircleCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Cancelled",
      value: cancelled,
      icon: IconCircleX,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
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
            <Card key={card.title} className="border-border/60 bg-card text-card-foreground shadow-xs">
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
