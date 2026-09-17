'use client';

import React, { useState, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core';
import { CalendarFilterBar, type StaffOption, type LocationOption } from './calendar-filter-bar';
import { AppointmentDetailsDrawer } from './appointment-details-drawer';
import { getCalendarAppointments } from '@/actions/appointment-query';
import type { CalendarEvent } from '@/types/appointment-query';
import { IconLoader2 } from '@tabler/icons-react';

interface AppointmentCalendarProps {
  initialEvents: CalendarEvent[];
  staffList: StaffOption[];
  locationList: LocationOption[];
}

export function AppointmentCalendar({
  initialEvents,
  staffList,
  locationList,
}: AppointmentCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedStaffId, setSelectedStaffId] = useState('all');
  const [selectedLocationId, setSelectedLocationId] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Store current active date range viewed by FullCalendar
  const dateRangeRef = useRef<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  const fetchEvents = useCallback(
    async (staffId = selectedStaffId, locId = selectedLocationId) => {
      if (!dateRangeRef.current.start || !dateRangeRef.current.end) return;

      setIsLoading(true);
      try {
        const res = await getCalendarAppointments({
          startDate: dateRangeRef.current.start,
          endDate: dateRangeRef.current.end,
          staffId: staffId !== 'all' ? staffId : undefined,
          locationId: locId !== 'all' ? locId : undefined,
        });

        if (res.success && res.data) {
          setEvents(res.data);
        }
      } catch {
        // Keep existing events on error
      } finally {
        setIsLoading(false);
      }
    },
    [selectedStaffId, selectedLocationId]
  );

  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    fetchEvents(staffId, selectedLocationId);
  };

  const handleLocationChange = (locId: string) => {
    setSelectedLocationId(locId);
    fetchEvents(selectedStaffId, locId);
  };

  const handleRefresh = () => {
    fetchEvents(selectedStaffId, selectedLocationId);
  };

  // FullCalendar callback when the visible range changes or on initial calendar mount
  const handleDatesSet = (dateInfo: DatesSetArg) => {
    const start = dateInfo.startStr.split('T')[0];
    const end = dateInfo.endStr.split('T')[0];

    const isFirstRun = !dateRangeRef.current.start;
    const isDifferentRange =
      start !== dateRangeRef.current.start || end !== dateRangeRef.current.end;

    if (isDifferentRange) {
      dateRangeRef.current = { start, end };
      if (!isFirstRun) {
        fetchEvents(selectedStaffId, selectedLocationId);
      }
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const clickedId = clickInfo.event.id;
    const found = events.find((e) => e.id === clickedId);
    if (found) {
      setSelectedEvent(found);
      setIsDrawerOpen(true);
    }
  };

  const handleStatusUpdated = (appointmentId: string, newStatus: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id === appointmentId) {
          const colorMap: Record<string, string> = {
            Pending: '#21c9b0',
            Confirmed: '#10b981',
            Completed: '#64748b',
            Cancelled: '#ef4444',
          };
          return {
            ...ev,
            borderColor: colorMap[newStatus] || ev.borderColor,
            extendedProps: {
              ...ev.extendedProps,
              status: newStatus,
              statusColor: colorMap[newStatus] || ev.extendedProps.statusColor,
            },
          };
        }
        return ev;
      })
    );

    // Update selected event in drawer too
    setSelectedEvent((prev) =>
      prev && prev.id === appointmentId
        ? {
            ...prev,
            extendedProps: {
              ...prev.extendedProps,
              status: newStatus,
            },
          }
        : prev
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <CalendarFilterBar
        staffList={staffList}
        locationList={locationList}
        selectedStaffId={selectedStaffId}
        selectedLocationId={selectedLocationId}
        onStaffChange={handleStaffChange}
        onLocationChange={handleLocationChange}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Staff Color Legend */}
      {staffList.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card shadow-2xs overflow-x-auto text-xs">
          <span className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider shrink-0">
            Specialist Color Codes:
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            {staffList.map((st) => (
              <div key={st.id} className="flex items-center gap-1.5 shrink-0">
                <span
                  className="size-3 rounded-full border border-black/15 shadow-2xs"
                  style={{ backgroundColor: st.colorCode }}
                />
                <span className="font-medium text-foreground text-[11px]">
                  {st.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar View Container */}
      <div className="relative rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs min-h-[600px]">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-2xs z-20 flex items-center justify-center rounded-2xl">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border shadow-lg text-xs font-semibold text-foreground">
              <IconLoader2 size={16} className="animate-spin text-primary" />
              <span>Updating appointments...</span>
            </div>
          </div>
        )}

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            list: 'Agenda',
          }}
          buttonHints={{
            today: 'Jump to current date',
            month: 'Month overview',
            week: 'Weekly breakdown',
            day: 'Daily schedule',
            list: 'Agenda agenda view',
            prev: 'Previous date range',
            next: 'Next date range',
          }}
          events={events}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          editable={false}
          selectable={false}
          dayMaxEvents={3}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          height="auto"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: 'short',
          }}
        />
      </div>

      {/* Slide-over Inspection & Status Update Drawer */}
      <AppointmentDetailsDrawer
        event={selectedEvent}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
