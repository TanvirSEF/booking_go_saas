import React from 'react';
import { requireRole, type AppSession } from '@/lib/guards';
import type { Role } from '@/lib/roles';

export function withRole(allowed: readonly Role[], callbackUrl?: string) {
  return function <P extends object>(
    Component: React.ComponentType<P & { session: AppSession }>
  ) {
    return async function Guarded(props: P) {
      const session = await requireRole(allowed, callbackUrl);
      return <Component {...props} session={session} />;
    };
  };
}
