import { redirect } from 'next/navigation';
import { getSession } from '@/lib/guards';
import { ROLE_HOME, isRole } from '@/lib/roles';

export default async function RootPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role;
  redirect(isRole(role) ? ROLE_HOME[role] : '/unauthorized');
}
