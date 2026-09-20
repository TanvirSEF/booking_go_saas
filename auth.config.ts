import type { NextAuthConfig } from 'next-auth';
import type { UserRole } from '@/models/User';

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as UserRole;
        token.companyId = user.companyId ?? null;
        token.activeBusinessId = user.activeBusinessId ?? null;
        token.activePlanId = user.activePlanId ?? null;
        token.impersonatorAdminId = user.impersonatorAdminId ?? null;
        token.isImpersonating = user.isImpersonating ?? false;
        token.originalAdminName = user.originalAdminName ?? null;
        token.originalAdminEmail = user.originalAdminEmail ?? null;
      }

      if (trigger === 'update' && session) {
        if (session.activeBusinessId !== undefined) {
          token.activeBusinessId = session.activeBusinessId;
        }
        if (session.activePlanId !== undefined) {
          token.activePlanId = session.activePlanId;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.companyId = token.companyId as string | null;
        session.user.activeBusinessId = token.activeBusinessId as string | null;
        session.user.activePlanId = token.activePlanId as string | null;
        session.user.impersonatorAdminId = (token.impersonatorAdminId as string | null) ?? null;
        session.user.isImpersonating = Boolean(token.impersonatorAdminId);
        session.user.originalAdminName = (token.originalAdminName as string | null) ?? null;
        session.user.originalAdminEmail = (token.originalAdminEmail as string | null) ?? null;
      }
      return session;
    },
  },
  providers: [],
};

export default authConfig;
