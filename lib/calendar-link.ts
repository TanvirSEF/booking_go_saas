export interface CalendarEventDetails {
  title: string;
  description: string;
  location: string;
  dateStr: string; // 'YYYY-MM-DD' or formatted date
  timeSlot: string; // 'HH:mm - HH:mm' or 'HH:mm'
  appointmentNumber?: string;
}

/**
 * Format a Date object into UTC string for calendar URLs / .ics files: YYYYMMDDTHHmmssZ
 */
export function formatUtcDateTime(date: Date): string {
  return date
    .toISOString()
    .replace(/-|:|\.\d+/g, '');
}

/**
 * Parse date string and time slot into start and end Date objects
 */
export function parseAppointmentDateTimes(
  dateStr: string,
  timeSlot: string
): { startDate: Date; endDate: Date } {
  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  let day = new Date().getDate();

  // Try YYYY-MM-DD
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10) - 1;
    day = parseInt(ymdMatch[3], 10);
  } else {
    // Try DD-MM-YYYY
    const dmyMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      month = parseInt(dmyMatch[2], 10) - 1;
      year = parseInt(dmyMatch[3], 10);
    } else {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        year = parsed.getFullYear();
        month = parsed.getMonth();
        day = parsed.getDate();
      }
    }
  }

  // Parse time slot: e.g. "10:00 - 11:00" or "09:30"
  let startHour = 9;
  let startMinute = 0;
  let endHour = 10;
  let endMinute = 0;

  if (timeSlot.includes('-')) {
    const [startPart, endPart] = timeSlot.split('-').map((t) => t.trim());
    const [sh, sm] = startPart.split(':').map(Number);
    const [eh, em] = endPart.split(':').map(Number);

    if (!isNaN(sh)) startHour = sh;
    if (!isNaN(sm)) startMinute = sm;
    if (!isNaN(eh)) endHour = eh;
    if (!isNaN(em)) endMinute = em;
  } else if (timeSlot.includes(':')) {
    const [sh, sm] = timeSlot.trim().split(':').map(Number);
    if (!isNaN(sh)) startHour = sh;
    if (!isNaN(sm)) startMinute = sm;
    endHour = startHour + 1;
    endMinute = startMinute;
  }

  const startDate = new Date(year, month, day, startHour, startMinute, 0);
  const endDate = new Date(year, month, day, endHour, endMinute, 0);

  return { startDate, endDate };
}

/**
 * Generate Google Calendar Add URL
 */
export function getGoogleCalendarUrl(details: CalendarEventDetails): string {
  const { startDate, endDate } = parseAppointmentDateTimes(
    details.dateStr,
    details.timeSlot
  );

  const startUtc = formatUtcDateTime(startDate);
  const endUtc = formatUtcDateTime(endDate);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: details.title,
    dates: `${startUtc}/${endUtc}`,
    details: details.description,
    location: details.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Microsoft Outlook 365 / Web Calendar Add URL
 */
export function getOutlookCalendarUrl(details: CalendarEventDetails): string {
  const { startDate, endDate } = parseAppointmentDateTimes(
    details.dateStr,
    details.timeSlot
  );

  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: details.title,
    startdt: startIso,
    enddt: endIso,
    body: details.description,
    location: details.location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate RFC 5545 .ics Calendar Content String
 */
export function getIcsCalendarString(details: CalendarEventDetails): string {
  const { startDate, endDate } = parseAppointmentDateTimes(
    details.dateStr,
    details.timeSlot
  );

  const startUtc = formatUtcDateTime(startDate);
  const endUtc = formatUtcDateTime(endDate);
  const nowUtc = formatUtcDateTime(new Date());
  const uid = `bookinggo-${details.appointmentNumber || Date.now()}@bookinggo.saas`;

  // Escape special chars for ICS
  const cleanSummary = details.title.replace(/[\\;,]/g, '\\$&');
  const cleanDescription = details.description.replace(/\n/g, '\\n').replace(/[\\;,]/g, '\\$&');
  const cleanLocation = details.location.replace(/[\\;,]/g, '\\$&');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookingGo SaaS//Appointment Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${cleanSummary}`,
    `DESCRIPTION:${cleanDescription}`,
    `LOCATION:${cleanLocation}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Trigger client-side .ics file download for Apple Calendar / Outlook / iCal
 */
export function downloadIcsFile(
  details: CalendarEventDetails,
  fileName = 'appointment.ics'
): void {
  if (typeof window === 'undefined') return;

  const icsContent = getIcsCalendarString(details);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.ics') ? fileName : `${fileName}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
