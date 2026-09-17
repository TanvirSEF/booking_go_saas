"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconCalendarEvent,
  IconCalendarPlus,
  IconScissors,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuickActionsBarProps {
  businessSlug: string;
  businessName: string;
}

export function QuickActionsBar({ businessSlug, businessName }: QuickActionsBarProps) {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            type="button"
            onClick={() => setBookingModalOpen(true)}
            className="rounded-xl font-medium shadow-xs gap-2"
          >
            <IconCalendarPlus size={16} />
            <span>New Appointment</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="rounded-xl font-medium border-border/80 bg-card hover:bg-accent gap-2"
          >
            <Link href="/dashboard/appointments/calendar">
              <IconCalendarEvent size={16} className="text-muted-foreground" />
              <span>View Calendar</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="rounded-xl font-medium border-border/80 bg-card hover:bg-accent gap-2"
          >
            <Link href="/dashboard/services">
              <IconScissors size={16} className="text-muted-foreground" />
              <span>Manage Services</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Booking Modal */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-border/70 shadow-2xl">
          <DialogHeader className="p-4 sm:p-6 border-b bg-muted/20">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <IconCalendarPlus className="text-primary" size={20} />
              <span>Create New Appointment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Book a slot directly for a client at {businessName}.
            </DialogDescription>
          </DialogHeader>

          <div className="relative w-full h-[620px] bg-background">
            {businessSlug ? (
              <iframe
                src={`/embed/${businessSlug}`}
                className="w-full h-full border-0"
                title={`Book Appointment - ${businessName}`}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                No active business slug found.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
