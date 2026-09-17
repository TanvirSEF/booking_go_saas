import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role;

  if (role === 'super admin') {
    redirect('/super-admin');
  }

  if (role === 'company') {
    redirect('/dashboard');
  }

  if (role === 'staff') {
    redirect('/staff');
  }

  if (role === 'customer') {
    redirect('/customer');
  }

  // Fallback for any other logged-in user
  redirect('/dashboard');
}
