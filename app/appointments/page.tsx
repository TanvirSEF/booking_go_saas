import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';

export const dynamic = 'force-dynamic';

export default async function AppointmentsIndexPage() {
  await connectToDatabase();

  // Find the primary/default business (e.g. workdo) or first active business
  const business = await Business.findOne({}).select('slug').lean();

  if (business?.slug) {
    redirect(`/appointments/${business.slug}`);
  }

  // Fallback if no business found
  redirect('/appointments/workdo');
}
