"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, History, PlusCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AppointmentCard, AppointmentItem } from "./appointment-card";

interface BookingTabsProps {
  upcomingBookings: AppointmentItem[];
  pastBookings: AppointmentItem[];
}

export function BookingTabs({ upcomingBookings, pastBookings }: BookingTabsProps) {
  const [activeTab, setActiveTab] = useState("upcoming");

  const handleCancel = (appointment: AppointmentItem) => {
    console.log("Trigger cancel dialog for", appointment.id);
  };

  const handleReschedule = (appointment: AppointmentItem) => {
    console.log("Trigger reschedule dialog for", appointment.id);
  };

  const handleViewReceipt = (appointment: AppointmentItem) => {
    if (appointment.receiptUrl) {
      window.open(appointment.receiptUrl, "_blank");
    }
  };

  const renderEmptyState = (type: "upcoming" | "past") => (
    <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 border rounded-xl border-dashed">
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
        {type === "upcoming" ? <Calendar className="w-6 h-6" /> : <History className="w-6 h-6" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {type === "upcoming" ? "No upcoming appointments" : "No past bookings history"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        {type === "upcoming"
          ? "You don't have any scheduled appointments right now. Ready to book your next service?"
          : "Your completed and previous appointments will appear here."}
      </p>
      {type === "upcoming" && (
        <Button asChild className="gap-2">
          <Link href="/">
            <PlusCircle className="w-4 h-4" />
            Book New Appointment
          </Link>
        </Button>
      )}
    </div>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <TabsList className="grid grid-cols-2 w-full sm:w-auto">
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span>Upcoming ({upcomingBookings.length})</span>
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <History className="w-4 h-4" />
            <span>Past History ({pastBookings.length})</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="upcoming" className="space-y-4 outline-none">
        {upcomingBookings.length === 0 ? (
          renderEmptyState("upcoming")
        ) : (
          upcomingBookings.map((apt) => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              isUpcoming={true}
              onCancelClick={handleCancel}
              onRescheduleClick={handleReschedule}
              onViewReceiptClick={handleViewReceipt}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="past" className="space-y-4 outline-none">
        {pastBookings.length === 0 ? (
          renderEmptyState("past")
        ) : (
          pastBookings.map((apt) => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              isUpcoming={false}
              onViewReceiptClick={handleViewReceipt}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
