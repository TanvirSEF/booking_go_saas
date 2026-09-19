import Link from 'next/link';
import { IconShieldLock, IconArrowLeft, IconLogout } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/guards';
import { ROLE_HOME, isRole } from '@/lib/roles';

export const metadata = {
  title: 'Access Denied | Booking Go',
};

export default async function UnauthorizedPage() {
  const session = await getSession();
  const role = session?.user?.role;
  const homePath = isRole(role) ? ROLE_HOME[role] : '/login';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-xs">
          <IconShieldLock size={36} stroke={1.8} />
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to access the requested resource with your current account privileges.
        </p>

        {session?.user && (
          <div className="mt-4 rounded-lg border border-border bg-card/60 px-3.5 py-2 text-xs text-muted-foreground">
            Signed in as <strong className="font-semibold text-foreground">{session.user.email}</strong>{' '}
            (role: <span className="font-mono text-primary">{role || 'unknown'}</span>)
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="default" className="gap-2">
            <Link href={homePath}>
              <IconArrowLeft size={16} />
              Return to Dashboard
            </Link>
          </Button>

          <Button asChild variant="outline" className="gap-2">
            <Link href="/login">
              <IconLogout size={16} />
              Switch Account
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
