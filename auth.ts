import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { verifyPassword } from '@/lib/password';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
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
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
