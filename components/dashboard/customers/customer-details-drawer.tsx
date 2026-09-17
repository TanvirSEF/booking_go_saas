'use client';

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { CustomerSpendBadge } from './customer-spend-badge';
import {
  IconMail,
  IconPhone,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconScissors,
  IconUser,
  IconLoader2,
  IconCalendarEvent,
  IconChecklist,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { getCustomerDetailsAction } from '@/actions/customer-crm';
import type {
  CustomerCRMItem,
  CustomerAppointmentSummary,
  CustomerDetailDTO,
} from '@/types/customer-crm';

interface CustomerDetailsDrawerProps {
  customer: CustomerCRMItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitials(name: string): string {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CustomerDetailsDrawer({
  customer,
  open,
  onOpenChange,
}: CustomerDetailsDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<CustomerDetailDTO | null>(null);

  // Fetch full details & chronological appointment list whenever customer ID changes
  useEffect(() => {
    if (!customer?.id || !open) {
      return;
    }

    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) setLoading(true);
    });

    getCustomerDetailsAction(customer.id)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setDetails(res.data);
        } else {
          toast.error(res.error || 'Failed to load customer profile details.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Error fetching customer profile.';
        toast.error(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [customer?.id, open]);

  if (!customer) return null;

  const activeCustomer = details?.customer || customer;
  const appointments: CustomerAppointmentSummary[] = details?.appointments || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-theme="company"
        side="right"
        className="w-full sm:max-w-lg p-0 overflow-y-auto bg-card border-border flex flex-col"
      >
        {/* Profile Header Banner */}
        <div className="p-6 border-b border-border bg-muted/20">
          <SheetHeader className="p-0 text-left">
            <div className="flex items-start gap-4 pr-6">
              <Avatar className="size-14 rounded-2xl border border-border shadow-xs shrink-0">
                <AvatarImage src={activeCustomer.avatar} alt={activeCustomer.name} />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-primary font-bold text-base">
                  {getInitials(activeCustomer.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg font-bold text-foreground truncate">
                  {activeCustomer.name}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Customer since {new Date(activeCustomer.createdAt).toLocaleDateString()}
                </SheetDescription>

                {/* Lifetime Spend Badge */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <CustomerSpendBadge amount={activeCustomer.totalSpent} size="sm" />
                  <Badge variant="outline" className="text-[11px] font-medium py-0.5 px-2 rounded-lg">
                    {activeCustomer.completedAppointments} Completed / {activeCustomer.totalAppointments} Total
                  </Badge>
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Contact Details Overview */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IconUser size={14} className="text-primary" />
              <span>Contact & Demographics</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                  <IconMail size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground block">Email</span>
                  <span className="font-semibold text-foreground truncate block">
                    {activeCustomer.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                  <IconPhone size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground block">Phone</span>
                  <span className="font-semibold text-foreground truncate block">
                    {activeCustomer.contact}
                  </span>
                </div>
              </div>

              {activeCustomer.gender && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                    <IconUser size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground block">Gender</span>
                    <span className="font-semibold text-foreground capitalize truncate block">
                      {activeCustomer.gender}
                    </span>
                  </div>
                </div>
              )}

              {activeCustomer.dob && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                    <IconCalendar size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground block">Date of Birth</span>
                    <span className="font-semibold text-foreground truncate block">
                      {activeCustomer.dob}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {activeCustomer.description && (
              <div className="pt-2 border-t border-border">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Customer Notes:
                </span>
                <p className="text-xs text-foreground/90 bg-muted/30 p-2.5 rounded-xl border border-border/60">
                  {activeCustomer.description}
                </p>
              </div>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Chronological Appointment Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <IconChecklist size={14} className="text-primary" />
                <span>Chronological Bookings ({appointments.length})</span>
              </h4>

              {loading && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconLoader2 size={13} className="animate-spin text-primary" />
                  <span>Loading history...</span>
                </div>
              )}
            </div>

            {loading && appointments.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-muted/10 space-y-2">
                <IconLoader2 size={24} className="animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground">Loading appointment timeline...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-muted/10 space-y-2">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <IconCalendarEvent size={20} />
                </div>
                <p className="text-xs font-semibold text-foreground">No bookings recorded yet</p>
                <p className="text-[11px] text-muted-foreground">
                  Appointments booked by this customer will appear here in chronological order.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2.5 transition-colors hover:border-primary/40"
                  >
                    {/* Top Row: Ref & Status Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-foreground">
                          {app.appointmentNumber}
                        </span>
                        <Badge
                          variant={
                            app.appointmentStatus.toLowerCase() === 'completed'
                              ? 'secondary'
                              : app.appointmentStatus.toLowerCase() === 'confirmed'
                                ? 'default'
                                : app.appointmentStatus.toLowerCase() === 'cancelled'
                                  ? 'destructive'
                                  : 'outline'
                          }
                          className="capitalize text-[10px] font-semibold py-0.5 px-2 rounded-md"
                        >
                          {app.appointmentStatus}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={app.paymentStatus === 'paid' ? 'default' : 'outline'}
                          className="text-[10px] font-semibold py-0.5 px-1.5 rounded-md uppercase"
                        >
                          {app.paymentStatus}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">
                          ${app.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Service & Specialist */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <IconScissors size={14} className="text-primary shrink-0" />
                        <span className="truncate">{app.serviceName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <IconUser size={13} className="shrink-0" />
                        <span>With {app.staffName}</span>
                        <span>•</span>
                        <IconMapPin size={13} className="shrink-0" />
                        <span className="truncate">{app.locationName}</span>
                      </div>
                    </div>

                    {/* Schedule Date & Time */}
                    <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium">
                        <IconCalendar size={13} />
                        <span>{app.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <IconClock size={13} />
                        <span>{app.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
