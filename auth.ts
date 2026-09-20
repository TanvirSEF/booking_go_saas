import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { verifyPassword } from '@/lib/password';
import { recordLoginAuditAction } from '@/actions/login-detail';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const plainPassword = String(credentials.password);

        await connectToDatabase();

        const user = await User.findOne({ email });
        if (!user || !user.password) {
          return null;
        }

        if (user.isActive === false) {
          return null;
        }

        const isMatch = await verifyPassword(plainPassword, user.password);
        if (!isMatch) {
          return null;
        }

        let activeBusinessId = user.activeBusinessId ? String(user.activeBusinessId) : null;

        if (user.role === 'company' && !activeBusinessId) {
          const defaultBusiness = await Business.findOne({ companyId: user._id })
            .select('_id')
            .lean();

          if (defaultBusiness) {
            activeBusinessId = String(defaultBusiness._id);
            user.activeBusinessId = defaultBusiness._id;
            await user.save();
          }
        }

        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId ? String(user.companyId) : null,
          activeBusinessId,
          activePlanId: user.activePlanId ? String(user.activePlanId) : null,
          image: user.avatar || null,
        };
      },
    }),
    Credentials({
      id: 'impersonate',
      name: 'impersonate',
      credentials: {
        ticket: { label: 'Ticket', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.ticket) {
          return null;
        }

        const ticket = String(credentials.ticket);
        const { verifyImpersonationTicket } = await import('@/lib/impersonation');
        const payload = verifyImpersonationTicket(ticket);
        if (!payload) {
          return null;
        }

        await connectToDatabase();

        // 1. Verify admin user still exists and is super admin
        const adminUser = await User.findById(payload.adminId);
        if (!adminUser || adminUser.role !== 'super admin' || adminUser.isActive === false) {
          return null;
        }

        // 2. If restore ticket, log back in as the original super admin
        if (payload.isRestore) {
          return {
            id: String(adminUser._id),
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role,
            companyId: null,
            activeBusinessId: null,
            activePlanId: null,
            image: adminUser.avatar || null,
            impersonatorAdminId: null,
            isImpersonating: false,
            originalAdminName: null,
            originalAdminEmail: null,
          };
        }

        // 3. Otherwise, log in as target company user
        const targetUser = await User.findById(payload.targetUserId);
        if (!targetUser || targetUser.role !== 'company' || targetUser.isActive === false) {
          return null;
        }

        let activeBusinessId = targetUser.activeBusinessId ? String(targetUser.activeBusinessId) : null;
        if (!activeBusinessId) {
          const defaultBusiness = await Business.findOne({ companyId: targetUser._id })
            .select('_id')
            .lean();
          if (defaultBusiness) {
            activeBusinessId = String(defaultBusiness._id);
            targetUser.activeBusinessId = defaultBusiness._id;
            await targetUser.save();
          }
        }

        return {
          id: String(targetUser._id),
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          companyId: targetUser.companyId ? String(targetUser.companyId) : null,
          activeBusinessId,
          activePlanId: targetUser.activePlanId ? String(targetUser.activePlanId) : null,
          image: targetUser.avatar || null,
          impersonatorAdminId: String(adminUser._id),
          isImpersonating: true,
          originalAdminName: adminUser.name,
          originalAdminEmail: adminUser.email,
        };
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      try {
        if (!user?.id) return;
        const { headers } = await import('next/headers');
        const headersList = await headers();
        const forwarded = headersList.get('x-forwarded-for');
        const realIp = headersList.get('x-real-ip');
        const ip = forwarded ? forwarded.split(',')[0].trim() : (realIp || '127.0.0.1');
        const userAgent = headersList.get('user-agent') || '';

        await recordLoginAuditAction({
          userId: user.id,
          role: user.role || 'customer',
          companyId: user.companyId || undefined,
          businessId: user.activeBusinessId || undefined,
          ip,
          userAgent,
          status: 'success',
        });
      } catch (err) {
        // Non-blocking: ensure login experience is never degraded
        console.error('Failed to record login audit during signIn event:', err);
      }
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
