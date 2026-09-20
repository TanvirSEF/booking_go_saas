import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { auth } from '@/auth';
import { ROLE_HOME, isRole, type Role } from '@/lib/roles';

export type AppSession = Session & {
  user: NonNullable<Session['user']>;
};

// One auth() call per request, cached across parallel server components
export const getSession = cache(async () => {
  const session = await auth();
  return session as Session | null;
});

/** For layouts and pages: redirects unauthenticated or unauthorized users */
export async function requireRole(
  allowed: readonly Role[],
  callbackUrl?: string
): Promise<AppSession> {
  const session = await getSession();

  if (!session?.user) {
    redirect(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login');
  }

  // WorkDo parity: block disabled or suspended user accounts
  if (session.user.isEnableLogin === false) {
    redirect('/login?error=AccountDisabled');
  }

  const role = session.user.role;
  if (!isRole(role)) {
    redirect('/unauthorized');
  }
  if (!allowed.includes(role)) {
    redirect(ROLE_HOME[role]);
  }

  return session as AppSession;
}

/** For server actions: throws an error instead of redirecting */
export async function assertRole(allowed: readonly Role[]): Promise<AppSession> {
  const session = await getSession();
  const role = session?.user?.role;
  if (!session?.user || !isRole(role) || !allowed.includes(role)) {
    throw new Error('Forbidden');
  }
  if (session.user.isEnableLogin === false) {
    throw new Error('Account disabled or suspended');
  }
  return session as AppSession;
}

export { verifyUserActiveStatus } from '@/lib/user-suspension';

/** For route handlers: returns 401/403 JSON responses */
export function withRoleRoute<Ctx>(
  allowed: readonly Role[],
  handler: (req: Request, ctx: Ctx, session: AppSession) => Promise<Response>
) {
  return async (req: Request, ctx: Ctx) => {
    const session = await getSession();
    const role = session?.user?.role;
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isRole(role) || !allowed.includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    return handler(req, ctx, session as AppSession);
  };
}
