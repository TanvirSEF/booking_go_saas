import type { DefaultSession } from 'next-auth';
import type { Role } from '@/lib/roles';

declare module 'next-auth' {
  interface User {
    id: string;
    role: Role;
    companyId?: string | null;
    activeBusinessId?: string | null;
    activePlanId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      companyId?: string | null;
      activeBusinessId?: string | null;
      activePlanId?: string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    companyId?: string | null;
    activeBusinessId?: string | null;
    activePlanId?: string | null;
  }
}
