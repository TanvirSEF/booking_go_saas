"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, History, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentCard } from "@/components/customer/appointment-card";
import { CancelAppointmentDialog } from "@/components/customer/cancel-appointment-dialog";
import { RescheduleAppointmentDialog } from "@/components/customer/reschedule-appointment-dialog";
import type { CustomerAppointmentItem } from "@/types/customer-appointment";

interface BookingTabsProps {
  upcomingBookings: CustomerAppointmentItem[];
  pastBookings: CustomerAppointmentItem[];
}

export function BookingTabs({
  upcomingBookings,
  pastBookings,
}: BookingTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] =
    useState<CustomerAppointmentItem | null>(null);
  const [selectedAppointmentForReschedule, setSelectedAppointmentForReschedule] =
    useState<CustomerAppointmentItem | null>(null);

  const handleCancel = (apt: CustomerAppointmentItem) => {
    setSelectedAppointmentForCancel(apt);
  };

  const handleReschedule = (apt: CustomerAppointmentItem) => {
    setSelectedAppointmentForReschedule(apt);
  };

  const renderEmptyState = (type: "upcoming" | "past") => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-zinc-900 border border-border/60 rounded-xl shadow-xs">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
        {type === "upcoming" ? (
          <Calendar className="w-6 h-6" />
        ) : (
          <History className="w-6 h-6" />
        )}
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
    <>
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
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {selectedAppointmentForCancel && (
        <CancelAppointmentDialog
          isOpen={!!selectedAppointmentForCancel}
          onClose={() => setSelectedAppointmentForCancel(null)}
          appointmentId={selectedAppointmentForCancel.id}
          serviceTitle={selectedAppointmentForCancel.serviceName}
          onSuccess={() => {
            setSelectedAppointmentForCancel(null);
            router.refresh();
          }}
        />
      )}

      {selectedAppointmentForReschedule && (
        <RescheduleAppointmentDialog
          isOpen={!!selectedAppointmentForReschedule}
          onClose={() => setSelectedAppointmentForReschedule(null)}
          appointmentId={selectedAppointmentForReschedule.id}
          serviceTitle={selectedAppointmentForReschedule.serviceName}
          businessId={selectedAppointmentForReschedule.businessId}
          serviceId={selectedAppointmentForReschedule.serviceId}
          staffId={selectedAppointmentForReschedule.staffId}
          currentDate={selectedAppointmentForReschedule.date}
          currentTime={selectedAppointmentForReschedule.time}
          onSuccess={() => {
            setSelectedAppointmentForReschedule(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
