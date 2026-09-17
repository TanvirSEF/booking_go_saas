import { redirect } from 'next/navigation';

export default function AppointmentsIndexPage() {
  redirect('/dashboard/appointments/calendar');
}
